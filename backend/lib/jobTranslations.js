const { translateText: translateViaGoogle } = require('../services/translation.service');

class JobTranslationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'JobTranslationError';
    this.cause = options.cause;
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

async function translateText(text, to) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return null;
  }

  return translateViaGoogle(normalizedText, to);
}

async function buildLocalizedJobFields({ title, description }) {
  const titleFr = normalizeText(title);
  const descriptionFr = normalizeText(description);

  if (!titleFr || !descriptionFr) {
    throw new JobTranslationError('Le titre et la description sont requis pour lancer la traduction.');
  }

  const [titleEn, descriptionEn] = await Promise.all([
    translateText(titleFr, 'en'),
    translateText(descriptionFr, 'en'),
  ]);

  return {
    titleFr,
    titleEn,
    descriptionFr,
    descriptionEn,
  };
}

module.exports = {
  JobTranslationError,
  buildLocalizedJobFields,
};