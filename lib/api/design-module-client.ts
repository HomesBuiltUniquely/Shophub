const DESIGN_MODULE_BASE_URL = (
  process.env.DESIGN_MODULE_BASE_URL ||
  process.env.DESIGN_MODULE_API_URL ||
  'https://api.hubinterior.com'
).replace(/\/+$/, '');

const DESIGN_AUTH_TOKEN =
  process.env.DESIGN_MODULE_TOKEN ||
  process.env.NEXT_PUBLIC_DESIGN_MODULE_TOKEN ||
  'sess-1724154432000-ab12cd34';

export const DESIGN_TRACKER_MILESTONES = [
  { index: 0, name: 'D1 SITE MEASUREMENT', description: 'Site architectural measurement and D1 task pack.' },
  { index: 1, name: 'DQC1', description: 'First-cut design, drawings, and quotation discussion.' },
  { index: 2, name: '10% PAYMENT', description: 'Design module 10% payment after DQC1.' },
  { index: 3, name: 'D2 SITE MASKING', description: 'Site masking request and physical dimensions review.' },
  { index: 4, name: 'DQC2', description: 'Material finishes freeze and DQC2 drawings.' },
  { index: 5, name: '40% PAYMENT', description: 'Design sign-off 40% payment before production.' },
  { index: 6, name: 'PUSH TO PRODUCTION', description: 'Factory manufacturing and production dispatch.' },
] as const;

export type DesignTrackerMilestone = (typeof DESIGN_TRACKER_MILESTONES)[number];

export interface DesignLead {
  id: number;
  pid?: string;
  projectName?: string;
  projectStage?: string;
  contactNo?: string;
  clientEmail?: string;
  designerName?: string;
  designerEmail?: string;
  projectManagerName?: string;
  salesExecutive?: string;
  intakeCustomerName?: string;
  intakeConfiguration?: string;
  intakePropertyLocation?: string;
  intakePincode?: string;
  intakeBookingType?: string;
  prolanceProjectId?: number | null;
  prolanceQuoteId?: number | null;
  floorPlanPublicLink?: string;
  currentMilestoneIndex?: number;
  currentMilestoneName?: string;
  currentMilestoneProgress?: number;
  experienceSummary?: {
    quoteId?: string | number;
    quoteLink?: string | null;
    quoteVersionLabel?: string | null;
    quoteAmount?: number;
  };
  decisionSummary?: { finalBudget?: number };
  configScopeSummary?: { selectedRoomNames?: string[]; selectedRooms?: unknown[] };
  [key: string]: unknown;
}

type QueueCache = { at: number; items: DesignLead[] };
let queueCache: QueueCache | null = null;
const QUEUE_TTL_MS = 30_000;

async function designFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = `${DESIGN_MODULE_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      method: init?.method || 'GET',
      headers: {
        Authorization: `Bearer ${DESIGN_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[Design Module] ${res.status} ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[Design Module] request failed', path, (err as Error).message);
    return null;
  }
}

export async function getDesignLeadById(id: string | number): Promise<DesignLead | null> {
  const numeric = String(id || '').replace(/\D/g, '');
  if (!numeric) return null;
  const lead = await designFetch<DesignLead>(`/api/leads/${numeric}`);
  return lead?.id ? lead : null;
}

export async function getDesignLeadByCrmId(crmLeadId: string | number): Promise<DesignLead | null> {
  const clean = String(crmLeadId || '').trim();
  if (!clean) return null;
  const lead = await designFetch<DesignLead>(`/api/leads/by-crm-id/${encodeURIComponent(clean)}`);
  return lead?.id ? lead : null;
}

export async function getDesignLeadCompletions(id: string | number) {
  const numeric = String(id || '').replace(/\D/g, '');
  if (!numeric) return [];
  const data = await designFetch<Array<{ milestoneIndex: number; taskName: string; completedAt?: string }>>(
    `/api/leads/${numeric}/completions`
  );
  return Array.isArray(data) ? data : [];
}

export async function getDesignLeadsQueue(): Promise<DesignLead[]> {
  if (queueCache && Date.now() - queueCache.at < QUEUE_TTL_MS) {
    return queueCache.items;
  }
  const data = await designFetch<DesignLead[]>('/api/leads/queue');
  const items = Array.isArray(data) ? data : [];
  queueCache = { at: Date.now(), items };
  return items;
}

function digits(value?: string | number | null) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function phoneTail(value?: string | null) {
  const d = digits(value);
  return d.length >= 10 ? d.slice(-10) : d;
}

function matchesLead(
  lead: DesignLead,
  opts: { leadId?: string | null; email?: string | null; phone?: string | null; pid?: string | null }
) {
  const id = digits(opts.leadId);
  if (id && String(lead.id) === id) return true;
  if (id && digits(lead.pid) && digits(lead.pid) === id) return true;

  const pid = String(opts.pid || opts.leadId || '').replace(/^BLR-/, '').trim();
  if (pid && String(lead.pid || '').replace(/^BLR-/, '') === pid) return true;

  const email = normalizeEmail(opts.email);
  if (email && normalizeEmail(lead.clientEmail) === email) return true;
  const emails = (lead.clientEmails as string[] | undefined) || [];
  if (email && emails.some((e) => normalizeEmail(e) === email)) return true;

  const phone = phoneTail(opts.phone);
  if (phone && phoneTail(lead.contactNo) === phone) return true;
  return false;
}

export async function resolveDesignLead(opts: {
  leadId?: string | null;
  email?: string | null;
  phone?: string | null;
  pid?: string | null;
}): Promise<DesignLead | null> {
  const queue = await getDesignLeadsQueue();
  const identityMatch = queue.find((item) =>
    matchesLead(item, { email: opts.email, phone: opts.phone, pid: opts.pid })
  );

  const directId = digits(opts.leadId);
  let byId: DesignLead | null = null;
  if (directId) {
    byId = queue.find((item) => String(item.id) === directId) || (await getDesignLeadById(directId));
  }

  const byCrm = !identityMatch && !byId && opts.leadId ? await getDesignLeadByCrmId(opts.leadId) : null;

  const chosen = identityMatch || byId || byCrm;
  if (!chosen?.id) return null;

  const detail = (await getDesignLeadById(chosen.id)) || chosen;
  const queued = queue.find((item) => item.id === chosen.id) || identityMatch || chosen;
  const merged: DesignLead = {
    ...queued,
    ...detail,
    currentMilestoneIndex: queued.currentMilestoneIndex ?? detail.currentMilestoneIndex,
    currentMilestoneName: queued.currentMilestoneName ?? detail.currentMilestoneName,
    currentMilestoneProgress: queued.currentMilestoneProgress ?? detail.currentMilestoneProgress,
  };

  if (!merged.currentMilestoneName) {
    merged.currentMilestoneName = DESIGN_TRACKER_MILESTONES[0].name;
    merged.currentMilestoneIndex = 0;
    merged.currentMilestoneProgress = 0;
  }
  if (merged.currentMilestoneName === 'KT TRANSFER') {
    merged.currentMilestoneName = 'PUSH TO PRODUCTION';
    merged.currentMilestoneIndex = 6;
  }
  return merged;
}

export function designQuoteUrl(quoteId?: string | number | null) {
  if (!quoteId) return undefined;
  return `https://design.hubinterior.com/quote/${quoteId}`;
}

export function quoteIdFromDesignLead(lead: DesignLead | null | undefined): number | null {
  if (!lead) return null;
  const fromField = Number(lead.prolanceQuoteId);
  if (fromField) return fromField;
  const fromSummary = Number(lead.experienceSummary?.quoteId);
  if (fromSummary) return fromSummary;
  return null;
}

export async function getPublicQuote(quoteId: string | number) {
  const id = digits(quoteId);
  if (!id) return null;
  const live = await designFetch<Record<string, unknown>>(`/api/prolance-test/quotes/share/${id}?live=1`, {
    headers: { Authorization: `Bearer ${DESIGN_AUTH_TOKEN}` },
  });
  if (live) return live;
  try {
    const res = await fetch(`${DESIGN_MODULE_BASE_URL}/api/prolance-test/public/quotes/view/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getPublicQuoteRevisions(quoteId: string | number) {
  const id = digits(quoteId);
  if (!id) return [];
  try {
    const res = await fetch(`${DESIGN_MODULE_BASE_URL}/api/prolance-test/public/quote-revisions/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { versions?: Array<{ quoteId: number; createdAt?: string; createdBy?: string }> };
    return Array.isArray(data?.versions) ? data.versions : [];
  } catch {
    return [];
  }
}

export function trackerStatus(currentIndex: number, milestoneIndex: number): 'completed' | 'active' | 'upcoming' {
  if (milestoneIndex < currentIndex) return 'completed';
  if (milestoneIndex === currentIndex) return 'active';
  return 'upcoming';
}

export function trackerCompletionPercent(currentIndex: number, progress = 0) {
  const clamped = Math.max(0, Math.min(6, currentIndex));
  const inner = Math.max(0, Math.min(100, Number(progress) || 0));
  return Math.round(((clamped + inner / 100) / DESIGN_TRACKER_MILESTONES.length) * 100);
}
