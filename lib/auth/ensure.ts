import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { hashPassword } from './password';
import type { RowDataPacket } from 'mysql2';

let ensured = false;

const DEMO_USERS = [
  {
    uuid: 100,
    email: 'admin@hubinterior.com',
    password: 'Admin@123',
    first_name: 'ShopHub',
    last_name: 'Admin',
    role: 'ADMIN',
    brand_name: 'Hub Interior',
  },
  {
    uuid: 101,
    email: 'enterprise@hubinterior.com',
    password: 'Enterprise@123',
    first_name: 'Aarav',
    last_name: 'Mehta',
    role: 'ENTERPRISE',
    brand_name: 'Hub Homes',
  },
  {
    uuid: 102,
    email: 'client@hubinterior.com',
    password: 'Client@123',
    first_name: 'Client',
    last_name: 'User',
    role: 'INTERIOR_CLIENT',
    brand_name: '',
  },
];

export async function ensureAuthSchema() {
  if (ensured) return;
  const pool = getHomesMerryDbPool();

  const [cols] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM product LIKE 'created_by'`);
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE product ADD COLUMN created_by BIGINT NULL`);
  }

  const [approvalCols] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM product LIKE 'approval_status'`);
  if (approvalCols.length === 0) {
    try {
      await pool.query(`ALTER TABLE product ADD COLUMN approval_status VARCHAR(32) DEFAULT 'APPROVED'`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  const [rejectCols] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM product LIKE 'rejection_reason'`);
  if (rejectCols.length === 0) {
    try {
      await pool.query(`ALTER TABLE product ADD COLUMN rejection_reason TEXT NULL`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  const [userCols] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM user LIKE 'lead_id'`);
  if (userCols.length === 0) {
    try {
      await pool.query(`ALTER TABLE user ADD COLUMN lead_id VARCHAR(64) NULL`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  for (const demo of DEMO_USERS) {
    const hash = await hashPassword(demo.password);
    await pool.query(
      `INSERT INTO user (
        uuid, email, password, first_name, last_name, role, brand_name, lead_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NOW())
      ON DUPLICATE KEY UPDATE role = VALUES(role), brand_name = VALUES(brand_name), first_name = VALUES(first_name), last_name = VALUES(last_name)`,
      [demo.uuid, demo.email, hash, demo.first_name, demo.last_name, demo.role, demo.brand_name]
    );
    await pool.query(
      `INSERT INTO login (username, password, role, logintime)
       SELECT ?, ?, ?, NOW() FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM login WHERE username = ?)`,
      [demo.email, hash, demo.role, demo.email]
    );
  }

  ensured = true;
}
