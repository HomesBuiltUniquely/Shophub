import apiClient from './axios-instance';

export interface Lead {
  id: number | string;
  leadId?: string;
  lead_id?: string;
  customerId?: string;
  customer_id?: string;
  name?: string;
  customerName?: string;
  customer_name?: string;
  email?: string;
  phoneNumber?: string;
  phone_number?: string;
  status: string;
  leadType?: string;
  lead_type?: string;
  territory?: string;
  createdAt?: string;
  created_at?: string;
  propertyPin?: string;
  propertyDetails?: string;
  [key: string]: unknown;
}

export interface LeadsFilterParams {
  leadType?: string;
  status?: string;
  customerName?: string;
  projectName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

interface LeadsResponse {
  content?: Lead[];
  leads?: Lead[];
  data?: Lead[] | unknown;
  [key: string]: unknown;
}

// Supported CRM lead tables in backend
export const CRM_LEAD_TYPES = [
  'glead',
  'mlead',
  'formlead',
  'addlead',
  'websitelead',
  'walkinlead',
  'whatsapplead',
  'ivrlead',
  'quikrlead',
] as const;

const extractLeads = (data: unknown): Lead[] => {
  if (Array.isArray(data)) {
    return data.filter((item) => item && typeof item === 'object') as Lead[];
  }
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const nestedKeys = ['content', 'leads', 'data', 'list', 'records', 'items', 'result', ...CRM_LEAD_TYPES];
  for (const key of nestedKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value as Lead[];
    if (value && typeof value === 'object') {
      const nested = extractLeads(value);
      if (nested.length) {
        return nested.map((lead) => ({
          ...lead,
          leadType: lead.leadType || lead.lead_type || key,
        }));
      }
    }
  }
  const collected: Lead[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (!Array.isArray(value) || !value.length || typeof value[0] !== 'object') continue;
    const sample = value[0] as Record<string, unknown>;
    if (sample.id == null && sample.customerId == null && sample.customer_id == null) continue;
    collected.push(
      ...value.map((lead) => ({
        ...(lead as Lead),
        leadType: (lead as Lead).leadType || (lead as Lead).lead_type || key,
      }))
    );
  }
  return collected;
};

export function decodeUniqueCrmId(uniqueId: number): { leadType: string; crmLeadId: number } {
  if (!uniqueId || uniqueId < 1_000_000) {
    return { leadType: 'glead', crmLeadId: uniqueId };
  }
  const bucket = Math.floor(uniqueId / 1_000_000);
  const crmLeadId = uniqueId % 1_000_000;
  return {
    leadType: CRM_LEAD_TYPES[bucket - 1] || 'glead',
    crmLeadId,
  };
}

type LeadsFetchResult = {
  leads: Lead[];
  /** Spring rejected the CRM call (missing/invalid token). Other lead types will fail the same way. */
  authDenied: boolean;
};

/**
 * Fetch leads for a specific lead type (default: glead)
 * GET /leads/filter?leadType={leadType}
 */
const fetchFilteredLeads = async (params: LeadsFilterParams = {}): Promise<LeadsFetchResult> => {
  try {
    const leadType = params.leadType || 'glead';
    const response = await apiClient.get<LeadsResponse>('/leads/filter', {
      params: { leadType, ...params },
      validateStatus: () => true,
    });
    if (response.status === 401 || response.status === 403) {
      return { leads: [], authDenied: true };
    }
    if (response.status < 200 || response.status >= 300) {
      return { leads: [], authDenied: false };
    }
    const leads = extractLeads(response.data).map((l) => ({ ...l, leadType }));
    return { leads, authDenied: false };
  } catch {
    return { leads: [], authDenied: false };
  }
};

export const getFilteredLeads = async (params: LeadsFilterParams = {}): Promise<Lead[]> => {
  const { leads } = await fetchFilteredLeads(params);
  return leads;
};

let crmLeadsInFlight: Promise<Lead[]> | null = null;

/**
 * Concurrently fetch leads across every CRM lead table
 * (glead, mlead, formlead, addlead, websitelead, walkinlead, whatsapplead, ivrlead, quikrlead)
 */
export const getAllCrmLeads = async (params: LeadsFilterParams = {}): Promise<Lead[]> => {
  if (crmLeadsInFlight && Object.keys(params).length === 0) {
    return crmLeadsInFlight;
  }

  const load = (async () => {
    const targetLeadTypes = [...CRM_LEAD_TYPES];
    const probe = await fetchFilteredLeads({ ...params, leadType: targetLeadTypes[0] });
    if (probe.authDenied) {
      return [];
    }

    const remaining = await Promise.all(
      targetLeadTypes.slice(1).map((lt) => fetchFilteredLeads({ ...params, leadType: lt }))
    );

    return [probe, ...remaining].flatMap((result) => result.leads);
  })();

  if (Object.keys(params).length === 0) {
    crmLeadsInFlight = load;
    load.finally(() => {
      crmLeadsInFlight = null;
    });
  }

  return load;
};

/**
 * Known default CRM customer profiles for fallback/enrichment
 */
const DEFAULT_CRM_CUSTOMERS = [
  { id: 2185, name: 'Rahul Sharma', customerId: 'BLR-A2185', phone: '7647867564', source: 'glead' },
  { id: 2228, name: 'Ananya Mishra', customerId: 'BLR-A2228', phone: '9535785947', source: 'glead' },
  { id: 1001, name: 'Deepak', customerId: 'BLR-A0001', phone: '8217267485', source: 'mlead' },
  { id: 1002, name: 'Keerthi', customerId: 'BLR-A0002', phone: '7411589705', source: 'mlead' },
  { id: 1003, name: 'Mohammed Muddassir', customerId: 'BLR-A0003', phone: '8792107142', source: 'mlead' },
  { id: 1004, name: 'Priya', customerId: 'BLR-A0004', phone: '9019211189', source: 'mlead' },
];

/**
 * Extract unique customers from leads across CRM tables (glead, mlead, formlead, etc.)
 * Intelligently correlates customerId with customer name.
 * Displays formatted name: "Customer Name (BLR-A2185)" or "Customer Name"
 */
export const getCustomersFromLeads = async (): Promise<{
  id: number;
  name: string;
  customerId?: string;
  realName?: string;
}[]> => {
  const leads = await getAllCrmLeads();

  // Map to resolve customer names by customerId across tables
  const customerNameMap = new Map<string, string>();

  // Pre-seed known customer mappings from CRM data
  DEFAULT_CRM_CUSTOMERS.forEach((c) => {
    customerNameMap.set(c.customerId, c.name);
  });

  // Extract non-empty names from any lead records
  leads.forEach((lead) => {
    const rawCustId = lead.customerId || lead.customer_id;
    const rawName = (lead.name && lead.name.trim()) ||
      (lead.customerName && lead.customerName.trim()) ||
      (lead.customer_name && lead.customer_name.trim());

    if (rawCustId && rawName) {
      customerNameMap.set(String(rawCustId).trim(), rawName);
    }
  });

  const seen = new Set<string>();
  const customers: { id: number; name: string; customerId?: string; realName?: string }[] = [];

  leads.forEach((lead) => {
    const custId = lead.customerId || lead.customer_id || `CUST-${lead.id}`;
    const trimmedCustId = String(custId).trim();

    if (trimmedCustId && !seen.has(trimmedCustId)) {
      seen.add(trimmedCustId);
      const numericId = typeof lead.id === 'string' ? parseInt(lead.id) || 1 : (lead.id as number);

      // Resolve real customer name: check lead.name first, then look up in cross-table map
      const directName = (lead.name && lead.name.trim()) ||
        (lead.customerName && lead.customerName.trim()) ||
        (lead.customer_name && lead.customer_name.trim());

      const realName = directName || customerNameMap.get(trimmedCustId);

      // Format display name: e.g. "Rahul Sharma (BLR-A2185)" or "Deepak (BLR-A0001)"
      const displayName = realName
        ? `${realName} (${trimmedCustId})`
        : trimmedCustId;

      customers.push({
        id: numericId,
        name: displayName,
        customerId: trimmedCustId,
        realName: realName || trimmedCustId,
      });
    }
  });

  // If no customers returned from API (e.g. backend unauthorized or offline), return known CRM profiles
  if (customers.length === 0) {
    return DEFAULT_CRM_CUSTOMERS.map((c) => ({
      id: c.id,
      name: `${c.name} (${c.customerId})`,
      customerId: c.customerId,
      realName: c.name,
    }));
  }

  return customers;
};

/**
 * Transform lead into project to show in Active Project dropdown
 * Displays project label: "Project #2185 (GL-MOZKPP0X8A)" or property details
 */
export const transformLeadToProject = (lead: Lead) => {
  const numericId = typeof lead.id === 'string' ? parseInt(lead.id) || 1 : (lead.id as number);
  const identifier = lead.leadId || lead.lead_id || lead.customerId || `Lead-${lead.id}`;
  const label = lead.propertyDetails
    ? `${lead.propertyDetails} (#${lead.id})`
    : `Project #${lead.id} (${identifier})`;

  return {
    id: numericId,
    projectName: label,
    customerId: numericId,
    status: lead.status || 'Active',
  };
};

export const getProjectsForQuoteEngine = async () => {
  const leads = await getAllCrmLeads();

  if (leads.length === 0) {
    // Fallback projects matching known CRM records
    return [
      { id: 2185, projectName: 'Project #2185 (GL-MOZKPP0X8A - Google Ads)', customerId: 2185, status: 'Active' },
      { id: 2228, projectName: 'Project #2228 (GL-DPV44DJXO2 - Google Ads)', customerId: 2228, status: 'Active' },
      { id: 1001, projectName: 'Project #1 (ML-8ZT2VBEFKM - Meta)', customerId: 1001, status: 'Active' },
      { id: 1002, projectName: 'Project #2 (ML-AYKM1LNP9R - Meta)', customerId: 1002, status: 'Active' },
    ];
  }

  return leads.map(transformLeadToProject);
};

export interface QuoteCustomer {
  id: number;
  name: string;
  customerId?: string;
  phone?: string;
  email?: string;
  realName?: string;
  leadType?: string;
  crmLeadId?: number;
}

export interface QuoteProject {
  id: number;
  projectName: string;
  customerId?: number;
  status?: string;
  leadId?: string;
  leadType?: string;
  crmLeadId?: number;
}

function uniqueCrmNumericId(leadType: string | undefined, id: number) {
  const idx = Math.max(0, CRM_LEAD_TYPES.indexOf((leadType || 'glead') as (typeof CRM_LEAD_TYPES)[number]));
  return (idx + 1) * 1_000_000 + Number(id || 0);
}

const HOWS_LEADS_FILTER_URL = 'https://hows.hubinterior.com/v1/leads/filter';
const DESIGN_LEADS_QUEUE_URL = 'https://api.hubinterior.com/api/leads/queue';
const DEFAULT_CRM_TOKEN = process.env.NEXT_PUBLIC_CRM_BEARER_TOKEN || 'token_1_1787224003564';
const DEFAULT_DESIGN_TOKEN = process.env.NEXT_PUBLIC_DESIGN_MODULE_TOKEN || 'sess-1724154432000-ab12cd34';

function mapCrmLeads(rawLeads: Lead[]): { customers: QuoteCustomer[]; projects: QuoteProject[] } {
  const customers: QuoteCustomer[] = [];
  const customerByCode = new Map<string, QuoteCustomer>();

  rawLeads.forEach((l) => {
    const leadType = String(l.leadType || l.lead_type || 'glead');
    const origId = typeof l.id === 'string' ? parseInt(l.id, 10) || 1 : Number(l.id) || 1;
    const uniqueId = uniqueCrmNumericId(leadType, origId);
    const trimmed = String(l.customerId || l.customer_id || `BLR-A${origId}`).trim();
    const customerKey = `${trimmed}::${leadType}`;
    if (customerByCode.has(customerKey)) return;
    const resolvedName =
      (typeof l.name === 'string' && l.name.trim()) ||
      DEFAULT_CRM_CUSTOMERS.find((d) => d.id === origId || d.customerId === trimmed)?.name ||
      `Customer ${trimmed}`;
    const customer: QuoteCustomer = {
      id: uniqueId,
      name: `${resolvedName} (${trimmed} · ${leadType})`,
      customerId: trimmed,
      phone: l.phoneNumber || (l.phone_number as string),
      email: l.email,
      realName: resolvedName,
      leadType,
      crmLeadId: origId,
    };
    customerByCode.set(customerKey, customer);
    customers.push(customer);
  });

  const projects: QuoteProject[] = rawLeads.map((l) => {
    const leadType = String(l.leadType || l.lead_type || 'glead');
    const origId = typeof l.id === 'string' ? parseInt(l.id, 10) || 1 : Number(l.id) || 1;
    const uniqueId = uniqueCrmNumericId(leadType, origId);
    const trimmed = String(l.customerId || l.customer_id || `BLR-A${origId}`).trim();
    const identifier = l.leadId || l.lead_id || l.customerId || `Lead-${origId}`;
    const statusValue =
      typeof l.status === 'string'
        ? l.status
        : typeof l.status === 'object' && l.status !== null
        ? String(
            (l.status as Record<string, unknown>).milestoneStage ||
              (l.status as Record<string, unknown>).stage ||
              (l.status as Record<string, unknown>).substage ||
              'Active'
          )
        : (l as { stage?: string }).stage || 'Active';
    return {
      id: uniqueId,
      crmLeadId: origId,
      projectName: `Project #${origId} (${identifier} · ${leadType})`,
      customerId: customerByCode.get(`${trimmed}::${leadType}`)?.id ?? uniqueId,
      status: statusValue,
      leadId: l.leadId || (l.lead_id as string),
      leadType,
    };
  });

  return { customers, projects };
}

function mapDesignQueue(items: Record<string, unknown>[]): {
  customers: QuoteCustomer[];
  projects: QuoteProject[];
} {
  const customers: QuoteCustomer[] = [];
  const seenCust = new Set<string>();

  items.forEach((item) => {
    const custCode = String(item.pid || `HUB-${item.id}`);
    if (seenCust.has(custCode)) return;
    seenCust.add(custCode);
    const clientName = String(item.projectName || item.intakeCustomerName || 'Client');
    customers.push({
      id: Number(item.id) || 0,
      name: `${clientName} (${custCode})`,
      customerId: custCode,
      phone: item.contactNo as string | undefined,
      email: item.clientEmail as string | undefined,
      realName: clientName,
    });
  });

  const projects: QuoteProject[] = items.map((item) => {
    const clientName = String(item.projectName || item.intakeCustomerName || 'Client');
    const stage = item.projectStage ? ` - ${item.projectStage}` : '';
    return {
      id: Number(item.id) || 0,
      projectName: `Project #${item.pid || item.id} (${clientName}${stage})`,
      customerId: Number(item.id) || 0,
      status: String(item.projectStage || 'Active'),
      leadId: item.pid as string | undefined,
    };
  });

  return { customers, projects };
}

async function fetchHowsJson(crmToken: string, search: URLSearchParams) {
  const res = await fetch(`${HOWS_LEADS_FILTER_URL}?${search.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${crmToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.warn(`[CRM Bucket] ${search.toString()} → ${res.status}`);
    return null;
  }
  return res.json();
}

async function fetchHowsLeadsByType(crmToken: string, leadType: string): Promise<Lead[]> {
  const rawLeads: Lead[] = [];
  const pageSize = 10;
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 20) {
    const search = new URLSearchParams({
      leadType,
      page: String(page),
      size: String(pageSize),
    });
    const data = await fetchHowsJson(crmToken, search);
    if (!data) break;
    rawLeads.push(...extractLeads(data).map((lead) => ({ ...lead, leadType: lead.leadType || leadType })));
    totalPages = Number((data as { totalPages?: number }).totalPages || 1);
    page += 1;
    if (!(data as { totalPages?: number }).totalPages) break;
  }

  return rawLeads;
}

/**
 * Sales/CRM bucket: GET /v1/leads/filter?leadType=glead|mlead|formlead|addlead|websitelead|walkinlead|whatsapplead|ivrlead|quikrlead
 */
export async function getCrmBucketCustomersAndProjects(
  token?: string,
  options?: { fallback?: boolean }
): Promise<{
  customers: QuoteCustomer[];
  projects: QuoteProject[];
}> {
  const allowFallback = options?.fallback !== false;
  const crmToken = token || (allowFallback ? DEFAULT_CRM_TOKEN : '');
  if (!crmToken) {
    return { customers: [], projects: [] };
  }
  try {
    const combined = new URLSearchParams();
    CRM_LEAD_TYPES.forEach((leadType) => combined.append('leadType', leadType));
    combined.set('page', '0');
    combined.set('size', '50');
    const combinedData = await fetchHowsJson(crmToken, combined);
    const combinedLeads = combinedData
      ? extractLeads(combinedData).map((lead) => ({
          ...lead,
          leadType: lead.leadType || lead.lead_type || 'glead',
        }))
      : [];

    const batches = await Promise.all(
      CRM_LEAD_TYPES.map((leadType) => fetchHowsLeadsByType(crmToken, leadType))
    );
    const seen = new Set<string>();
    const rawLeads: Lead[] = [];
    for (const lead of [...combinedLeads, ...batches.flat()]) {
      const type = String(lead.leadType || lead.lead_type || 'glead');
      const key = `${type}:${lead.id}:${lead.customerId || lead.customer_id || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawLeads.push({ ...lead, leadType: type });
    }

    console.info(
      '[CRM Bucket] lead counts',
      Object.fromEntries(CRM_LEAD_TYPES.map((type) => [type, rawLeads.filter((lead) => lead.leadType === type).length]))
    );

    if (rawLeads.length > 0) {
      return mapCrmLeads(rawLeads);
    }
  } catch (err) {
    console.warn('[CRM Bucket] Failed to fetch live CRM leads, falling back to assigned leads:', err);
  }

  if (!allowFallback) {
    return { customers: [], projects: [] };
  }

  const customers = await getCustomersFromLeads();
  const projects = await getProjectsForQuoteEngine();
  return { customers, projects };
}

/**
 * Design bucket: GET /api/leads/queue
 */
export async function getDesignBucketCustomersAndProjects(
  token?: string,
  options?: { fallback?: boolean }
): Promise<{
  customers: QuoteCustomer[];
  projects: QuoteProject[];
}> {
  const allowFallback = options?.fallback !== false;
  const designToken = token || (allowFallback ? DEFAULT_DESIGN_TOKEN : '');
  if (!designToken) {
    return { customers: [], projects: [] };
  }
  try {
    const res = await fetch(DESIGN_LEADS_QUEUE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${designToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const payload = await res.json();
      const items = extractLeads(payload) as unknown as Record<string, unknown>[];
      if (items.length > 0) {
        return mapDesignQueue(items);
      }
    }
  } catch (err) {
    console.warn('[Design Bucket] Failed to fetch live design queue, falling back:', err);
  }

  if (!allowFallback) {
    return { customers: [], projects: [] };
  }

  return {
    customers: [
      { id: 2, name: 'Sam (HUB1848)', customerId: 'HUB1848', phone: '9790676265', email: 'sam.p.george1@gmail.com', realName: 'Sam' },
    ],
    projects: [
      { id: 2, projectName: 'Project #HUB1848 (Sam - 20-60%)', customerId: 2, status: '20-60%', leadId: 'HUB1848' },
    ],
  };
}

/**
 * Fetch full global list for Admin
 */
export async function getAdminCustomersAndProjects(): Promise<{
  customers: QuoteCustomer[];
  projects: QuoteProject[];
}> {
  const [crmData, designData] = await Promise.all([
    getCrmBucketCustomersAndProjects(),
    getDesignBucketCustomersAndProjects(),
  ]);

  const customerMap = new Map<number, QuoteCustomer>();
  crmData.customers.forEach((c) => customerMap.set(c.id, c));
  designData.customers.forEach((c) => {
    if (!customerMap.has(c.id)) customerMap.set(c.id, c);
  });

  const projectMap = new Map<number, QuoteProject>();
  crmData.projects.forEach((p) => projectMap.set(p.id, p));
  designData.projects.forEach((p) => {
    if (!projectMap.has(p.id)) projectMap.set(p.id, p);
  });

  return {
    customers: Array.from(customerMap.values()),
    projects: Array.from(projectMap.values()),
  };
}
