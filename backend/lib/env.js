function getSampleRateFromEnv(name, fallbackValue) {
  const parsedValue = Number(process.env[name]);
  if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
    return parsedValue;
  }

  return fallbackValue;
}

function getPositiveIntegerEnv(name, fallbackValue) {
  const rawValue = Number(process.env[name]);
  if (Number.isFinite(rawValue) && rawValue > 0) {
    return Math.floor(rawValue);
  }

  return fallbackValue;
}

function parseCommaSeparatedValues(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  getSampleRateFromEnv,
  getPositiveIntegerEnv,
  parseCommaSeparatedValues,
  isProduction,
};
