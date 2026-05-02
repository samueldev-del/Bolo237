const { translate } = require('@vitalets/google-translate-api');

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
    return '';
  }

  try {
    const result = await translate(normalizedText, {
      from: 'fr',
      to,
    });

    return normalizeText(result.text);
  } catch (error) {
    throw new JobTranslationError(`Impossible de traduire le contenu vers ${to}.`, { cause: error });
  }
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