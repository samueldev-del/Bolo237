const path = require('path');
const dotenv = require('dotenv');

function loadBackendScriptEnv() {
  const explicitEnv = new Map(Object.entries(process.env));

  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

  for (const [key, value] of explicitEnv.entries()) {
    process.env[key] = value;
  }
}

module.exports = { loadBackendScriptEnv };