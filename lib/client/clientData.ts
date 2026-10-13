import {
  ClientProfile,
  ProjectMetric,
  JourneyStep,
  UpcomingActionItem,
  ActionCardItem,
  MilestonePaymentSummaryData,
} from './types';

export const CLIENT_PROFILE: ClientProfile = {
  name: 'Client',
  clientId: 'BLR-CLIENT',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  projectGreeting: 'Your home is progressing beautifully. Check out the detailed progress',
  propertyType: '3 BHK Apartment',
  propertyDetails: 'Bangalore • 560001',
  leadId: '',
  phone: '',
  email: '',
  memberTier: 'Premium Member',
};

export const DEFAULT_PAYMENT_SUMMARY: MilestonePaymentSummaryData = {
  quoteNum: 'Q-PROJ-001',
  quoteId: null,
  quoteUrl: undefined,
  totalQuotationValue: 0,
  totalQuotationValueFormatted: '₹0',
  cumulativeTarget: 0,
  cumulativeTargetFormatted: '₹0',
  cumulativePercentLabel: 'Initial Booking Stage',
  alreadyPaid: 0,
  alreadyPaidFormatted: '₹0',
  amountToCollectNow: 0,
  amountToCollectNowFormatted: '₹0',
  remainingBalance: 0,
  remainingBalanceFormatted: '₹0',
  stageNote: 'Initial booking token confirmed. Design consultation and site measurement in progress.',
};

export const CLIENT_METRICS: ProjectMetric[] = [
  {
    title: 'CURRENT STAGE',
    value: 'PUSH TO PRODUCTION',
    type: 'stage',
  },
  {
    title: 'COMPLETION',
    value: '72%',
    percentage: 72,
    type: 'completion',
  },
  {
    title: 'NEXT MILESTONE',
    value: 'FACTORY DISPATCH',
    type: 'milestone',
  },
  {
    title: 'PENDING PAYMENT',
    value: '₹2,14,080',
    subtext: 'Paid: ₹3,21,119',
    type: 'payment',
  },
];

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 1,
    name: 'BOOKING',
    dateOrStatus: 'JULY 15',
    status: 'completed',
    icon: 'booking',
  },
  {
    id: 2,
    name: 'D1 SITE MEASUREMENT',
    dateOrStatus: 'JULY 20',
    status: 'completed',
    icon: 'measurement',
  },
  {
    id: 3,
    name: 'DQC1',
    dateOrStatus: 'AUG 11',
    status: 'completed',
    icon: 'dqc1',
  },
  {
    id: 4,
    name: '10% PAYMENT',
    dateOrStatus: 'AUG 13',
    status: 'completed',
    icon: 'payment_10',
  },
  {
    id: 5,
    name: 'D2 SITE MASKING',
    dateOrStatus: 'AUG 27',
    status: 'completed',
    icon: 'masking',
  },
  {
    id: 6,
    name: 'DQC2',
    dateOrStatus: 'SEPT 12',
    status: 'completed',
    icon: 'dqc2',
  },
  {
    id: 7,
    name: '40% PAYMENT',
    dateOrStatus: 'SEPT 16',
    status: 'completed',
    icon: 'payment_40',
  },
  {
    id: 8,
    name: 'PUSH TO PRODUCTION',
    dateOrStatus: 'IN PROGRESS',
    status: 'in_progress',
    icon: 'production',
  },
];

export const UPCOMING_ACTIONS: UpcomingActionItem[] = [
  {
    id: 'act-1',
    title: 'Review Latest Quote',
    subtitle: 'V3 revised for living room cabinetry.',
    type: 'quote',
  },
  {
    id: 'act-2',
    title: 'Approve Materials',
    subtitle: '3 items awaiting selection for ensuite.',
    type: 'material',
  },
  {
    id: 'act-3',
    title: 'Milestone Payment',
    subtitle: 'Due: Oct 25 | $1,250.00',
    type: 'payment',
  },
];

export const ACTION_CARDS: ActionCardItem[] = [
  {
    id: 'card-catalog',
    title: 'Explore Latest Products',
    description: 'Browse our newest collections and add premium finishes to your project quote.',
    buttonText: 'EXPLORE CATALOG',
    href: '/client/offerings',
    variant: 'black',
    icon: 'catalog',
  },
  {
    id: 'card-inspiration',
    title: 'Design Inspirations',
    description: 'Curated boards for your vision.',
    buttonText: 'GET INSPIRED',
    href: '/client/design-inspirations',
    variant: 'white',
    icon: 'inspiration',
  },
  {
    id: 'card-payment',
    title: 'Pay Installment',
    description: 'Review and pay your next project milestone payment securely.',
    buttonText: 'PAY NOW',
    href: '/client/payments',
    variant: 'white',
    icon: 'payment',
  },
  {
    id: 'card-referral',
    title: 'Refer & Earn',
    description: 'Earn $1,000 for every friend who starts a project with HUB.',
    buttonText: 'VIEW EARNINGS',
    href: '/client/referrals',
    variant: 'red',
    icon: 'referral',
  },
];

export interface ClientNavItem {
  name: string;
  href: string;
  iconId: string;
}

export const CLIENT_NAV_ITEMS: ClientNavItem[] = [
  { name: 'Home', href: '/client', iconId: 'home' },
  { name: 'My Project', href: '/client/my-project', iconId: 'my-project' },
  { name: 'Quotations', href: '/client/quotations', iconId: 'quotations' },
  { name: 'Offerings', href: '/client/offerings', iconId: 'offerings' },
  { name: 'Payments', href: '/client/payments', iconId: 'payments' },
  { name: 'Invoices', href: '/client/invoices', iconId: 'invoices' },
  { name: 'Agreements', href: '/client/agreements', iconId: 'agreements' },
  { name: 'Warranty', href: '/client/warranty', iconId: 'warranty' },
  { name: 'Support Tickets', href: '/client/support-tickets', iconId: 'support-tickets' },
  { name: 'Design Inspirations', href: '/client/design-inspirations', iconId: 'design-inspirations' },
  { name: 'Referrals', href: '/client/referrals', iconId: 'referrals' },
  { name: 'Documents', href: '/client/documents', iconId: 'documents' },
  { name: 'Profile & Settings', href: '/client/settings', iconId: 'settings' },
];
