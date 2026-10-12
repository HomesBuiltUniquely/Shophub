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
    first_name: 'Varnika',
    last_name: 'Sharma',
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

  const [userCols] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM user LIKE 'lead_id'`);
  if (userCols.length === 0) {
    await pool.query(`ALTER TABLE user ADD COLUMN lead_id VARCHAR(64) NULL`);
  }

  for (const demo of DEMO_USERS) {
    const hash = await hashPassword(demo.password);
    const demoLeadId = demo.email === 'client@hubinterior.com' ? '1691' : null;
    await pool.query(
      `INSERT INTO user (
        uuid, email, password, first_name, last_name, role, brand_name, lead_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE role = VALUES(role), brand_name = VALUES(brand_name), lead_id = COALESCE(VALUES(lead_id), lead_id)`,
      [demo.uuid, demo.email, hash, demo.first_name, demo.last_name, demo.role, demo.brand_name, demoLeadId]
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
