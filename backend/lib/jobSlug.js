function normalizeSegment(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeReference(reference) {
  return String(reference || "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function generateSlug(title, location, reference) {
  return [normalizeSegment(title), normalizeSegment(location), normalizeReference(reference)]
    .filter(Boolean)
    .join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = {
  generateSlug,
};