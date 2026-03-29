export type CvTemplateId =
  | 'fr_classique_cm'
  | 'fr_moderne_cm'
  | 'en_professional_cm'
  | 'en_international_cm';

export type CvHtmlData = {
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

function esc(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function section(title: string, body: string): string {
  return `
    <section style="margin-top:14px;">
      <h3 style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${esc(title)}</h3>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#111827;white-space:pre-wrap;">${esc(body || '-')}</p>
    </section>
  `;
}

export function buildCvHtml(template: CvTemplateId, data: CvHtmlData): string {
  const headerBg = template === 'fr_moderne_cm' ? '#16a34a' : template === 'en_international_cm' ? '#0f172a' : '#f3f4f6';
  const headerText = template === 'fr_moderne_cm' || template === 'en_international_cm' ? '#ffffff' : '#111827';

  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV ${esc(data.fullName || 'Candidate')}</title>
  <style>
    body { margin:0; background:#eef2f7; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .page { width:794px; min-height:1123px; margin:0 auto; background:#fff; box-sizing:border-box; }
    .header { padding:28px 34px; background:${headerBg}; color:${headerText}; }
    .content { padding:24px 34px 32px; }
    .name { margin:0; font-size:28px; font-weight:800; letter-spacing:-.02em; }
    .title { margin:6px 0 0; font-size:15px; font-weight:600; opacity:.92; }
    .meta { margin:10px 0 0; font-size:12px; opacity:.9; }
  </style>
</head>
<body>
  <article class="page">
    <header class="header">
      <h1 class="name">${esc(data.fullName || 'Nom complet')}</h1>
      <p class="title">${esc(data.title || 'Titre')}</p>
      <p class="meta">${esc(data.location)} | ${esc(data.phone)} | ${esc(data.email)}</p>
    </header>
    <main class="content">
      ${section('Profil', data.profile)}
      ${section('Experience', data.experience)}
      ${section('Formation', data.education)}
      ${section('Competences', data.skillsText)}
      ${section('Langues', data.languagesText)}
    </main>
  </article>
</body>
</html>
`;
}
