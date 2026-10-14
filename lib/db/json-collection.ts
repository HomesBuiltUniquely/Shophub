import type { RowDataPacket } from 'mysql2';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

async function ensureTable() {
  const pool = getHomesMerryDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS json_collections (
      collection VARCHAR(64) NOT NULL,
      id VARCHAR(64) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection, id),
      INDEX idx_created (created_at)
    )
  `);
}

function parsePayload<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

export async function readJsonCollection<T extends { id?: string }>(collection: string): Promise<T[]> {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, payload FROM json_collections WHERE collection = ? ORDER BY created_at DESC',
    [collection]
  );
  const items: T[] = [];
  for (const row of rows) {
    const payload = parsePayload<T>(row.payload);
    if (payload) items.push({ ...payload, id: String(row.id) });
  }
  return items;
}

export async function writeJsonCollection<T extends { id: string }>(collection: string, rows: T[]) {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM json_collections WHERE collection = ?', [collection]);
    for (const row of rows) {
      await conn.query(
        'INSERT INTO json_collections (collection, id, payload, created_at) VALUES (?, ?, ?, ?)',
        [collection, row.id, JSON.stringify(row), (row as { createdAt?: string }).createdAt || new Date()]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function upsertJsonRecord<T extends { id: string }>(collection: string, row: T) {
  await ensureTable();
  const pool = getHomesMerryDbPool();
  await pool.query(
    `INSERT INTO json_collections (collection, id, payload, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [collection, row.id, JSON.stringify(row), (row as { createdAt?: string }).createdAt || new Date()]
  );
}
