const NBSP = "\u00A0";
const NNBSP = "\u202F";

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0\u202F]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeApostrophes(text) {
  return text.replace(/'/g, "’");
}

function normalizeFrenchPunctuationSpacing(text) {
  return text
    .replace(/\s*:/g, `${NBSP}:`)
    .replace(/\s*;/g, `${NNBSP};`)
    .replace(/\s*!/g, `${NNBSP}!`)
    .replace(/\s*\?/g, `${NNBSP}?`);
}

function normalizeUppercaseAccents(text) {
  return text
    .replace(/\bA\s+l[’']avenir\b/g, "À l’avenir")
    .replace(/\bA\s+l[’']/g, "À l’")
    .replace(/\bA\s+/g, "À ")
    .replace(/\bE\s+([a-zàâäéèêëîïôöùûüÿç])/gi, "É $1");
}

function normalizeFrenchTypography(text) {
  const compact = normalizeWhitespace(text);
  const apostrophes = normalizeApostrophes(compact);
  const punctuation = normalizeFrenchPunctuationSpacing(apostrophes);
  return normalizeUppercaseAccents(punctuation);
}

function normalizeBulletLists(text) {
  return String(text || "")
    .replace(/^\s*[•●▪◦]\s*/gm, "- ")
    .replace(/^\s*[-*]\s*/gm, "- ")
    .replace(/^\s*([0-9]+)[\.)]\s*/gm, "$1. ");
}

module.exports = {
  normalizeFrenchTypography,
  normalizeBulletLists,
  normalizeWhitespace,
};
