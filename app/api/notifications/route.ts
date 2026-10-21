import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import {
  NotificationCategory,
  NotificationItem,
  NotificationResponseData,
  NotificationRoleFilter,
} from '@/lib/types/notification.types';
import { getSessionFromRequest } from '@/lib/auth/account';
import type { RowDataPacket } from 'mysql2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return 'Just now';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

function getSectionLabel(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return 'OLDER';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'OLDER';
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffHours < 24) return 'TODAY';
  if (diffHours < 48) return 'YESTERDAY';
  return 'OLDER';
}

function normalizeRole(raw: string | null | undefined): NotificationRoleFilter {
  const r = String(raw || '').toLowerCase();
  if (r === 'admin' || r === 'super_admin') return 'admin';
  if (r.startsWith('enterprise')) return 'enterprise';
  return 'client';
}

// ---------------------------------------------------------------------------
// DB: load read notification IDs for a specific user
// ---------------------------------------------------------------------------

async function loadReadIds(userId: number): Promise<Set<string>> {
  const pool = getHomesMerryDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT notif_id FROM notification_reads WHERE user_id = ?',
    [userId],
  );
  return new Set((rows as RowDataPacket[]).map((r) => String(r.notif_id)));
}

// ---------------------------------------------------------------------------
// DB: mark one notification read for a user
// ---------------------------------------------------------------------------

async function markOneRead(userId: number, notifId: string): Promise<void> {
  const pool = getHomesMerryDbPool();
  await pool.query(
    'INSERT IGNORE INTO notification_reads (user_id, notif_id) VALUES (?, ?)',
    [userId, notifId],
  );
}

// ---------------------------------------------------------------------------
// DB: mark all supplied notification IDs read for a user
// ---------------------------------------------------------------------------

async function markAllRead(userId: number, notifIds: string[]): Promise<void> {
  if (notifIds.length === 0) return;
  const pool = getHomesMerryDbPool();
  const values = notifIds.map((id) => [userId, id]);
  await pool.query(
    'INSERT IGNORE INTO notification_reads (user_id, notif_id) VALUES ?',
    [values],
  );
}

// ---------------------------------------------------------------------------
// GET /api/notifications
// Query params:
//   category   – all | leads | milestones | payments | meetings | products  (default: all)
//   roleFilter – all | admin | enterprise | client               (default: all)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterCategory = (searchParams.get('category') || 'all').toLowerCase() as NotificationCategory;
    const filterRole     = (searchParams.get('roleFilter') || 'all').toLowerCase() as NotificationRoleFilter;

    // Identify the logged-in user so we can load their personal read state
    const session = getSessionFromRequest(request);
    const readIds = session ? await loadReadIds(session.id) : new Set<string>();

    const pool = getHomesMerryDbPool();
    const allNotifications: NotificationItem[] = [];

    // 1. User registrations → category: leads
    try {
      const [userRows] = await pool.query<RowDataPacket[]>(
        `SELECT uuid, first_name, last_name, email, role, created_at
         FROM user
         ORDER BY created_at DESC
         LIMIT 30`,
      );

      for (const u of userRows) {
        const id       = `user-${u.uuid || u.email}`;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User';
        const rawRole  = String(u.role || 'USER');
        const userRole = normalizeRole(rawRole);
        const date     = u.created_at ? new Date(u.created_at) : new Date();

        allNotifications.push({
          id,
          category: 'leads',
          userRole,
          title:     `${fullName}'s account was created successfully.`,
          subtitle:  `Full Name: ${fullName} · Role: ${rawRole.toUpperCase()} · ${u.email || ''}`,
          tag:       rawRole.toUpperCase(),
          timeAgo:   formatTimeAgo(date),
          section:   getSectionLabel(date),
          isRead:    readIds.has(id),
          timestamp: date.toISOString(),
          linkUrl:   '/settings',
        });
      }
    } catch (err: any) {
      console.warn('[notifications API] Could not fetch users:', err.message);
    }

    // 2. Products / offerings → category: products
    try {
      const [prodRows] = await pool.query<RowDataPacket[]>(
        `SELECT prod_id, offering_name, sku_id, category, offering_type,
                selling_price, current_stock, publishing_status, created_by,
                schedule_launch
         FROM product
         ORDER BY prod_id DESC
         LIMIT 30`,
      );

      const maxProdId = prodRows.length > 0 ? Number(prodRows[0].prod_id) : 1;

      for (const p of prodRows) {
        const id    = `prod-${p.prod_id}`;
        const name  = p.offering_name || `Offering #${p.prod_id}`;
        const sku   = p.sku_id ? ` (${p.sku_id})` : '';
        const price = Number(p.selling_price) ? ` · ₹${Number(p.selling_price).toLocaleString('en-IN')}` : '';
        const stock = p.current_stock != null ? ` · Stock: ${p.current_stock}` : '';

        let date: Date;
        if (p.schedule_launch) {
          date = new Date(p.schedule_launch);
        } else {
          const stepsOlder = maxProdId - Number(p.prod_id);
          date = new Date(Date.now() - stepsOlder * 5 * 60 * 1000);
        }

        allNotifications.push({
          id,
          category:  'products',
          userRole:  'enterprise',
          title:     `Offering "${name}"${sku} registered`,
          subtitle:  `Category: ${p.category || 'General'}${price}${stock} · Status: ${p.publishing_status || 'DRAFT'}`,
          tag:       String(p.offering_type || 'PRODUCT').toUpperCase(),
          timeAgo:   formatTimeAgo(date),
          section:   getSectionLabel(date),
          isRead:    readIds.has(id),
          timestamp: date.toISOString(),
          linkUrl:   `/offerings/detail?id=${p.prod_id}`,
        });
      }
    } catch (err: any) {
      console.warn('[notifications API] Could not fetch products:', err.message);
    }

    // 3. Leads → category: leads
    try {
      const [leadRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, lead_id, customer_name, lead_type, status, created_at
         FROM leads
         ORDER BY id DESC
         LIMIT 15`,
      );

      for (const l of leadRows) {
        const id   = `lead-${l.id || l.lead_id}`;
        const date = l.created_at ? new Date(l.created_at) : new Date();

        allNotifications.push({
          id,
          category:  'leads',
          userRole:  'client',
          title:     `Lead ${l.lead_id || l.id} updated — ${l.customer_name || 'Customer'}`,
          subtitle:  `Status: ${l.status || 'Active'} · Lead Type: ${l.lead_type || 'General'}`,
          tag:       String(l.lead_type || 'LEAD').toUpperCase(),
          timeAgo:   formatTimeAgo(date),
          section:   getSectionLabel(date),
          isRead:    readIds.has(id),
          timestamp: date.toISOString(),
          linkUrl:   '/crm/leads',
        });
      }
    } catch (err: any) {
      console.warn('[notifications API] Could not fetch leads:', err.message);
    }

    // ---------------------------------------------------------------------------
    // Counts (on full unfiltered set)
    // ---------------------------------------------------------------------------

    const unread = allNotifications.filter((n) => !n.isRead);

    const categoryCounts = {
      all:        unread.length,
      leads:      unread.filter((n) => n.category === 'leads').length,
      milestones: unread.filter((n) => n.category === 'milestones').length,
      payments:   unread.filter((n) => n.category === 'payments').length,
      meetings:   unread.filter((n) => n.category === 'meetings').length,
      products:   unread.filter((n) => n.category === 'products').length,
    };

    const roleCounts = {
      admin:      unread.filter((n) => n.userRole === 'admin').length,
      enterprise: unread.filter((n) => n.userRole === 'enterprise').length,
      client:     unread.filter((n) => n.userRole === 'client').length,
    };

    // ---------------------------------------------------------------------------
    // Apply filters
    // ---------------------------------------------------------------------------

    let filtered = allNotifications;
    if (filterCategory !== 'all') filtered = filtered.filter((n) => n.category === filterCategory);
    if (filterRole !== 'all')     filtered = filtered.filter((n) => n.userRole === filterRole);

    const response: NotificationResponseData = {
      unreadTotal: categoryCounts.all,
      categoryCounts,
      roleCounts,
      notifications: filtered,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /api/notifications GET]', error);
    return NextResponse.json(
      {
        unreadTotal: 0,
        categoryCounts: { all: 0, leads: 0, milestones: 0, payments: 0, meetings: 0, products: 0 },
        roleCounts: { admin: 0, enterprise: 0, client: 0 },
        notifications: [],
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/notifications  (mark read — persisted to DB)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body             = await request.json();
    const { action, id }   = body;

    if (action === 'mark_all_read') {
      // Collect all current notification IDs from the DB
      const pool = getHomesMerryDbPool();
      const allIds: string[] = [];
      try {
        const [users] = await pool.query<RowDataPacket[]>('SELECT uuid, email FROM user LIMIT 100');
        users.forEach((u) => allIds.push(`user-${u.uuid || u.email}`));
      } catch {}
      try {
        const [prods] = await pool.query<RowDataPacket[]>('SELECT prod_id FROM product LIMIT 100');
        prods.forEach((p) => allIds.push(`prod-${p.prod_id}`));
      } catch {}
      try {
        const [leads] = await pool.query<RowDataPacket[]>('SELECT id, lead_id FROM leads LIMIT 50');
        leads.forEach((l) => allIds.push(`lead-${l.id || l.lead_id}`));
      } catch {}

      await markAllRead(session.id, allIds);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (action === 'mark_read' && id) {
      await markOneRead(session.id, String(id));
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
