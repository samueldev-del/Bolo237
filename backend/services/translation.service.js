const { Translate } = require('@google-cloud/translate').v2;

let client = null;
let warnedMissingApiKey = false;

function normalizeText(value) {
  return String(value || '').trim();
}

function getClient() {
  const apiKey = normalizeText(process.env.GOOGLE_TRANSLATE_API_KEY);
  if (!apiKey) {
    if (!warnedMissingApiKey) {
      console.warn('[translation.service] GOOGLE_TRANSLATE_API_KEY is not defined; automatic translation is disabled.');
      warnedMissingApiKey = true;
    }
    return null;
  }

  if (!client) {
    client = new Translate({ key: apiKey });
  }

  return client;
}

async function translateText(text, targetLanguage = 'en') {
  const source = normalizeText(text);
  const target = normalizeText(targetLanguage) || 'en';
  if (!source) {
    return null;
  }

  const translateClient = getClient();
  if (!translateClient) {
    return null;
  }

  try {
    const [translation] = await translateClient.translate(source, target);
    const translatedText = Array.isArray(translation) ? translation[0] : translation;
    return normalizeText(translatedText) || null;
  } catch (error) {
    console.warn(
      `[translation.service] Google Translate request failed for target "${target}".`,
      error?.message || error,
    );
    return null;
  }
}

module.exports = {
  translateText,
};
