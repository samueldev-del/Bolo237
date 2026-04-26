function parseDateOnlyFilter(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDateRangeFilter(fieldName, startDate, endDate) {
  const range = {};

  if (startDate) {
    range.gte = startDate;
  }

  if (endDate) {
    const nextDay = new Date(endDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    range.lt = nextDay;
  }

  return Object.keys(range).length > 0 ? { [fieldName]: range } : {};
}

function buildDateBuckets(days) {
  const labels = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(d);
  }

  return labels;
}

function toDayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(date, locale = 'fr-FR') {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

function parsePositiveInt(value) {
  const parsed = parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

module.exports = {
  parseDateOnlyFilter,
  buildDateRangeFilter,
  buildDateBuckets,
  toDayKey,
  formatShortDate,
  parsePositiveInt,
};
