import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

let ensured = false;

export async function ensureFeedbackSchema() {
  if (ensured) return;
  const pool = getHomesMerryDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prod_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      sku_id VARCHAR(64) NULL,
      enterprise_id BIGINT NULL,
      enterprise_name VARCHAR(150) NOT NULL,
      client_id BIGINT NOT NULL,
      client_name VARCHAR(150) NOT NULL,
      client_email VARCHAR(191) NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT NOT NULL,
      purchase_ref VARCHAR(100) NULL,
      is_visible BOOLEAN NOT NULL DEFAULT FALSE,
      toggled_by BIGINT NULL,
      toggled_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_feedback_lookup (prod_id, is_visible),
      INDEX idx_feedback_client (client_id, prod_id),
      INDEX idx_feedback_enterprise (enterprise_name, is_visible)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  ensured = true;
}
