export interface ClientProfile {
  name: string;
  clientId: string;
  projectCode?: string;
  avatarUrl: string;
  projectGreeting: string;
  propertyType?: string;
  propertyDetails?: string;
  leadId?: string;
  phone?: string;
  email?: string;
  memberTier?: string;
}

export interface ProjectMetric {
  title: string;
  value: string;
  type: 'stage' | 'completion' | 'milestone' | 'payment';
  percentage?: number;
  icon?: string;
  subtext?: string;
  badge?: string;
}

export type JourneyStepStatus = 'completed' | 'in_progress' | 'next' | 'pending';

export type JourneyStepIcon =
  | 'booking'
  | 'measurement'
  | 'dqc1'
  | 'payment_10'
  | 'masking'
  | 'dqc2'
  | 'payment_40'
  | 'production'
  | 'design'
  | 'installation'
  | 'qc'
  | 'handover'
  | 'warranty';

export interface JourneyStep {
  id: number;
  name: string;
  dateOrStatus: string;
  status: JourneyStepStatus;
  icon: JourneyStepIcon;
}

export interface UpcomingActionItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'quote' | 'material' | 'payment' | 'appointment';
  href?: string;
  actionText?: string;
  isExternal?: boolean;
}

export interface ActionCardItem {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  variant: 'black' | 'white' | 'red';
  icon: 'catalog' | 'inspiration' | 'payment' | 'referral';
}

export interface AssignedTeamMember {
  role: 'Relationship Manager' | 'Lead Designer' | 'Project Coordinator';
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export interface AssignedTeam {
  relationshipManager?: AssignedTeamMember;
  designer?: AssignedTeamMember;
}

export interface MilestonePaymentSummaryData {
  quoteNum: string;
  quoteId?: number | null;
  quoteUrl?: string;
  totalQuotationValue: number;
  totalQuotationValueFormatted: string;
  cumulativeTarget: number;
  cumulativeTargetFormatted: string;
  cumulativePercentLabel: string;
  alreadyPaid: number;
  alreadyPaidFormatted: string;
  amountToCollectNow: number;
  amountToCollectNowFormatted: string;
  remainingBalance: number;
  remainingBalanceFormatted: string;
  stageNote: string;
}

export interface ClientDashboardData {
  profile: ClientProfile;
  metrics: ProjectMetric[];
  journeySteps: JourneyStep[];
  upcomingActions: UpcomingActionItem[];
  actionCards: ActionCardItem[];
  team: AssignedTeam;
  paymentSummary: MilestonePaymentSummaryData;
  isLiveBackend: boolean;
  leadId: string;
  lastUpdated: string;
}

export interface ProjectReadinessItem {
  name: string;
  percentage: number;
  subtext: string;
  isComplete?: boolean;
}

export interface SitePhotoItem {
  id: string;
  title: string;
  caption?: string;
  date?: string;
  imageUrl: string;
  isFeatured?: boolean;
  roomName?: string;
  priceFormatted?: string;
}

export interface ProjectTimelineMilestone {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
  estCompletion?: string;
}

export interface ProjectTeamContact {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  avatarUrl: string;
  actionType: 'email' | 'call' | 'chat';
}

export interface LatestDesignRevision {
  fileName: string;
  fileSize: string;
  updatedText: string;
  downloadUrl: string;
}

export interface ProjectPageData {
  projectId: string;
  clientName: string;
  propertyTitle: string;
  currentPhaseTitle: string;
  overallProgressPercentage: number;
  sitePhotos: SitePhotoItem[];
  readinessItems: ProjectReadinessItem[];
  nextBigStep: {
    title: string;
    startDate: string;
  };
  timelineMilestones: ProjectTimelineMilestone[];
  teamContacts: ProjectTeamContact[];
  latestRevision: LatestDesignRevision;
  isLiveBackend: boolean;
  lastUpdated: string;
}

// Quotation Page Data Types
export interface QuotationSummaryItem {
  id: string;
  quoteNumber: string;
  dateIssued: string;
  revision: string;
  status: 'Pending Approval' | 'Approved' | 'Expired' | 'Superseded';
  totalAmount: number;
  totalAmountFormatted: string;
  isLatest?: boolean;
  quoteUrl?: string;
  pdfUrl?: string;
}

export interface QuoteRoomItem {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  category?: string;
  description?: string;
}

export interface QuoteRoomSection {
  id: string;
  roomName: string;
  icon: 'living' | 'kitchen' | 'bedroom' | 'dining' | 'other';
  totalAmount: number;
  totalAmountFormatted: string;
  items: QuoteRoomItem[];
  defaultExpanded?: boolean;
}

export interface QuotationFinancialSummary {
  subtotal: number;
  subtotalFormatted: string;
  taxPercent: number;
  taxAmount: number;
  taxAmountFormatted: string;
  totalAmount: number;
  totalAmountFormatted: string;
  note: string;
}

export interface QuotationKeyChange {
  id: string;
  type: 'add' | 'remove' | 'upgrade';
  title: string;
  subtitle: string;
}

export interface QuotationRevisionComparison {
  comparedWith: string;
  priceVariance: number;
  priceVarianceFormatted: string;
  isIncrease: boolean;
  keyChanges: QuotationKeyChange[];
}

export interface ActiveQuoteDetail {
  id: string;
  quoteNumber: string;
  revision: string;
  revisionLabel: string;
  status: 'Pending Approval' | 'Approved' | 'Expired' | 'Superseded';
  validUntil: string;
  validityNote: string;
  pdfUrl?: string;
  quoteUrl?: string;
  rooms: QuoteRoomSection[];
  financialSummary: QuotationFinancialSummary;
  revisionComparison: QuotationRevisionComparison;
}

export interface QuotationsPageData {
  recentQuotations: QuotationSummaryItem[];
  activeQuote: ActiveQuoteDetail;
  isLiveBackend: boolean;
  lastUpdated: string;
}



