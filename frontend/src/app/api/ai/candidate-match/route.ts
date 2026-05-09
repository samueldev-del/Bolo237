import { NextResponse } from 'next/server';
import {
  PROMPT_INJECTION_GUARD,
  checkAiRateLimit,
  rateLimitResponse,
  wrapUserContent,
} from '../_lib/guard';

type JobInput = {
  title: string;
  description: string;
  location?: string;
  contract?: string;
  salary?: string;
};

type CandidateInput = {
  candidateId: number;
  fullName: string;
  title: string;
  location: string;
  skillsText: string;
  profile: string;
  experience: string;
  education: string;
};

type MatchItem = {
  candidateId: number;
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
};

type MatchPayload = {
  language: 'FR' | 'EN';
  jobData: JobInput;
  candidates: CandidateInput[];
};

function sanitizeText(value: string): string {
  return String(value || '').slice(0, 4000);
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || raw.trim();
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tokenize(input: string): Set<string> {
  return new Set(
    String(input || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

function heuristicFallback(payload: MatchPayload): MatchItem[] {
  const jobTokens = tokenize(`${payload.jobData.title} ${payload.jobData.description}`);
  const jobLocation = String(payload.jobData.location || '').trim().toLowerCase();

  const scored = payload.candidates.map((candidate) => {
    const candidateTokens = tokenize(
      `${candidate.title} ${candidate.skillsText} ${candidate.profile} ${candidate.experience} ${candidate.education}`
    );

    let overlap = 0;
    for (const token of candidateTokens) {
      if (jobTokens.has(token)) overlap += 1;
    }

    const overlapRatio = jobTokens.size > 0 ? overlap / jobTokens.size : 0;
    const locationBonus =
      jobLocation && String(candidate.location || '').toLowerCase().includes(jobLocation) ? 12 : 0;

    const score = clampScore(35 + overlapRatio * 60 + locationBonus);
    const explanation = payload.language === 'EN'
      ? `Keyword overlap estimated at ${Math.round(overlapRatio * 100)}%${locationBonus ? ' with same city bonus.' : '.'}`
      : `Chevauchement de competences estime a ${Math.round(overlapRatio * 100)}%${locationBonus ? ' avec bonus meme ville.' : '.'}`;

    return {
      candidateId: candidate.candidateId,
      score,
      explanation,
      strengths: [],
      gaps: [],
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

async function callGemini(payload: MatchPayload, apiKey: string): Promise<MatchItem[]> {
  const preferredModel = process.env.GEMINI_MODEL?.trim();
  const modelCandidates = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

  const baseSystem = payload.language === 'EN'
    ? 'You are a recruitment matching analyst. Return ONLY valid JSON. Compare the job posting with each candidate CV and score compatibility from 0 to 100. No hallucinations.'
    : 'Tu es un analyste de matching recrutement. Retourne UNIQUEMENT du JSON valide. Compare l annonce avec chaque CV et donne un score de compatibilite de 0 a 100. Aucune hallucination.';
  const systemInstruction = `${baseSystem}\n\n${PROMPT_INJECTION_GUARD}`;

  const prompt = {
    task: payload.language === 'EN' ? 'Rank candidates by relevance for this job.' : 'Classe les candidats par pertinence pour cette annonce.',
    constraints: payload.language === 'EN'
      ? [
          'Return only JSON with key: matches.',
          'Each match must contain: candidateId, score, explanation, strengths, gaps.',
          'score must be an integer between 0 and 100.',
          'Use factual evidence from provided fields only.',
        ]
      : [
          'Retourne seulement du JSON avec la cle: matches.',
          'Chaque match contient: candidateId, score, explanation, strengths, gaps.',
          'score doit etre un entier entre 0 et 100.',
          'Utilise uniquement les informations fournies.',
        ],
    job: {
      title: wrapUserContent(payload.jobData.title),
      description: wrapUserContent(payload.jobData.description),
      location: wrapUserContent(payload.jobData.location ?? ''),
      contract: wrapUserContent(payload.jobData.contract ?? ''),
      salary: wrapUserContent(payload.jobData.salary ?? ''),
    },
    candidates: payload.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      fullName: wrapUserContent(candidate.fullName),
      title: wrapUserContent(candidate.title),
      location: wrapUserContent(candidate.location),
      skillsText: wrapUserContent(candidate.skillsText),
      profile: wrapUserContent(candidate.profile),
      experience: wrapUserContent(candidate.experience),
      education: wrapUserContent(candidate.education),
    })),
    outputShape: {
      matches: [
        {
          candidateId: 'number',
          score: 'number',
          explanation: 'string',
          strengths: ['string'],
          gaps: ['string'],
        },
      ],
    },
  };

  let data: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  } | null = null;

  let lastError = 'Gemini request failed';

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
            parts: [{ text: JSON.stringify(prompt) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
      cache: 'no-store',
    });

    if (res.ok) {
      data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      break;
    }

    const details = await res.text().catch(() => 'Gemini request failed');
    lastError = details.slice(0, 250);
    const isNotFound = res.status === 404 || /not found|no longer available/i.test(details);
    if (!isNotFound) {
      throw new Error(`Gemini error: ${lastError}`);
    }
  }

  if (!data) {
    throw new Error(`Gemini error: ${lastError}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  if (!text.trim()) throw new Error('Gemini empty response');

  const parsed = JSON.parse(extractJson(text)) as { matches?: Array<Partial<MatchItem>> };
  const allowedIds = new Set(payload.candidates.map((c) => c.candidateId));

  const matches = (parsed.matches || [])
    .map((item) => ({
      candidateId: Number(item.candidateId || 0),
      score: clampScore(Number(item.score || 0)),
      explanation: String(item.explanation || ''),
      strengths: Array.isArray(item.strengths) ? item.strengths.map((s) => String(s)).slice(0, 4) : [],
      gaps: Array.isArray(item.gaps) ? item.gaps.map((s) => String(s)).slice(0, 4) : [],
    }))
    .filter((item) => allowedIds.has(item.candidateId));

  if (!matches.length) {
    throw new Error('Gemini returned no valid matches');
  }

  return matches.sort((a, b) => b.score - a.score);
}

export async function POST(request: Request) {
  try {
    const limit = checkAiRateLimit(request, 'candidate-match');
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

    const body = (await request.json()) as MatchPayload;

    if (!body?.jobData?.title?.trim() || !body?.jobData?.description?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Titre et description de l annonce requis.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Aucun candidat a analyser.' },
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

    try {
      const matches = await callGemini(body, apiKey);
      return NextResponse.json({ success: true, source: 'gemini', matches });
    } catch {
      const matches = heuristicFallback(body);
      return NextResponse.json({
        success: true,
        source: 'heuristic',
        message: 'Fallback local utilise temporairement pour le scoring.',
        matches,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur IA';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
