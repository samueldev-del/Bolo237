const { translateText: translateViaGoogle } = require("../services/translation.service");
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

function toOptionalText(text: string) {
  const cleaned = cleanText(text);
  return cleaned || null;
}

function detectLanguage(text: string): LocaleCode {
  const sample = String(text || "").toLowerCase();
  const frHints = (sample.match(/\b(le|la|les|des|une|pour|avec|offre|emploi|dossier|gestion)\b/g) || []).length;
  const enHints = (sample.match(/\b(the|and|with|job|role|business|manager|engineer|we\s+are\s+seeking)\b/g) || []).length;
  const accented = (sample.match(/[àâäéèêëîïôöùûüÿç]/g) || []).length;

  if (accented > 0 || frHints > enHints) return "fr";
  return "en";
}

async function translateText(text: string, from: string, to: LocaleCode): Promise<string | null> {
  const source = cleanText(text);
  if (!source) return null;

  const translated = await translateViaGoogle(source, to);
  return translated ? cleanText(translated) : null;
}

async function buildBilingualJobContent(input: {
  title: string;
  description: string;
  titleEn?: string | null;
  descriptionEn?: string | null;
  sourceLanguage?: LocaleCode;
}) {
  const rawTitle = cleanText(input.title);
  const rawDescription = cleanText(input.description);
  const providedTitleEn = toOptionalText(input.titleEn || '');
  const providedDescriptionEn = toOptionalText(input.descriptionEn || '');

  if (!rawTitle || !rawDescription) {
    throw new TranslationServiceError("Le titre et la description sont obligatoires.");
  }

  const sourceLanguage = input.sourceLanguage || detectLanguage(`${rawTitle}\n${rawDescription}`);

  let title_fr = "";
  let title_en: string | null = null;
  let description_fr = "";
  let description_en: string | null = null;

  if (sourceLanguage === "fr") {
    title_fr = normalizeFrenchTypography(rawTitle);
    description_fr = normalizeFrenchTypography(rawDescription);
    [title_en, description_en] = await Promise.all([
      providedTitleEn || translateText(rawTitle, "fr", "en"),
      providedDescriptionEn || translateText(rawDescription, "fr", "en"),
    ]);
  } else {
    title_en = providedTitleEn || rawTitle;
    description_en = providedDescriptionEn || rawDescription;

    const [translatedTitleFr, translatedDescriptionFr] = await Promise.all([
      translateText(rawTitle, "en", "fr"),
      translateText(rawDescription, "en", "fr"),
    ]);

    title_fr = normalizeFrenchTypography(translatedTitleFr || rawTitle);
    description_fr = normalizeFrenchTypography(translatedDescriptionFr || rawDescription);
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
  translateText,
};
