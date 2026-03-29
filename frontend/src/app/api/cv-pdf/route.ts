import { NextResponse } from 'next/server';
import { buildCvHtml, type CvHtmlData, type CvTemplateId } from '@/lib/cvTemplateHtml';

type PdfPayload = {
  template: CvTemplateId;
  cvData: CvHtmlData;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PdfPayload;
    if (!body?.template || !body?.cvData?.fullName) {
      return NextResponse.json({ success: false, message: 'Template et cvData requis.' }, { status: 400 });
    }

    const html = buildCvHtml(body.template, body.cvData);

    // Preparation for Render/Puppeteer integration.
    const pdfServiceUrl = process.env.PDF_SERVICE_URL;
    if (!pdfServiceUrl) {
      return NextResponse.json({
        success: false,
        prepared: true,
        message: 'PDF_SERVICE_URL manquant. Branchez un service Puppeteer backend pour convertir ce HTML en PDF.',
        html,
      }, { status: 501 });
    }

    const res = await fetch(pdfServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, fileName: `CV_${body.cvData.fullName || 'candidat'}.pdf` }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const details = await res.text().catch(() => 'PDF service error');
      throw new Error(details.slice(0, 250));
    }

    const payload = (await res.json()) as { url?: string; base64?: string };
    return NextResponse.json({
      success: true,
      url: payload.url,
      base64: payload.base64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur generation PDF';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
