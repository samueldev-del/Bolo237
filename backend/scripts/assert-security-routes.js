const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
const jobsRouterPath = path.join(__dirname, '..', 'routes', 'jobs.js');
const adminRouterPath = path.join(__dirname, '..', 'routes', 'admin.js');
const serverSource = fs.readFileSync(serverPath, 'utf8');
const jobsSource = fs.readFileSync(jobsRouterPath, 'utf8');
const adminSource = fs.readFileSync(adminRouterPath, 'utf8');

function assertMatch(source, regex, description) {
  if (!regex.test(source)) {
    throw new Error(`Missing expected pattern: ${description}`);
  }
}

function assertNoMatch(source, regex, description) {
  if (regex.test(source)) {
    throw new Error(`Unexpected legacy pattern present: ${description}`);
  }
}

function getSchemaBlock(schemaName) {
  const escaped = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = serverSource.match(new RegExp(`const\\s+${escaped}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\);`));
  if (!match) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  return match[1];
}

assertMatch(serverSource, /app\.use\('\/api\/auth',\s*authRouter\);/, 'auth router delegation');
assertMatch(serverSource, /app\.use\('\/api\/otp',\s*otpRouter\);/, 'otp router delegation');
assertMatch(serverSource, /app\.use\('\/api\/jobs',\s*jobsRouter\);/, 'jobs router delegation');

assertMatch(
  serverSource,
  /app\.post\('\/api\/feedbacks',\s*requireUserSession,\s*feedbackSubmissionLimiter,\s*validateBody\(feedbackCreateBodySchema\)/,
  'feedback route requires authenticated session',
);

assertMatch(
  serverSource,
  /app\.post\('\/api\/users\/:id\/reviews',\s*requireUserSession,\s*reviewSubmissionLimiter,\s*validateParams\(reviewTargetParamSchema\),\s*validateBody\(reviewCreateBodySchema\)/,
  'review route requires authenticated session',
);

assertMatch(
  jobsSource,
  /router\.post\('\/',\s*requireUserSession,\s*jobCreationLimiter,\s*validateBody\(jobSchema\)/,
  'job creation limiter wired on active jobs router',
);

assertMatch(
  jobsSource,
  /router\.post\('\/:id\/apply',\s*requireUserSession,\s*jobApplicationLimiter,\s*withAvScan\(upload,\s*'cv'\),\s*validateApply/,
  'job application limiter wired on active jobs router',
);

assertMatch(
  jobsSource,
  /router\.get\('\/:id',\s*async \(req, res\) =>/,
  'job detail route defined in active jobs router',
);

assertMatch(
  adminSource,
  /router\.get\('\/jobs',\s*requireAdminSession,\s*async \(req, res\) =>/,
  'dedicated admin jobs listing route',
);

assertMatch(
  serverSource,
  /app\.post\('\/api\/upload',\s*requireUserSession,\s*uploadIpLimiter,\s*validateQuery\(uploadQuerySchema\),\s*upload\.single\('file'\)/,
  'upload route requires authenticated session',
);

assertMatch(
  serverSource,
  /app\.get\('\/uploads\/:folder\/:file',\s*handlePrivateUploadRequest\);/,
  'private upload handler mounted',
);

assertMatch(
  serverSource,
  /reviewer:\s*\{\s*select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\},?\s*\},?/,
  'public reviews hide reviewer email',
);

assertMatch(
  serverSource,
  /app\.get\('\/api\/candidates'[\s\S]*?profileVisible:\s*false/,
  'candidate listing excludes hidden profiles at query level',
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

assertNoMatch(serverSource, /app\.post\('\/api\/auth\/login'/, 'legacy auth login handler in server.js');
assertNoMatch(serverSource, /app\.get\('\/api\/auth\/me'/, 'legacy auth me handler in server.js');
assertNoMatch(serverSource, /app\.post\('\/api\/auth\/logout'/, 'legacy auth logout handler in server.js');
assertNoMatch(serverSource, /app\.post\('\/api\/otp\/send'/, 'legacy otp send handler in server.js');
assertNoMatch(serverSource, /app\.post\('\/api\/otp\/verify'/, 'legacy otp verify handler in server.js');
assertNoMatch(serverSource, /app\.get\('\/api\/jobs\/:id'/, 'legacy job detail handler in server.js');
assertNoMatch(serverSource, /app\.delete\(\s*'\/api\/jobs\/:id'/, 'legacy job delete handler in server.js');

console.log('Security route regression checks passed.');