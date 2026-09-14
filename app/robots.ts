import { MetadataRoute } from 'next';

const SITE_URL = 'https://nexobimbr.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/api', '/login', '/recursos', '/redefinir-senha'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
