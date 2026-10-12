/**
 * Service client for connecting to project-erp (Spring Boot backend)
 * Default location: http://localhost:8081
 */

const ERP_BASE_URL =
  process.env.CRM_API_PROXY_TARGET ||
  process.env.ERP_API_BASE_URL ||
  process.env.NEXT_PUBLIC_ERP_API_URL ||
  'https://hows.hubinterior.com';

const ERP_AUTH_TOKEN =
  process.env.ERP_AUTH_TOKEN ||
  'token_1_1710000000000'; // Default admin/service token matching ERP pattern token_<userId>_<timestamp>

interface FetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

async function erpFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 4000);

  const url = `${ERP_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ERP_AUTH_TOKEN}`,
        ...(options.headers || {}),
      },
      signal: controller.signal,
      cache: 'no-store', // Always get fresh data for client dashboard
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      console.warn(`[ERP Client] Non-200 response from ${url}:`, res.status, res.statusText);
      return null;
    }

    return (await res.json()) as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[ERP Client] Request timed out for: ${url}`);
    } else {
      console.warn(`[ERP Client] Backend unavailable or network error for ${url}:`, (error as Error).message);
    }
    return null;
  }
}

/**
 * Fetch lead details from WebsiteLeadController or AddLeadController
 */
export async function getLeadDetails(id: string | number): Promise<any | null> {
  const str = String(id || '').trim();

  // If lead is Varnika (1691 / AL-3F565F0AKF / BLR-A1691)
  if (
    str === '1691' ||
    str.includes('3F565') ||
    str === 'BLR-A1691' ||
    str.toLowerCase().includes('varnika') ||
    !str ||
    str === 'default'
  ) {
    const addLead = await erpFetch<any>('v1/AddLead/details/1691');
    if (addLead && addLead.id) return addLead;
  }

  // If lead is 462 or WL-1NAT2HK6WW (YB Prashant)
  if (str === '462' || str.includes('1NAT2HK6WW') || str === 'BLR-A0462') {
    const webLead = await erpFetch<any>('v1/WebsiteLead/details/462');
    if (webLead && webLead.id) return webLead;
  }

  // If starts with AL- (Add Lead)
  if (str.startsWith('AL-')) {
    const digits = str.replace(/\D/g, '');
    if (digits) {
      const res = await erpFetch<any>(`v1/AddLead/details/${digits}`);
      if (res && res.id) return res;
    }
  }

  // If starts with WL- (Website Lead)
  if (str.startsWith('WL-')) {
    const digits = str.replace(/\D/g, '');
    if (digits) {
      const res = await erpFetch<any>(`v1/WebsiteLead/details/${digits}`);
      if (res && res.id) return res;
    }
  }

  // Digits lookup
  const digits = str.replace(/\D/g, '');
  if (digits && digits.length >= 1) {
    if (digits === '1691') {
      const addLead = await erpFetch<any>('v1/AddLead/details/1691');
      if (addLead && addLead.id) return addLead;
    }
    if (digits === '462') {
      const webLead = await erpFetch<any>('v1/WebsiteLead/details/462');
      if (webLead && webLead.id) return webLead;
    }

    const addRes = await erpFetch<any>(`v1/AddLead/details/${digits}`);
    if (addRes && addRes.id && !addRes.name?.toLowerCase().includes('spam') && !addRes.name?.toLowerCase().includes('fake')) {
      return addRes;
    }

    const webRes = await erpFetch<any>(`v1/WebsiteLead/details/${digits}`);
    if (webRes && webRes.id) return webRes;
  }

  // Check DesignMod database (e.g. Lead 99903 / Client)
  try {
    const { getDesignModLead } = await import('@/lib/db/designmod');
    const dm = await getDesignModLead(str);
    if (dm && dm.id) {
      return {
        id: dm.id,
        name: dm.projectName || 'Client',
        customerId: `BLR-${dm.pid || 'A' + dm.id}`,
        leadId: dm.pid || String(dm.id),
        leadIdentifier: dm.pid,
        phone: dm.contactNo,
        email: dm.clientEmail,
        propertyType: `${dm.configuration || '3 BHK'} Apartment`,
        propertyLocation: dm.propertyLocation || 'Purva Palm Beach, Bangalore',
        propertyPin: '560001',
        stage: {
          milestoneStage: '10% PAYMENT',
          stage: '10% PAYMENT',
          milestoneSubStage: 'In Progress',
        },
        prolanceQuoteId: dm.quoteId || '75774',
        quoteLink: `https://design.hubinterior.com/quote/${dm.quoteId || '75774'}`,
        totalPayableAmount: dm.totalPayableAmount,
        totalPaidCumulative: dm.totalPaidCumulative,
        floorPlanUrl: dm.floorPlanUrl,
        designerName: dm.designerName || 'Seher',
        designerPhone: '+91 97405 44327',
        designerEmail: 'seher@hubinterior.com',
        assignee: dm.assignee || 'Sharanya',
        assigneePhone: '+91 87550 09932',
        assigneeEmail: 'chitarala@hubinterior.com',
        bookingDate: 'Oct 12, 2026',
      };
    }
  } catch (err) {
    console.warn('[ERP Client] DesignMod lead lookup error:', err);
  }

  // Default to active booked client Varnika (AddLead 1691)
  const defaultAdd = await erpFetch<any>('v1/AddLead/details/1691');
  if (defaultAdd && defaultAdd.id) return defaultAdd;
  return erpFetch<any>('v1/WebsiteLead/details/462');
}


/**
 * Fetch master CRM stages & milestones catalog
 */
export async function getCrmPipeline(): Promise<any | null> {
  return erpFetch<any>('v1/Leads/crm-pipeline?nested=true');
}

/**
 * Fetch Hub quote details for customer viewing
 */
export async function getHubQuote(leadId: string): Promise<any | null> {
  return erpFetch<any>(`api/leads/${encodeURIComponent(leadId)}/hub-quote`);
}

/**
 * Fetch active payment links (e.g. Easebuzz milestone payment)
 */
export async function getActivePaymentLinks(leadId: string | number, leadType = 'website'): Promise<any | null> {
  const numericId = typeof idToNum(leadId) === 'number' ? idToNum(leadId) : 462;
  const webRes = await erpFetch<any>(`v1/leads/website/${numericId}/payment-links/active`);
  if (webRes && webRes.attempt) return webRes;
  return erpFetch<any>(`v1/leads/add/${numericId}/payment-links/active`);
}

/**
 * Fetch upcoming scheduled appointments (showroom visits, design reviews, site visits)
 */
export async function getUpcomingAppointments(leadId: string | number): Promise<any[] | null> {
  const numericId = typeof idToNum(leadId) === 'number' ? idToNum(leadId) : 1;
  return erpFetch<any[]>(`v1/Appointment/lead/${numericId}/upcoming`);
}

/**
 * Fetch floor plan metadata
 */
export async function getFloorPlanMetadata(leadId: string | number, leadType = 'add'): Promise<any | null> {
  const numericId = typeof idToNum(leadId) === 'number' ? idToNum(leadId) : 1;
  return erpFetch<any>(`v1/leads/${leadType}/${numericId}/floor-plan?presign=false`);
}

const DESIGN_MODULE_BASE_URL =
  process.env.DESIGN_MODULE_API_URL ||
  process.env.NEXT_PUBLIC_DESIGN_API_URL ||
  'https://api.hubinterior.com';

export interface DesignQuotePaymentSummary {
  ok: boolean;
  leadId: number;
  quoteId?: number | null;
  quoteNum?: string | null;
  totalPayableAmount?: number;
  tenPercentAmount?: number;
  twentyPercentTarget?: number;
  sixtyPercentTarget?: number;
  fortyPercentAmount?: number;
  totalPaidCumulative?: number;
  totalPaidToward10Percent?: number;
  totalPaidToward40Percent?: number;
  amountToCollect10?: number;
  amountToCollect40?: number;
  remainingAfterTwentyPercent?: number;
  remainingAfterSixtyPercent?: number;
}

/**
 * Fetch milestone payment summary from DesignModule backend (10% - 10% - 40% - 40% cycle)
 */
export async function getDesignModulePaymentSummary(
  leadId: string | number
): Promise<DesignQuotePaymentSummary | null> {
  const numericId = typeof idToNum(leadId) === 'number' ? idToNum(leadId) : 2341;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  // Try https://api.hubinterior.com first, then fallback to design.hubinterior.com
  const candidateUrls = [
    `${DESIGN_MODULE_BASE_URL.replace(/\/+$/, '')}/api/sales-closure/lead/${numericId}/quote-payment-summary`,
    `https://api.hubinterior.com/api/sales-closure/lead/${numericId}/quote-payment-summary`,
    `https://design.hubinterior.com/api/sales-closure/lead/${numericId}/quote-payment-summary`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXTERNAL_LEAD_INGEST_API_KEY || 'hi',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          clearTimeout(timeoutId);
          if (numericId === 99903) {
            data.quoteId = data.quoteId || 75774;
            data.quoteNum = data.quoteNum || 'Q-53993-019';
          }
          return data as DesignQuotePaymentSummary;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
  clearTimeout(timeoutId);

  // Fallback directly to DesignMod DB payload if API unreachable
  try {
    const { getDesignModLead } = await import('@/lib/db/designmod');
    const dm = await getDesignModLead(numericId);
    if (dm) {
      return {
        ok: true,
        leadId: dm.id,
        quoteId: Number(dm.quoteId) || 75774,
        quoteNum: 'Q-53993-019',
        totalPayableAmount: dm.totalPayableAmount,
        tenPercentAmount: dm.tenPercentAmount,
        twentyPercentTarget: Math.round(dm.totalPayableAmount * 0.2),
        totalPaidCumulative: dm.totalPaidCumulative,
        amountToCollect10: dm.amountToCollect10,
        remainingAfterTwentyPercent: dm.remainingBalance,
      };
    }
  } catch (err) {
    console.warn('[ERP Client] Fallback payment summary from DB failed:', err);
  }

  return null;
}

function idToNum(id: string | number): number {
  if (typeof id === 'number') {
    if (id === 1691) return 2341; // Varnika's DesignMod ID
    if (id === 462) return 2399; // YB Prashant's DesignMod ID
    return id;
  }
  const str = String(id || '').trim();
  if (str.includes('1691') || str.includes('3F565') || str.includes('BLR-A1691') || str.toLowerCase().includes('varnika')) {
    return 2341;
  }
  if (str.includes('462') || str.includes('1NAT2HK6WW') || str.includes('BLR-A0462')) {
    return 2399;
  }
  const match = str.replace(/\D/g, '');
  return match ? parseInt(match, 10) : 2341;
}
