const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
const source = fs.readFileSync(serverPath, 'utf8');

function assertMatch(regex, description) {
  if (!regex.test(source)) {
    throw new Error(`Missing expected pattern: ${description}`);
  }
}

function assertNoMatch(regex, description) {
  if (regex.test(source)) {
    throw new Error(`Unexpected legacy pattern present: ${description}`);
  }
}

function getSchemaBlock(schemaName) {
  const escaped = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`const\\s+${escaped}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\);`));
  if (!match) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  return match[1];
}

assertMatch(/app\.use\('\/api\/auth',\s*authRouter\);/, 'auth router delegation');
assertMatch(/app\.use\('\/api\/otp',\s*otpRouter\);/, 'otp router delegation');

assertMatch(
  /app\.post\('\/api\/feedbacks',\s*requireUserSession,\s*feedbackSubmissionLimiter,\s*validateBody\(feedbackCreateBodySchema\)/,
  'feedback route requires authenticated session',
);

assertMatch(
  /app\.post\('\/api\/users\/:id\/reviews',\s*requireUserSession,\s*reviewSubmissionLimiter,\s*validateParams\(reviewTargetParamSchema\),\s*validateBody\(reviewCreateBodySchema\)/,
  'review route requires authenticated session',
);

const reviewSchemaBlock = getSchemaBlock('reviewCreateBodySchema');
const feedbackSchemaBlock = getSchemaBlock('feedbackCreateBodySchema');

if (/\breviewerId\s*:/.test(reviewSchemaBlock)) {
  throw new Error('Unexpected legacy pattern present: reviewerId in review schema');
}

if (/\buserId\s*:/.test(feedbackSchemaBlock)) {
  throw new Error('Unexpected legacy pattern present: userId in feedback schema');
}

if (/\bauthorName\s*:/.test(feedbackSchemaBlock)) {
  throw new Error('Unexpected legacy pattern present: authorName in feedback schema');
}

assertNoMatch(/app\.post\('\/api\/auth\/login'/, 'legacy auth login handler in server.js');
assertNoMatch(/app\.get\('\/api\/auth\/me'/, 'legacy auth me handler in server.js');
assertNoMatch(/app\.post\('\/api\/auth\/logout'/, 'legacy auth logout handler in server.js');
assertNoMatch(/app\.post\('\/api\/otp\/send'/, 'legacy otp send handler in server.js');
assertNoMatch(/app\.post\('\/api\/otp\/verify'/, 'legacy otp verify handler in server.js');

console.log('Security route regression checks passed.');