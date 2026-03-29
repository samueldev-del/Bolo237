import { NextResponse } from 'next/server';

type JobInput = {
  title: string;
  description: string;
  location: string;
  contract?: string;
  salary?: string;
};

type OptimizePayload = {
  language: 'FR' | 'EN';
  role: 'company' | 'artisan';
  companyName?: string;
  specialty?: string;
  jobData: JobInput;
};

function extractJson(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || raw.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OptimizePayload;

    if (!body?.jobData?.title?.trim() || !body?.jobData?.description?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Titre et description requis.' },
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const systemInstruction = body.language === 'EN'
      ? 'You optimize job and service listings. Return ONLY valid JSON. Keep factual information and improve clarity and trust. No hallucinations.'
      : 'Tu optimises des annonces emploi et services. Retourne UNIQUEMENT du JSON valide. Conserve les faits et ameliore clarte et confiance. Aucune hallucination.';

    const prompt = {
      task: body.language === 'EN' ? 'Optimize this listing.' : 'Optimise cette annonce.',
      constraints: body.language === 'EN'
        ? [
            'Return only JSON with keys: title, description, location, contract, salary.',
            'No markdown, no commentary.',
            'Professional tone adapted to Cameroon market.',
            'Keep anti-fraud safe wording, avoid money transfer/fraud cues.',
          ]
        : [
            'Retourne seulement du JSON avec les cles: title, description, location, contract, salary.',
            'Pas de markdown, pas de commentaire.',
            'Ton professionnel adapte au marche camerounais.',
            'Conserve un langage anti-fraude, sans formules suspectes.',
          ],
      context: {
        role: body.role,
        companyName: body.companyName || '',
        specialty: body.specialty || '',
      },
      input: body.jobData,
      outputShape: {
        title: 'string',
        description: 'string',
        location: 'string',
        contract: 'string',
        salary: 'string',
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
            parts: [{ text: JSON.stringify(prompt) }],
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
    if (!text.trim()) throw new Error('Gemini empty response');

    const parsed = JSON.parse(extractJson(text)) as Partial<JobInput>;

    const optimized: JobInput = {
      title: String(parsed.title || body.jobData.title || ''),
      description: String(parsed.description || body.jobData.description || ''),
      location: String(parsed.location || body.jobData.location || ''),
      contract: String(parsed.contract || body.jobData.contract || ''),
      salary: String(parsed.salary || body.jobData.salary || ''),
    };

    return NextResponse.json({ success: true, optimized });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur IA';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
