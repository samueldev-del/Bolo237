require('dotenv').config();

const { Client } = require('pg');

function collectPlanDetails(planNode) {
  const nodeTypes = new Set();
  const indexNames = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node['Node Type']) {
      nodeTypes.add(node['Node Type']);
    }

    if (node['Index Name']) {
      indexNames.add(node['Index Name']);
    }

    if (Array.isArray(node.Plans)) {
      node.Plans.forEach(walk);
    }
  }

  walk(planNode);

  return {
    nodeTypes: [...nodeTypes],
    indexes: [...indexNames],
  };
}

async function runExplain(client, sql, forceIndex = false) {
  if (forceIndex) {
    await client.query('BEGIN');
    await client.query('SET LOCAL enable_seqscan = off');
  }

  try {
    const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
    const payload = result.rows[0]['QUERY PLAN'][0];
    const details = collectPlanDetails(payload.Plan);

    return {
      ...details,
      executionMs: payload['Execution Time'],
      planningMs: payload['Planning Time'],
    };
  } finally {
    if (forceIndex) {
      await client.query('ROLLBACK');
    }
  }
}

function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function getFirstUsefulToken(value, fallback) {
  const token = String(value || '')
    .replace(/[@+()._-]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .find((part) => part.length >= 3);

  return token || fallback;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const countsResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM "Job")::int AS jobs,
        (SELECT COUNT(*) FROM "User")::int AS users,
        (SELECT COUNT(*) FROM "Notification")::int AS notifications,
        (SELECT COUNT(*) FROM "PrivacyRequest")::int AS privacy_requests
    `);
    const counts = countsResult.rows[0];

    const latestUserResult = await client.query(`
      SELECT id, name, email, phone, role
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);
    const latestNotificationResult = await client.query(`
      SELECT n.id, n.title, n.message, n.type, n."userId", u.name AS user_name, u.email AS user_email
      FROM "Notification" n
      LEFT JOIN "User" u ON u.id = n."userId"
      ORDER BY n."createdAt" DESC
      LIMIT 1
    `);

    const latestUser = latestUserResult.rows[0] || null;
    const latestNotification = latestNotificationResult.rows[0] || null;

    const report = {
      counts,
      skipped: [],
      plans: {},
    };

    if (latestUser) {
      const role = escapeLiteral(latestUser.role || 'ARTISAN');
      const userSearchToken = escapeLiteral(
        getFirstUsefulToken(latestUser.name || latestUser.email || latestUser.phone, 'Emy')
      );

      const usersSearchSql = `
        SELECT u.id, u.email, u.name, u.role, u."createdAt"
        FROM "User" u
        WHERE u.role = '${role}'
          AND (
            u.name ILIKE '%${userSearchToken}%'
            OR u.email ILIKE '%${userSearchToken}%'
            OR u.phone ILIKE '%${userSearchToken}%'
          )
        ORDER BY u."createdAt" DESC
        LIMIT 20 OFFSET 0
      `;

      report.plans.users_search_normal = await runExplain(client, usersSearchSql, false);
      report.plans.users_search_force_index = await runExplain(client, usersSearchSql, true);
    } else {
      report.skipped.push('users_search');
    }

    if (latestNotification) {
      const notificationSearchToken = escapeLiteral(
        getFirstUsefulToken(
          latestNotification.title || latestNotification.message || latestNotification.type,
          'account'
        )
      );

      const adminNotificationsSearchSql = `
        SELECT
          n.id,
          n."userId",
          n.type,
          n.title,
          n.message,
          n."createdAt",
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email
        FROM "Notification" n
        LEFT JOIN "User" u ON u.id = n."userId"
        WHERE (
          n.title ILIKE '%${notificationSearchToken}%'
          OR n.message ILIKE '%${notificationSearchToken}%'
          OR n.type ILIKE '%${notificationSearchToken}%'
          OR u.name ILIKE '%${notificationSearchToken}%'
          OR u.email ILIKE '%${notificationSearchToken}%'
        )
        ORDER BY n."createdAt" DESC
        LIMIT 20 OFFSET 0
      `;

      report.plans.admin_notifications_search_normal = await runExplain(client, adminNotificationsSearchSql, false);
      report.plans.admin_notifications_search_force_index = await runExplain(client, adminNotificationsSearchSql, true);
    } else {
      report.skipped.push('admin_notifications_search');
    }

    if (counts.jobs === 0) {
      report.skipped.push('jobs_routes_no_rows');
    }

    if (counts.privacy_requests === 0) {
      report.skipped.push('privacy_routes_no_rows');
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});