import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

export type SavedOfferingItem = {
  prodId: string;
  offeringName: string;
  skuId?: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  room?: string;
};

export type SavedOfferingRow = SavedOfferingItem & {
  id: number;
  assignmentId: string;
  customerEmail: string;
  customerPhone: string;
  leadId: string;
  clientId: string;
  customerName: string;
  savedBy: string;
  createdAt: string;
};

function digits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function phoneTail(value?: string | null) {
  const d = digits(value);
  return d.length >= 10 ? d.slice(-10) : d;
}

async function ensureTable() {
  const pool = getHomesMerryDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_saved_offerings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      assignment_id VARCHAR(64) NOT NULL,
      customer_email VARCHAR(255) DEFAULT '',
      customer_phone VARCHAR(32) DEFAULT '',
      lead_id VARCHAR(64) DEFAULT '',
      client_id VARCHAR(64) DEFAULT '',
      customer_name VARCHAR(255) DEFAULT '',
      prod_id VARCHAR(64) NOT NULL,
      offering_name VARCHAR(255) NOT NULL,
      sku_id VARCHAR(128) DEFAULT '',
      category VARCHAR(128) DEFAULT '',
      unit_price DECIMAL(12,2) DEFAULT 0,
      quantity INT DEFAULT 1,
      image_url TEXT,
      room VARCHAR(128) DEFAULT '',
      saved_by VARCHAR(255) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (customer_email),
      INDEX idx_phone (customer_phone),
      INDEX idx_lead (lead_id)
    )
  `);
}

function mapRow(row: RowDataPacket): SavedOfferingRow {
  return {
    id: Number(row.id),
    assignmentId: String(row.assignment_id || ''),
    customerEmail: String(row.customer_email || ''),
    customerPhone: String(row.customer_phone || ''),
    leadId: String(row.lead_id || ''),
    clientId: String(row.client_id || ''),
    customerName: String(row.customer_name || ''),
    prodId: String(row.prod_id || ''),
    offeringName: String(row.offering_name || ''),
    skuId: String(row.sku_id || ''),
    category: String(row.category || ''),
    unitPrice: Number(row.unit_price || 0),
    quantity: Number(row.quantity || 1),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    room: String(row.room || ''),
    savedBy: String(row.saved_by || ''),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function replaceSavedOfferingsForClient(input: {
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  clientId?: string;
  customerName?: string;
  savedBy?: string;
  items: SavedOfferingItem[];
}) {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const email = String(input.customerEmail || '').trim().toLowerCase();
  const phone = phoneTail(input.customerPhone);
  const leadId = String(input.leadId || '').trim();
  const clientId = String(input.clientId || '').trim();
  const assignmentId = `asg-${Date.now()}`;

  const clauses: string[] = [];
  const params: string[] = [];
  if (email) {
    clauses.push('customer_email = ?');
    params.push(email);
  }
  if (phone) {
    clauses.push('customer_phone = ?');
    params.push(phone);
  }
  if (leadId) {
    clauses.push('lead_id = ?');
    params.push(leadId);
  }
  if (clientId) {
    clauses.push('client_id = ?');
    params.push(clientId);
  }
  if (clauses.length) {
    await pool.query(`DELETE FROM client_saved_offerings WHERE ${clauses.join(' OR ')}`, params);
  }

  for (const item of input.items) {
    await pool.query<ResultSetHeader>(
      `INSERT INTO client_saved_offerings
        (assignment_id, customer_email, customer_phone, lead_id, client_id, customer_name,
         prod_id, offering_name, sku_id, category, unit_price, quantity, image_url, room, saved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        email,
        phone,
        leadId,
        clientId,
        String(input.customerName || ''),
        String(item.prodId),
        item.offeringName,
        item.skuId || '',
        item.category || '',
        Number(item.unitPrice || 0),
        Number(item.quantity || 1),
        item.imageUrl || '',
        item.room || '',
        String(input.savedBy || ''),
      ]
    );
  }

  return { assignmentId, count: input.items.length };
}

export async function listSavedOfferingsForClient(identity: {
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  clientId?: string | null;
}) {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const email = String(identity.email || '').trim().toLowerCase();
  const phone = phoneTail(identity.phone);
  const leadId = String(identity.leadId || '').trim();
  const clientId = String(identity.clientId || '').replace(/^BLR-/i, '').trim();

  const clauses: string[] = [];
  const params: string[] = [];
  if (email) {
    clauses.push('customer_email = ?');
    params.push(email);
  }
  if (phone) {
    clauses.push('customer_phone = ?');
    params.push(phone);
  }
  if (leadId) {
    clauses.push('lead_id = ?');
    params.push(leadId);
  }
  if (clientId) {
    clauses.push('client_id = ? OR client_id = ? OR lead_id = ?');
    params.push(clientId, `BLR-${clientId}`, clientId);
  }
  if (!clauses.length) return [];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM client_saved_offerings WHERE ${clauses.join(' OR ')} ORDER BY created_at DESC, id DESC`
  );
  const seen = new Set<string>();
  const items: SavedOfferingRow[] = [];
  for (const row of rows) {
    const mapped = mapRow(row);
    if (seen.has(mapped.prodId)) continue;
    seen.add(mapped.prodId);
    items.push(mapped);
  }
  return items;
}
