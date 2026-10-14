const DESIGN_MODULE_BASE_URL = (
  process.env.DESIGN_MODULE_BASE_URL ||
  process.env.DESIGN_MODULE_API_URL ||
  'https://api.hubinterior.com'
).replace(/\/+$/, '');

/** Read-only Design Module service token (dm_svc_…). Never a designer sess- login. */
export function designServiceToken() {
  return String(process.env.DESIGN_MODULE_TOKEN || process.env.DESIGN_SERVICE_API_KEY || '').trim();
}

export function designServiceHeaders(): Record<string, string> {
  const token = designServiceToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Design-Service-Key'] = token;
  }
  return headers;
}

/** Visual left→right order. `id` is the Design Module milestone ID, not an array position. */
export const DESIGN_TRACKER_MILESTONES = [
  { index: 0, id: 7, apiIndex: 7, name: 'KT TRANSFER', description: 'Kickoff transfer from sales to the design team.' },
  { index: 1, id: 0, apiIndex: 0, name: 'D1 SITE MEASUREMENT', description: 'Site architectural measurement and D1 task pack.' },
  { index: 2, id: 1, apiIndex: 1, name: 'DQC1', description: 'First-cut design, drawings, and quotation discussion.' },
  { index: 3, id: 2, apiIndex: 2, name: '10% PAYMENT', description: 'Design module 10% payment after DQC1.' },
  { index: 4, id: 3, apiIndex: 3, name: 'D2 SITE MASKING', description: 'Site masking request and physical dimensions review.' },
  { index: 5, id: 4, apiIndex: 4, name: 'DQC2', description: 'Material finishes freeze and DQC2 drawings.' },
  { index: 6, id: 5, apiIndex: 5, name: '40% PAYMENT', description: 'Design sign-off 40% payment before production.' },
  { index: 7, id: 6, apiIndex: 6, name: 'PUSH TO PRODUCTION', description: 'Factory manufacturing and production dispatch.' },
] as const;

export const WORKFLOW_ORDER = [7, 0, 1, 2, 3, 4, 5, 6] as const;

/** Exact Design Module task strings. "DQC 2 approval " includes a trailing space. */
export const MILESTONE_TASKS: Record<number, string[]> = {
  7: ['Upload KT files'],
  0: ['Group Description', 'Mail loop chain 2 initiate', 'D1 for MMT request', 'D1 files upload'],
  1: [
    'First cut design + quotation discussion meeting request',
    'meeting completed',
    'DQC 1 submission - dwg + quotation',
    'DQC 1 approval',
  ],
  2: ['10% payment collection', '10% payment approval'],
  3: ['D2 - masking request raise', 'D2 - files upload'],
  4: [
    'Material selection meeting + quotation discussion',
    'Material selection meeting completed',
    'DQC 2 submission',
    'DQC 2 approval ',
    'Project manager approval',
  ],
  5: ['Design sign off', 'meeting completed', '40% collection', '40% payment approval'],
  6: ['Cx approval for production', 'POC mail'],
};

export function visualIndexForMilestoneId(milestoneId: number) {
  const pos = (WORKFLOW_ORDER as readonly number[]).indexOf(Number(milestoneId));
  return pos >= 0 ? pos : 1;
}

export function milestoneById(milestoneId: number) {
  return DESIGN_TRACKER_MILESTONES.find((m) => m.id === milestoneId) || DESIGN_TRACKER_MILESTONES[1];
}

export function getCurrentMilestoneIndexFromCompletions(
  completions: Array<{ milestoneIndex: number; taskName: string }>
) {
  const done = new Set(completions.map((c) => `${c.milestoneIndex}::${c.taskName}`));
  for (const i of WORKFLOW_ORDER) {
    const tasks = MILESTONE_TASKS[i] || [];
    const allDone = tasks.every((t) => done.has(`${i}::${t}`));
    if (!allDone) return i;
  }
  return 6;
}

export function isMilestoneFullyComplete(
  milestoneId: number,
  completions: Array<{ milestoneIndex: number; taskName: string }>
) {
  const tasks = MILESTONE_TASKS[milestoneId] || [];
  if (!tasks.length) return false;
  const done = new Set(completions.map((c) => `${c.milestoneIndex}::${c.taskName}`));
  return tasks.every((t) => done.has(`${milestoneId}::${t}`));
}

export interface DesignTrackerState {
  currentId: number;
  visualIndex: number;
  currentName: string;
  nextName: string;
  overallPercent: number;
  innerProgress: number;
}

export function resolveDesignTracker(lead: {
  currentMilestoneIndex?: number | null;
  currentMilestoneName?: string | null;
  currentMilestoneProgress?: number | null;
  taskCompletions?: Array<{ milestoneIndex: number; taskName: string; completedAt?: string }>;
}): DesignTrackerState {
  const completions = Array.isArray(lead.taskCompletions) ? lead.taskCompletions : [];
  const rawIndex = lead.currentMilestoneIndex;
  const hasApiIndex = rawIndex !== undefined && rawIndex !== null && !Number.isNaN(Number(rawIndex));

  const currentId = hasApiIndex
    ? Number(rawIndex)
    : getCurrentMilestoneIndexFromCompletions(completions);

  const visualIndex = visualIndexForMilestoneId(currentId);
  const byId = milestoneById(currentId);
  const currentName = byId.name;
  const next = DESIGN_TRACKER_MILESTONES[visualIndex + 1];
  const overallPercent = Math.round((visualIndex / DESIGN_TRACKER_MILESTONES.length) * 100);

  return {
    currentId,
    visualIndex,
    currentName,
    nextName: next?.name || 'PRODUCTION IN PROGRESS',
    overallPercent,
    innerProgress: Math.max(0, Math.min(100, Number(lead.currentMilestoneProgress || 0))),
  };
}

/** Visual slot for a Design milestone ID. Index 0 is D1, not KT. */
export function displayIndexFromApi(apiIndex?: number | null, _name?: string | null) {
  if (apiIndex === undefined || apiIndex === null || (apiIndex as unknown) === '') return 1;
  return visualIndexForMilestoneId(Number(apiIndex));
}

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
  designerRoleLabel?: string;
  assigned_designer_id?: number | null;
  designManagerName?: string;
  designManagerEmail?: string;
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
  taskCompletions?: Array<{ milestoneIndex: number; taskName: string; completedAt?: string }>;
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
  const token = designServiceToken();
  if (!token) {
    console.warn('[Design Module] DESIGN_MODULE_TOKEN is missing; skipped', path);
    return null;
  }
  try {
    const res = await fetch(url, {
      ...init,
      method: init?.method || 'GET',
      headers: {
        ...designServiceHeaders(),
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

export interface DesignStaff {
  id: number;
  name: string;
  email: string;
  role?: string;
  subRole?: string | null;
  leadName?: string | null;
}

let designersCache: { at: number; items: DesignStaff[] } | null = null;

function designerRoleLabel(subRole?: string | null) {
  const key = String(subRole || '').toUpperCase();
  if (key === 'ID') return 'Interior Designer';
  if (key === 'PD') return 'Project Designer';
  if (key === 'SID') return 'Senior Interior Designer';
  if (key === 'DP') return 'Design Partner';
  return 'Designer';
}

export async function getDesigners(): Promise<DesignStaff[]> {
  if (designersCache && Date.now() - designersCache.at < QUEUE_TTL_MS) {
    return designersCache.items;
  }
  const data = await designFetch<{ designers?: DesignStaff[] } | DesignStaff[]>('/api/designers');
  const items = Array.isArray(data) ? data : Array.isArray(data?.designers) ? data.designers : [];
  designersCache = { at: Date.now(), items };
  return items;
}

export async function getDesignerById(id?: number | null): Promise<(DesignStaff & { roleLabel: string }) | null> {
  if (!id) return null;
  const staff = (await getDesigners()).find((item) => Number(item.id) === Number(id));
  if (!staff) return null;
  return { ...staff, roleLabel: designerRoleLabel(staff.subRole) };
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

function normalizeName(value?: string | null, keepTrailingDigits = false) {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return keepTrailingDigits ? cleaned : cleaned.replace(/\s+\d+$/, '').trim();
}

function matchesLead(
  lead: DesignLead,
  opts: { leadId?: string | null; email?: string | null; phone?: string | null; pid?: string | null; name?: string | null }
) {
  const email = normalizeEmail(opts.email);
  if (email && normalizeEmail(lead.clientEmail) === email) return true;
  const emails = (lead.clientEmails as string[] | undefined) || [];
  if (email && emails.some((e) => normalizeEmail(e) === email)) return true;

  const phone = phoneTail(opts.phone);
  if (phone && phone.length >= 10 && phoneTail(lead.contactNo) === phone) return true;

  const exactName = normalizeName(opts.name, true);
  const looseName = normalizeName(opts.name);
  const leadExact = [lead.projectName, lead.intakeCustomerName].map((v) => normalizeName(v, true)).filter(Boolean);
  const leadLoose = [lead.projectName, lead.intakeCustomerName].map((v) => normalizeName(v)).filter(Boolean);
  if (exactName && exactName.length >= 4 && leadExact.some((n) => n === exactName)) return true;
  if (looseName && looseName.length >= 4) {
    if (leadLoose.some((n) => n === looseName)) return true;
  }

  const id = digits(opts.leadId);
  if (id && id.length >= 4 && String(lead.id) === id) return true;
  if (id && id.length >= 4 && digits(lead.pid) === id) return true;

  const pid = String(opts.pid || '').replace(/^BLR-/, '').trim();
  if (pid && pid.length >= 4 && String(lead.pid || '').replace(/^BLR-/, '') === pid) return true;
  return false;
}

function scoreLead(lead: DesignLead, opts: { email?: string | null; phone?: string | null; name?: string | null }) {
  let score = 0;
  const exactName = normalizeName(opts.name, true);
  const leadExact = normalizeName(lead.projectName || lead.intakeCustomerName, true);
  const name = normalizeName(opts.name);
  const leadName = normalizeName(lead.projectName || lead.intakeCustomerName);
  if (exactName && exactName === leadExact) score += 120;
  else if (name && leadName === name) score += 40;
  if (phoneTail(opts.phone) && phoneTail(lead.contactNo) === phoneTail(opts.phone)) score += 80;
  if (normalizeEmail(opts.email) && normalizeEmail(lead.clientEmail) === normalizeEmail(opts.email)) score += 20;
  return score;
}

function pickDesignLead(
  identityMatches: DesignLead[],
  byId: DesignLead | null,
  opts: { email?: string | null; phone?: string | null; name?: string | null }
): DesignLead | null {
  const ranked = [...identityMatches].sort((a, b) => scoreLead(b, opts) - scoreLead(a, opts));
  const namedOrPhone = ranked.filter((lead) => scoreLead(lead, opts) >= 40);

  if (namedOrPhone.length === 1) return namedOrPhone[0];
  if (namedOrPhone.length > 1) {
    const exact = namedOrPhone.filter((lead) => scoreLead(lead, opts) >= 120);
    if (exact.length === 1) return exact[0];
    return namedOrPhone.sort((a, b) => Number(b.id) - Number(a.id))[0];
  }

  if (ranked.length === 1) return ranked[0];
  // Shared emails (staff/test) must not steal a further-along lead.
  if (byId && ranked.some((lead) => lead.id === byId.id) && namedOrPhone.length === 0) {
    return byId;
  }
  return byId || ranked[0] || null;
}

export async function resolveDesignLead(opts: {
  leadId?: string | null;
  email?: string | null;
  phone?: string | null;
  pid?: string | null;
  name?: string | null;
}): Promise<DesignLead | null> {
  const queue = await getDesignLeadsQueue();
  const identityMatches = queue.filter((item) =>
    matchesLead(item, { email: opts.email, phone: opts.phone, pid: opts.pid, name: opts.name })
  );

  const directId = digits(opts.leadId);
  const byId =
    directId && directId.length >= 4
      ? queue.find((item) => String(item.id) === directId) || (await getDesignLeadById(directId))
      : null;

  const byCrm =
    !identityMatches.length && !byId && opts.leadId && digits(opts.leadId).length >= 4
      ? await getDesignLeadByCrmId(opts.leadId)
      : null;

  const chosen = pickDesignLead(identityMatches, byId, opts) || byCrm;
  if (!chosen?.id) return null;

  const detail = (await getDesignLeadById(chosen.id)) || chosen;
  const queued = queue.find((item) => item.id === chosen.id) || chosen;
  const completions =
    queued.taskCompletions && queued.taskCompletions.length
      ? queued.taskCompletions
      : await getDesignLeadCompletions(chosen.id);

  const staff = await getDesignerById(
    Number(detail.assigned_designer_id || queued.assigned_designer_id) || null
  );

  const currentMilestoneIndex = queued.currentMilestoneIndex ?? detail.currentMilestoneIndex;
  const currentMilestoneName =
    queued.currentMilestoneName || detail.currentMilestoneName || milestoneById(Number(currentMilestoneIndex ?? 0)).name;
  const currentMilestoneProgress = queued.currentMilestoneProgress ?? detail.currentMilestoneProgress ?? 0;

  console.info('[Design Module] tracker', {
    leadId: chosen.id,
    currentMilestoneIndex,
    currentMilestoneName,
    currentMilestoneProgress,
    taskCompletions: completions,
  });

  return {
    ...detail,
    ...queued,
    ...detail,
    currentMilestoneIndex,
    currentMilestoneName,
    currentMilestoneProgress,
    taskCompletions: completions,
    prolanceQuoteId: queued.prolanceQuoteId || detail.prolanceQuoteId,
    experienceSummary: queued.experienceSummary || detail.experienceSummary,
    designerName: staff?.name || detail.designerName || queued.designerName,
    designerEmail: staff?.email || detail.designerEmail || queued.designerEmail,
    designerRoleLabel: staff?.roleLabel || 'Interior Designer',
    designManagerName: detail.designManagerName || queued.designManagerName || staff?.leadName || undefined,
    designManagerEmail: detail.designManagerEmail || queued.designManagerEmail,
    salesExecutive: detail.salesExecutive || queued.salesExecutive,
  };
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

export async function getLatestQuoteLink(leadId: string | number) {
  const id = digits(leadId);
  if (!id) return null;
  const data = await designFetch<{
    ok?: boolean;
    quoteId?: number;
    customerQuoteUrl?: string;
    internalQuoteUrl?: string;
  }>(`/api/leads/${id}/latest-quote-link`);
  if (data?.quoteId || data?.customerQuoteUrl) return data;
  return null;
}

export async function getLeadQuoteVersions(leadId: string | number) {
  const id = digits(leadId);
  if (!id) return [];
  const data = await designFetch<unknown>(`/api/leads/${id}/prolance-quote-versions`);
  if (Array.isArray(data)) return data as Array<{ quoteId?: number; createdAt?: string }>;
  if (data && typeof data === 'object' && Array.isArray((data as { versions?: unknown[] }).versions)) {
    return (data as { versions: Array<{ quoteId?: number; createdAt?: string }> }).versions;
  }
  return [];
}

export async function getPublicQuote(quoteId: string | number) {
  const id = digits(quoteId);
  if (!id) return null;
  const live = await designFetch<Record<string, unknown>>(`/api/prolance-test/quotes/share/${id}?live=1`);
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

export function trackerStatus(currentVisualIndex: number, nodeVisualIndex: number): 'completed' | 'active' | 'upcoming' {
  if (nodeVisualIndex < currentVisualIndex) return 'completed';
  if (nodeVisualIndex === currentVisualIndex) return 'active';
  return 'upcoming';
}

export function trackerCompletionPercent(displayIndex: number, _progress = 0) {
  const clamped = Math.max(0, Math.min(7, displayIndex));
  return Math.round((clamped / DESIGN_TRACKER_MILESTONES.length) * 100);
}

export async function resolveQuoteForLead(lead: DesignLead) {
  const fromLink = await getLatestQuoteLink(lead.id);
  const quoteId =
    Number(fromLink?.quoteId) ||
    quoteIdFromDesignLead(lead) ||
    Number(lead.experienceSummary?.quoteId) ||
    null;
  const rawCustomer =
    fromLink?.customerQuoteUrl && !String(fromLink.customerQuoteUrl).includes('internal=1')
      ? String(fromLink.customerQuoteUrl)
      : undefined;
  const customerQuoteUrl = rawCustomer || (quoteId ? designQuoteUrl(quoteId) : undefined);
  const versions = quoteId ? await getPublicQuoteRevisions(quoteId) : await getLeadQuoteVersions(lead.id);
  const payload = quoteId ? await getPublicQuote(quoteId) : null;
  return { quoteId, customerQuoteUrl, versions, payload };
}
