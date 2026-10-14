import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { hasIdentity, identitiesOverlap, offeringIdentityKeys, type OfferingIdentity } from '@/lib/client/offering-identity';

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
      identity_keys TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (customer_email),
      INDEX idx_phone (customer_phone),
      INDEX idx_lead (lead_id)
    )
  `);
  try {
    await pool.query('ALTER TABLE client_saved_offerings ADD COLUMN identity_keys TEXT');
  } catch {
    /* column already exists */
  }
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
  extra?: Array<string | number | null | undefined>;
  items: SavedOfferingItem[];
}) {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const email = String(input.customerEmail || '').trim().toLowerCase();
  const phone = phoneTail(input.customerPhone);
  const leadId = String(input.leadId || '').trim();
  const clientId = String(input.clientId || '').trim();
  const assignmentId = `asg-${Date.now()}`;
  const identityKeys = offeringIdentityKeys({
    email,
    phone,
    leadId,
    clientId,
    extra: input.extra,
  }).join('|');

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
         prod_id, offering_name, sku_id, category, unit_price, quantity, image_url, room, saved_by, identity_keys)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        identityKeys,
      ]
    );
  }

  return { assignmentId, count: input.items.length };
}

export async function listSavedOfferingsForClient(identity: OfferingIdentity) {
  if (!hasIdentity(identity)) return [];
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM client_saved_offerings ORDER BY created_at DESC, id DESC LIMIT 3000'
  );
  const seen = new Set<string>();
  const items: SavedOfferingRow[] = [];
  for (const row of rows) {
    const mapped = mapRow(row);
    if (
      !identitiesOverlap(identity, {
        email: mapped.customerEmail,
        phone: mapped.customerPhone,
        leadId: mapped.leadId,
        clientId: mapped.clientId,
        extra: String(row.identity_keys || '').split('|'),
      })
    ) {
      continue;
    }
    if (seen.has(mapped.prodId)) continue;
    seen.add(mapped.prodId);
    items.push(mapped);
  }
  return items;
}
