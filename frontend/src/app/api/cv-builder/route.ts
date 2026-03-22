import { NextResponse } from 'next/server';

type CvPayload = {
  language: 'FR' | 'EN';
  template: 'fr_classique_cm' | 'fr_moderne_cm' | 'en_professional_cm' | 'en_international_cm';
  cvData: {
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
};

type StoredCandidate = {
  id: number;
  nom: string;
  titre: string;
  localisation: string;
  experience: 'Junior' | 'Confirme' | 'Senior';
  disponibilite: 'Immediatement' | 'Sous 1 mois' | 'A l ecoute du marche';
  etudes: 'Bac' | 'Bac+2' | 'Bac+3' | 'Bac+5';
  cvMajJours: number;
  competences: string[];
  disponibleNow: boolean;
  language: 'FR' | 'EN';
  template: 'fr_classique_cm' | 'fr_moderne_cm' | 'en_professional_cm' | 'en_international_cm';
};

declare global {
  var __cvBuilderStore: StoredCandidate[] | undefined;
}

const store: StoredCandidate[] = globalThis.__cvBuilderStore ?? [];
if (!globalThis.__cvBuilderStore) {
  globalThis.__cvBuilderStore = store;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CvPayload;

    if (!body?.cvData?.fullName || !body?.cvData?.title) {
      return NextResponse.json(
        { success: false, message: 'Nom et titre requis.' },
        { status: 400 }
      );
    }

    const candidate: StoredCandidate = {
      id: Date.now(),
      nom: body.cvData.fullName,
      titre: body.cvData.title,
      localisation: body.cvData.location.split(',')[0]?.trim() || 'Douala',
      experience: 'Confirme',
      disponibilite: 'Immediatement',
      etudes: 'Bac+3',
      cvMajJours: 0,
      competences: body.cvData.skillsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
      disponibleNow: true,
      language: body.language,
      template: body.template,
    };

    store.unshift(candidate);

    return NextResponse.json({
      success: true,
      message: 'CV enregistre avec succes.',
      candidate,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la sauvegarde du CV.' },
      { status: 500 }
    );
  }
}
