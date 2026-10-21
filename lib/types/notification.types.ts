export type NotificationCategory = 'all' | 'leads' | 'milestones' | 'payments' | 'meetings' | 'products';

export type NotificationRoleFilter = 'all' | 'admin' | 'enterprise' | 'client';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  /** The user role this notification belongs to (derived from DB role column) */
  userRole: NotificationRoleFilter;
  title: string;
  subtitle: string;
  tag: string;
  timeAgo: string;
  section: string; // e.g. 'TODAY', 'YESTERDAY', 'OLDER'
  isRead: boolean;
  timestamp: string;
  linkUrl?: string;
}

export interface NotificationResponseData {
  unreadTotal: number;
  categoryCounts: {
    all: number;
    leads: number;
    milestones: number;
    payments: number;
    meetings: number;
    products: number;
  };
  roleCounts: {
    admin: number;
    enterprise: number;
    client: number;
  };
  notifications: NotificationItem[];
}
