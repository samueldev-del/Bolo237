// One-shot runner for audit-perf-indexes.sql via the existing pg client.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'audit-perf-indexes.sql'), 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const statements = sql
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      process.stdout.write(`→ ${stmt.slice(0, 80)}${stmt.length > 80 ? '…' : ''}\n`);
      await pool.query(stmt);
    }
    console.log('\n✅ Audit perf indexes applied.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
