import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/dashboard-artisan', '/dashboard-entreprise', '/profil', '/connexion'],
    },
    sitemap: 'https://www.bolo237.com/sitemap.xml',
    host: 'https://www.bolo237.com',
  };
}
