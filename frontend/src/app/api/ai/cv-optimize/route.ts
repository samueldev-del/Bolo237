import { NextResponse } from 'next/server';

type CvInput = {
  fullName: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  profile: string;
  experience: string;
  education: string;
  skillsText: string;
  languagesText: string;
};

type OptimizePayload = {
  language: 'FR' | 'EN';
  role: 'candidate' | 'company' | 'artisan';
  cvData: CvInput;
  companyContext?: {
    companyName?: string;
    sector?: string;
    city?: string;
  };
};

function sanitizeText(value: string): string {
  return String(value || '').slice(0, 4000);
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}

async function callGemini(payload: OptimizePayload, apiKey: string): Promise<CvInput> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemInstruction = payload.language === 'EN'
    ? 'You are a professional CV writer. Return ONLY valid JSON with improved content while preserving factual information. Never invent jobs, degrees, dates, or certifications.'
    : 'Tu es un redacteur professionnel de CV. Retourne UNIQUEMENT du JSON valide avec un contenu optimise en preservant les faits. N invente jamais experiences, diplomes, dates ou certifications.';

  const userPrompt = {
    task: payload.language === 'EN' ? 'Optimize this CV for clarity and impact.' : 'Optimise ce CV pour la clarte et l impact.',
    constraints: payload.language === 'EN'
      ? [
          'Keep the same JSON keys.',
          'Do not add markdown.',
          'Do not hallucinate missing facts.',
          'Keep a concise and credible style for Cameroon market.',
        ]
      : [
          'Conserve exactement les memes cles JSON.',
          'N ajoute pas de markdown.',
          'N invente pas des faits manquants.',
          'Style concis, credible et adapte au marche camerounais.',
        ],
    role: payload.role,
    companyContext: payload.companyContext || {},
    input: {
      ...payload.cvData,
      fullName: sanitizeText(payload.cvData.fullName),
      title: sanitizeText(payload.cvData.title),
      location: sanitizeText(payload.cvData.location),
      phone: sanitizeText(payload.cvData.phone),
      email: sanitizeText(payload.cvData.email),
      profile: sanitizeText(payload.cvData.profile),
      experience: sanitizeText(payload.cvData.experience),
      education: sanitizeText(payload.cvData.education),
      skillsText: sanitizeText(payload.cvData.skillsText),
      languagesText: sanitizeText(payload.cvData.languagesText),
    },
    outputShape: {
      fullName: 'string',
      title: 'string',
      location: 'string',
      phone: 'string',
      email: 'string',
      profile: 'string',
      experience: 'string',
      education: 'string',
      skillsText: 'string',
      languagesText: 'string',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(userPrompt) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const details = await res.text().catch(() => 'Gemini request failed');
    throw new Error(`Gemini error: ${details.slice(0, 250)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = JSON.parse(extractJsonBlock(text)) as Partial<CvInput>;

  return {
    fullName: String(parsed.fullName || payload.cvData.fullName || ''),
    title: String(parsed.title || payload.cvData.title || ''),
    location: String(parsed.location || payload.cvData.location || ''),
    phone: String(parsed.phone || payload.cvData.phone || ''),
    email: String(parsed.email || payload.cvData.email || ''),
    profile: String(parsed.profile || payload.cvData.profile || ''),
    experience: String(parsed.experience || payload.cvData.experience || ''),
    education: String(parsed.education || payload.cvData.education || ''),
    skillsText: String(parsed.skillsText || payload.cvData.skillsText || ''),
    languagesText: String(parsed.languagesText || payload.cvData.languagesText || ''),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OptimizePayload;

    if (!body?.cvData?.fullName && !body?.cvData?.title && !body?.cvData?.profile) {
      return NextResponse.json(
        { success: false, message: 'Ajoutez du contenu CV avant optimisation.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Configuration IA manquante (GEMINI_API_KEY).' },
        { status: 500 }
      );
    }

    const optimized = await callGemini(body, apiKey);

    return NextResponse.json({
      success: true,
      message: 'Optimisation terminee.',
      optimized,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur IA.';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
