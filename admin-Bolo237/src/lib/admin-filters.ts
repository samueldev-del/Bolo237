export function matchesTextQuery(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
}

export function matchesDateRange(value: string, startDate?: string, endDate?: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (startDate) {
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
    if (!Number.isNaN(startTimestamp) && timestamp < startTimestamp) {
      return false;
    }
  }

  if (endDate) {
    const endExclusive = new Date(`${endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const endTimestamp = endExclusive.getTime();

    if (!Number.isNaN(endTimestamp) && timestamp >= endTimestamp) {
      return false;
    }
  }

  return true;
}