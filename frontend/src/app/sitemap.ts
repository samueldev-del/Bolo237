import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.bolo237.com';

const paths = [
  '/',
  '/a-propos',
  '/questions-frequentes',
  '/comment-decrocher-premier-contrat',
  '/conditions',
  '/connexion',
  '/dashboard',
  '/dashboard-artisan',
  '/dashboard-entreprise',
  '/cvtheque',
  '/profil',
  '/recherche',
  '/emplois',
  '/petits-boulots',
  '/publier',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${BASE_URL}/fr${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.8,
    alternates: {
      languages: {
        fr: `${BASE_URL}/fr${path === '/' ? '' : path}`,
        en: `${BASE_URL}/en${path === '/' ? '' : path}`,
      },
    },
  }));
}
