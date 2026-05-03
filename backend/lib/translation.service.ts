const { translate } = require("@vitalets/google-translate-api");
const {
  normalizeFrenchTypography,
  normalizeBulletLists,
  normalizeWhitespace,
} = require("./frenchTypography");

type LocaleCode = "fr" | "en";

class TranslationServiceError extends Error {
  cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = "TranslationServiceError";
    this.cause = options.cause;
  }
}

function cleanText(text: string) {
  return normalizeBulletLists(normalizeWhitespace(String(text || "")));
}

function detectLanguage(text: string): LocaleCode {
  const sample = String(text || "").toLowerCase();
  const frHints = (sample.match(/\b(le|la|les|des|une|pour|avec|offre|emploi|dossier|gestion)\b/g) || []).length;
  const enHints = (sample.match(/\b(the|and|with|job|role|business|manager|engineer|we\s+are\s+seeking)\b/g) || []).length;
  const accented = (sample.match(/[àâäéèêëîïôöùûüÿç]/g) || []).length;

  if (accented > 0 || frHints > enHints) return "fr";
  return "en";
}

async function translateText(text: string, from: string, to: LocaleCode) {
  const source = cleanText(text);
  if (!source) return "";

  try {
    const result = await translate(source, { from, to });
    return cleanText(result.text);
  } catch (error) {
    throw new TranslationServiceError(`Traduction impossible vers ${to}.`, { cause: error });
  }
}

async function buildBilingualJobContent(input: {
  title: string;
  description: string;
  sourceLanguage?: LocaleCode;
}) {
  const rawTitle = cleanText(input.title);
  const rawDescription = cleanText(input.description);

  if (!rawTitle || !rawDescription) {
    throw new TranslationServiceError("Le titre et la description sont obligatoires.");
  }

  const sourceLanguage = input.sourceLanguage || detectLanguage(`${rawTitle}\n${rawDescription}`);

  let title_fr = "";
  let title_en = "";
  let description_fr = "";
  let description_en = "";

  if (sourceLanguage === "fr") {
    title_fr = normalizeFrenchTypography(rawTitle);
    description_fr = normalizeFrenchTypography(rawDescription);
    title_en = await translateText(rawTitle, "fr", "en");
    description_en = await translateText(rawDescription, "fr", "en");
  } else {
    title_en = rawTitle;
    description_en = rawDescription;
    title_fr = normalizeFrenchTypography(await translateText(rawTitle, "en", "fr"));
    description_fr = normalizeFrenchTypography(await translateText(rawDescription, "en", "fr"));
  }

  return {
    sourceLanguage,
    title_fr,
    title_en,
    description_fr,
    description_en,
    // Backward-compatible fields already used in the app.
    titleFr: title_fr,
    titleEn: title_en,
    descriptionFr: description_fr,
    descriptionEn: description_en,
  };
}

module.exports = {
  TranslationServiceError,
  buildBilingualJobContent,
  detectLanguage,
};
