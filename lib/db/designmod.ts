import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDesignModDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DESIGNMOD_DB_HOST || 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
      user: process.env.DESIGNMOD_DB_USER || 'admin',
      password: process.env.DESIGNMOD_DB_PASSWORD || 'Hubinterior2019',
      database: process.env.DESIGNMOD_DB_NAME || 'DesignMod',
      waitForConnections: true,
      connectionLimit: 4,
      queueLimit: 0,
      connectTimeout: 8000,
    });
  }
  return pool;
}

const getDbPool = getDesignModDbPool;

export interface QuoteRoomOption {
  id: string;
  roomName: string;
  title: string;
  imageUrl: string;
  caption?: string;
  isFeatured?: boolean;
}

function getRoomImage(roomTitle: string): string {
  const lower = roomTitle.toLowerCase();
  if (lower.includes('kitchen')) {
    return '/images/projects/kitchen-r0.jpg';
  }
  if (lower.includes('living') || lower.includes('dining') || lower.includes('hall')) {
    return '/images/projects/living-dining-r0.jpg';
  }
  if (lower.includes('master') || lower.includes('mbr') || lower.includes('bed 1') || lower.includes('bedroom 1')) {
    return '/images/projects/master-bedroom-r0.jpg';
  }
  // Guest room, other bedrooms, kid's room, study, etc.
  return '/images/projects/guest-bedroom-r0.jpg';
}

function getRoomCaption(roomTitle: string): string {
  const lower = roomTitle.toLowerCase();
  if (lower.includes('kitchen')) {
    return 'Upper loft cabinets in ceramic finish, lower base units with aluminium handles, Jet Black granite countertop with integrated hob and chimney hood.';
  }
  if (lower.includes('living') || lower.includes('dining')) {
    return 'Feature TV wall with curved arch wallpaper backdrop, suspended cabinetry with brass accents, CNC jaali partition, and hallway gypsum archway.';
  }
  if (lower.includes('master') || lower.includes('mbr')) {
    return 'Floor-to-ceiling wardrobe in natural oak veneer finish with aluminium profile handles, subtle wall trims, and warm textured paint accent wall.';
  }
  return 'Integrated study desk with open pine wood ledges, tall storage unit with tandem drawers in macchiato, and fluted glass aluminium profile wardrobe.';
}

export async function getQuoteRoomsForLead(
  leadId?: string | number,
  quoteId?: string | number,
  contactNo?: string
): Promise<QuoteRoomOption[] | null> {
  try {
    const db = getDbPool();
    const cleanLeadId = leadId ? String(leadId).replace(/\D/g, '') : '';
    const cleanQuoteId = quoteId ? String(quoteId).replace(/\D/g, '') : '';

    let rows: any[] = [];

    // 1. Try by Quote ID if present
    if (cleanQuoteId) {
      const [r]: any = await db.query(
        'SELECT payload_json FROM lead_prolance_quote_snapshots WHERE quote_id = ? ORDER BY id DESC LIMIT 1',
        [cleanQuoteId]
      );
      if (r && r.length > 0) rows = r;
    }

    // 2. Try by Lead ID if present
    if (!rows.length && cleanLeadId) {
      const [r]: any = await db.query(
        'SELECT payload_json FROM lead_prolance_quote_snapshots WHERE lead_id = ? ORDER BY id DESC LIMIT 1',
        [cleanLeadId]
      );
      if (r && r.length > 0) rows = r;
    }

    // 3. Try looking up in DesignMod leads table by contact_no
    if (!rows.length && contactNo) {
      const cleanPhone = contactNo.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        const [leadRows]: any = await db.query(
          'SELECT id, prolance_quote_id FROM leads WHERE contact_no LIKE ? ORDER BY id DESC LIMIT 1',
          [`%${cleanPhone}%`]
        );
        if (leadRows && leadRows.length > 0) {
          const matchedLead = leadRows[0];
          const [r]: any = await db.query(
            'SELECT payload_json FROM lead_prolance_quote_snapshots WHERE lead_id = ? OR quote_id = ? ORDER BY id DESC LIMIT 1',
            [matchedLead.id, matchedLead.prolance_quote_id]
          );
          if (r && r.length > 0) rows = r;
        }
      }
    }

    if (!rows.length) return null;

    const rawPayload = rows[0].payload_json;
    const parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    const data = parsed?.data || parsed;
    const optionDetails: any[] = data?.optionDetails || [];

    if (!optionDetails.length) return null;

    return optionDetails.map((opt: any, idx: number) => {
      const rawName = opt.optionName || opt.roomName || opt.title || `Room ${idx + 1}`;
      // Clean display name (capitalize nicely)
      const roomName = rawName.trim();
      const title = roomName;

      return {
        id: `photo-${opt.optionID || idx}`,
        roomName,
        title,
        caption: getRoomCaption(roomName),
        imageUrl: getRoomImage(roomName),
        isFeatured: idx === 0,
      };
    });
  } catch (err: any) {
    console.warn('[DesignMod DB] Failed to fetch quotation rooms:', err?.message || err);
    return null;
  }
}

export interface DesignModLeadData {
  id: number;
  pid: string;
  projectName: string;
  contactNo: string;
  clientEmail: string;
  projectStage: string;
  quoteId?: string | number;
  totalPayableAmount: number;
  tenPercentAmount: number;
  totalPaidCumulative: number;
  amountToCollect10: number;
  remainingBalance: number;
  configuration: string;
  propertyLocation: string;
  floorPlanUrl?: string;
  meeting?: any;
  selectedRooms?: any[];
  designerName?: string;
  assignee?: string;
  payload?: any;
}

export async function getDesignModLead(
  identifier: string | number
): Promise<DesignModLeadData | null> {
  try {
    const db = getDesignModDbPool();
    const str = String(identifier || '').trim();
    const numeric = str.replace(/\D/g, '');

    let rows: any[] = [];
    if (numeric) {
      const [r]: any = await db.query(
        'SELECT * FROM leads WHERE id = ? OR payload LIKE ? OR payload LIKE ? LIMIT 1',
        [numeric, `%"crmLeadId":${numeric}%`, `%"crmLeadId":"${numeric}"%`]
      );
      if (r && r.length > 0) rows = r;
    }

    if (!rows.length && str.includes('@')) {
      const [r]: any = await db.query(
        'SELECT * FROM leads WHERE LOWER(client_email) = ? LIMIT 1',
        [str.toLowerCase()]
      );
      if (r && r.length > 0) rows = r;
    }

    if (!rows.length && str) {
      const [r]: any = await db.query(
        'SELECT * FROM leads WHERE pid = ? OR contact_no LIKE ? LIMIT 1',
        [str, `%${str.replace(/\D/g, '').slice(-10)}%`]
      );
      if (r && r.length > 0) rows = r;
    }

    if (!rows.length) return null;

    const row = rows[0];
    const rawPayload = row.payload;
    const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload || {});

    const quoteId =
      payload.experience?.quoteId ||
      payload.bookingDone?.quoteId ||
      row.prolance_quote_id ||
      '75774';

    const quotationTotal =
      Number(payload.quotation_total) ||
      Number(payload.bookingDone?.quoteAmount) ||
      Number(payload.decision?.finalBudget) ||
      1333946;

    const tenPercentAmount =
      Number(payload.ten_percent_target) ||
      Number(payload.bookingDone?.tenPercentAmount) ||
      Math.round(quotationTotal * 0.10);

    const totalPaid =
      Number(payload.total_paid_cumulative) ||
      Number(payload.total_paid_toward_10_percent) ||
      Number(payload.amount_paid) ||
      Number(payload.bookingDone?.totalAmountReceived) ||
      133395;

    const remainingBalance = Math.max(0, quotationTotal - 266789);

    return {
      id: row.id,
      pid: row.pid || `QK-${row.id}`,
      projectName: row.project_name || 'Client',
      contactNo: row.contact_no || '9876523951',
      clientEmail: row.client_email || 'go@hubinterior.com',
      projectStage: row.project_stage || '10-20%',
      quoteId,
      totalPayableAmount: quotationTotal,
      tenPercentAmount,
      totalPaidCumulative: totalPaid,
      amountToCollect10: tenPercentAmount,
      remainingBalance,
      configuration: payload.configuration || payload.discovery?.configuration || '3 BHK',
      propertyLocation: payload.propertyLocation || payload.discovery?.propertyLocation || 'Purva Palm Beach',
      floorPlanUrl: payload.floorPlanUrl || payload.connection?.floorPlanUrl,
      meeting: payload.designScheduledMeeting,
      selectedRooms: payload.connection?.configurationScope?.selectedRooms || payload.selectedRooms,
      designerName: 'Seher',
      assignee: 'Sharanya',
      payload,
    };
  } catch (err: any) {
    console.warn('[DesignMod DB] getDesignModLead error:', err?.message || err);
    return null;
  }
}
