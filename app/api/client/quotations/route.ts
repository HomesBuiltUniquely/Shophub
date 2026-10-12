import { NextRequest, NextResponse } from 'next/server';
import {
  QuotationsPageData,
  ActiveQuoteDetail,
  QuotationSummaryItem,
  QuoteRoomSection,
  QuoteRoomItem,
  QuotationRevisionComparison,
} from '@/lib/client/types';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

function getDbPool() {
  return mysql.createPool({
    host: process.env.DESIGNMOD_DB_HOST || 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
    user: process.env.DESIGNMOD_DB_USER || 'admin',
    password: process.env.DESIGNMOD_DB_PASSWORD || 'Hubinterior2019',
    database: process.env.DESIGNMOD_DB_NAME || 'DesignMod',
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    connectTimeout: 6000,
  });
}

/**
 * Resolve DB lead ID from client ID parameter (handles CRM lead ID, DB ID, or snapshot lead ID)
 */
async function resolveLeadDbId(pool: mysql.Pool, leadIdParam: string): Promise<number | null> {
  const clean = String(leadIdParam || '').trim();
  const numeric = clean.replace(/\D/g, '');
  if (!numeric) return null;

  try {
    // 1. Check if numeric matches leads.id or CRM lead ID in payload
    const [rows]: any = await pool.query(
      'SELECT id FROM leads WHERE id = ? OR payload LIKE ? OR payload LIKE ? LIMIT 1',
      [numeric, `%"crmLeadId":${numeric}%`, `%"crmLeadId":"${numeric}"%`]
    );
    if (rows && rows.length > 0) {
      return rows[0].id;
    }

    // 2. Check if numeric directly matches lead_id in snapshots
    const [snapRows]: any = await pool.query(
      'SELECT lead_id FROM lead_prolance_quote_snapshots WHERE lead_id = ? LIMIT 1',
      [numeric]
    );
    if (snapRows && snapRows.length > 0) {
      return snapRows[0].lead_id;
    }

    return parseInt(numeric, 10) || null;
  } catch (err) {
    console.warn('[Quotations API] resolveLeadDbId error:', err);
    return parseInt(numeric, 10) || null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteParam = searchParams.get('quoteNum') || searchParams.get('quoteId') || '';
    const leadId = searchParams.get('leadId') || process.env.NEXT_PUBLIC_DEFAULT_CLIENT_LEAD_ID || '1691';

    const pool = getDbPool();
    const dbLeadId = await resolveLeadDbId(pool, leadId);

    if (!dbLeadId) {
      return NextResponse.json({
        success: false,
        error: 'Client record not found',
      }, { status: 404 });
    }

    // 1. Fetch Lead record metadata to determine approval / payment status
    let isLeadApproved = false;
    let leadQuoteLink = '';
    try {
      const [leadRows]: any = await pool.query(
        'SELECT id, project_name, payload FROM leads WHERE id = ? LIMIT 1',
        [dbLeadId]
      );
      if (leadRows && leadRows.length > 0) {
        const rawPayload = leadRows[0].payload;
        const p = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload || {});
        isLeadApproved = Boolean(
          p.ten_percent_payment_met ||
          p.bookingDone ||
          p.design_ten_percent_payment_met ||
          p.decision === 'Approved'
        );
        leadQuoteLink = p.quoteLink || p.quoteSentInfo?.quoteLink || '';
      }
    } catch (e) {
      console.warn('[Quotations API] Failed to fetch lead payload:', e);
    }

    // 2. Fetch all quote snapshots for this lead ordered chronologically (id ASC)
    const [snapshots]: any = await pool.query(
      'SELECT id, lead_id, quote_id, payload_json, created_at FROM lead_prolance_quote_snapshots WHERE lead_id = ? ORDER BY id ASC',
      [dbLeadId]
    );

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recentQuotations: [],
          activeQuote: null,
          isLiveBackend: true,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // 3. Process each snapshot dynamically
    const parsedSnapshots = snapshots.map((row: any, idx: number) => {
      const raw = row.payload_json;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const data = parsed?.data || parsed || {};

      const quoteNumber = data.quoteNum || `Q-${data.quoteID || row.quote_id || row.id}`;
      const totalAmount = Number(data.finalTotalPrice) || Number(data.totalPrice) || 0;

      const dateObj = row.created_at
        ? new Date(row.created_at)
        : data.createdOn
        ? new Date(data.createdOn)
        : new Date();
      const dateIssued = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Revision calculation:
      // If only 1 snapshot exists in the DB for this client, it is v1.0
      // If multiple snapshots exist, derive from quoteNum suffix (-001, -002, etc.) or sequence index
      const quoteNumMatch = quoteNumber.match(/-0*(\d+)$/);
      const revNumber = quoteNumMatch ? parseInt(quoteNumMatch[1], 10) : (idx + 1);
      const revision = snapshots.length === 1 ? 'v1.0' : `v${revNumber}.0`;

      const isLatest = idx === snapshots.length - 1;
      let status: 'Approved' | 'Pending Approval' | 'Superseded' | 'Expired' = 'Superseded';
      if (isLatest) {
        status = isLeadApproved ? 'Approved' : 'Pending Approval';
      }

      const rowQuoteId = data.quoteID || row.quote_id || row.id || '70877';
      const itemQuoteUrl = data.quoteLink || data.quoteUrl || `https://design.hubinterior.com/quote/${rowQuoteId}`;
      const itemPdfUrl = data.pdfUrl || leadQuoteLink || itemQuoteUrl;

      const summaryItem: QuotationSummaryItem = {
        id: `quote-${data.quoteID || row.quote_id || row.id}`,
        quoteNumber,
        dateIssued,
        revision,
        status,
        totalAmount,
        totalAmountFormatted: `₹${totalAmount.toLocaleString('en-IN')}`,
        isLatest,
        quoteUrl: itemQuoteUrl,
        pdfUrl: itemPdfUrl,
      };

      return {
        row,
        data,
        idx,
        summary: summaryItem,
      };
    });

    // Recent quotations table listed in reverse chronological order (newest first)
    const recentQuotations: QuotationSummaryItem[] = parsedSnapshots
      .slice()
      .reverse()
      .map((p: any) => p.summary);

    // 4. Select the active snapshot: either matching requested quoteParam or defaulting to latest
    let activeItem = parsedSnapshots[parsedSnapshots.length - 1];
    if (quoteParam) {
      const cleanParam = quoteParam.trim().toLowerCase();
      const matched = parsedSnapshots.find(
        (p: any) =>
          p.summary.quoteNumber.toLowerCase() === cleanParam ||
          String(p.data.quoteID) === cleanParam ||
          String(p.row.quote_id) === cleanParam
      );
      if (matched) {
        activeItem = matched;
      }
    }

    // 5. Extract room breakdown and items for the active quote
    const activeData = activeItem.data;
    const activeRow = activeItem.row;
    const activeSummary = activeItem.summary;

    const quoteOptionsData = activeData.quoteOptionsData || {};
    const optionDetails = Array.isArray(activeData.optionDetails) ? activeData.optionDetails : [];

    const activeRooms: QuoteRoomSection[] = optionDetails.map((opt: any, idx: number) => {
      const rawName = opt.optionName || opt.roomName || `Room ${idx + 1}`;
      const cleanRoomName = rawName.replace(/\s*-\s*\[.*?\]$/, '').trim();
      const roomPrice = Number(opt.totalPrice) || 0;
      const qData = quoteOptionsData[String(idx)];

      const items: QuoteRoomItem[] = [];

      // Add lofts
      if (qData && qData.lofts && Array.isArray(qData.lofts)) {
        qData.lofts.forEach((l: any, lIdx: number) => {
          items.push({
            id: `loft-${l.itemID || lIdx}`,
            name: `${l.description || 'Frame Loft'}${l.dimensions ? ` (${l.dimensions})` : ''}`,
            price: Number(l.price) || 0,
            priceFormatted: `₹${Number(l.price || 0).toLocaleString('en-IN')}`,
            category: l.carcass?.coreMatl || 'Loft & Storage',
          });
        });
      }

      // Add units
      if (qData && qData.units && Array.isArray(qData.units)) {
        const sortedUnits = [...qData.units].sort(
          (a: any, b: any) => (Number(b.price) || 0) - (Number(a.price) || 0)
        );
        sortedUnits.forEach((u: any, uIdx: number) => {
          items.push({
            id: `unit-${u.itemID || uIdx}`,
            name: `${u.description || u.label || 'Cabinet Unit'}${u.dimensions ? ` (${u.dimensions})` : ''}`,
            price: Number(u.price) || 0,
            priceFormatted: `₹${Number(u.price || 0).toLocaleString('en-IN')}`,
            category: u.cabinetClass || 'Modular Cabinetry',
          });
        });
      }

      // Determine room icon
      let icon: 'living' | 'kitchen' | 'bedroom' | 'dining' | 'other' = 'other';
      const lower = cleanRoomName.toLowerCase();
      if (lower.includes('living') || lower.includes('dining')) icon = 'living';
      else if (lower.includes('kitchen')) icon = 'kitchen';
      else if (lower.includes('bed')) icon = 'bedroom';

      return {
        id: `room-${idx}`,
        roomName: cleanRoomName,
        icon,
        totalAmount: roomPrice,
        totalAmountFormatted: `₹${roomPrice.toLocaleString('en-IN')}`,
        defaultExpanded: idx < 2,
        items: items.slice(0, 4),
      };
    });

    // Calculate Financial Summary
    const liveFinalTotal = activeSummary.totalAmount;
    const liveSubtotal = Math.round(liveFinalTotal / 1.09);
    const liveTax = liveFinalTotal - liveSubtotal;
    const discountAmount = Number(activeData.totalDiscountValue) || 0;

    // Calculate Revision Comparison
    let revisionComparison: QuotationRevisionComparison;
    if (parsedSnapshots.length <= 1) {
      // Single version in database: no previous revision exists
      revisionComparison = {
        comparedWith: 'None',
        priceVariance: 0,
        priceVarianceFormatted: '₹0',
        isIncrease: false,
        keyChanges: [],
      };
    } else {
      // Multi-version client: compare with the immediate previous snapshot
      const activeIdx = activeItem.idx;
      const prevItem = activeIdx > 0 ? parsedSnapshots[activeIdx - 1] : parsedSnapshots[0];
      const variance = liveFinalTotal - prevItem.summary.totalAmount;
      const isIncrease = variance >= 0;

      // Identify key additions / modifications between active and previous snapshot
      const keyChanges: Array<{ id: string; type: 'add' | 'remove' | 'upgrade'; title: string; subtitle: string }> = [];
      const prevOptionDetails = Array.isArray(prevItem.data.optionDetails) ? prevItem.data.optionDetails : [];

      activeRooms.forEach((currRoom, rIdx) => {
        const prevRoomOpt = prevOptionDetails[rIdx];
        if (!prevRoomOpt) {
          keyChanges.push({
            id: `kc-${currRoom.id}`,
            type: 'add',
            title: currRoom.roomName,
            subtitle: `New room specification added (${currRoom.totalAmountFormatted})`,
          });
        } else {
          const diff = currRoom.totalAmount - (Number(prevRoomOpt.totalPrice) || 0);
          if (diff > 5000) {
            keyChanges.push({
              id: `kc-${currRoom.id}-diff`,
              type: 'upgrade',
              title: `${currRoom.roomName} Enhancement`,
              subtitle: `Upgraded cabinetry and storage (+₹${Math.abs(diff).toLocaleString('en-IN')})`,
            });
          }
        }
      });

      if (keyChanges.length === 0) {
        keyChanges.push({
          id: 'kc-general',
          type: isIncrease ? 'upgrade' : 'remove',
          title: `${activeSummary.revision} Scope Adjustment`,
          subtitle: `Updated specifications and pricing from ${prevItem.summary.revision}`,
        });
      }

      revisionComparison = {
        comparedWith: prevItem.summary.revision,
        priceVariance: Math.abs(variance),
        priceVarianceFormatted: `${isIncrease ? '+' : '-'}₹${Math.abs(variance).toLocaleString('en-IN')}`,
        isIncrease,
        keyChanges: keyChanges.slice(0, 3),
      };
    }

    const quoteId = activeData.quoteID || activeRow.quote_id || '70877';
    const quoteUrl = `https://design.hubinterior.com/quote/${quoteId}`;
    const pdfUrl = leadQuoteLink || quoteUrl;

    const activeQuote: ActiveQuoteDetail = {
      id: activeSummary.id,
      quoteNumber: activeSummary.quoteNumber,
      revision: activeSummary.revision,
      revisionLabel: `${activeSummary.quoteNumber} • Revision ${activeSummary.revision} (${activeSummary.status === 'Approved' ? 'Final Sign-off' : 'Under Review'})`,
      status: activeSummary.status,
      validUntil: 'Oct 30, 2026',
      validityNote:
        activeSummary.status === 'Approved'
          ? 'Prices verified and locked for factory production.'
          : 'Quotation estimate valid for 30 days.',
      pdfUrl,
      quoteUrl,
      rooms: activeRooms,
      financialSummary: {
        subtotal: liveSubtotal,
        subtotalFormatted: `₹${liveSubtotal.toLocaleString('en-IN')}`,
        taxPercent: 9,
        taxAmount: liveTax,
        taxAmountFormatted: `₹${liveTax.toLocaleString('en-IN')}`,
        totalAmount: liveFinalTotal,
        totalAmountFormatted: `₹${liveFinalTotal.toLocaleString('en-IN')}`,
        note:
          discountAmount > 0
            ? `Includes all factory woodwork, fittings, labor, and GST (Special ₹${Math.round(discountAmount).toLocaleString('en-IN')} discount applied).`
            : 'Includes all factory woodwork, fittings, labor, and GST.',
      },
      revisionComparison,
    };

    return NextResponse.json({
      success: true,
      data: {
        recentQuotations,
        activeQuote,
        isLiveBackend: true,
        lastUpdated: new Date().toISOString(),
      } as QuotationsPageData,
    });
  } catch (error: any) {
    console.error('[Quotations API] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve quotation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, quoteNumber, notes, roomName } = body;

    if (!quoteNumber) {
      return NextResponse.json(
        { success: false, error: 'quoteNumber is required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      return NextResponse.json({
        success: true,
        message: `Quote ${quoteNumber} approved successfully!`,
        approvedAt: new Date().toISOString(),
        status: 'Approved',
      });
    }

    if (action === 'request-changes') {
      return NextResponse.json({
        success: true,
        message: `Revision request for ${quoteNumber} submitted to your Lead Designer!`,
        roomTargeted: roomName || 'General',
        submittedNotes: notes || '',
        status: 'Revision Requested',
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Quotations API] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
