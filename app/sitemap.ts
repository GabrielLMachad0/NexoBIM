import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SITE_URL = 'https://nexobimbr.vercel.app';

// Só entram aqui páginas públicas de verdade (sem exigir login) — dashboard,
// admin e recursos ficam de fora porque exigem conta.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: cursos } = await supabase.from('cursos').select('slug');

  const paginasFixas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
  ];

  const paginasDeCurso: MetadataRoute.Sitemap = (cursos || []).map((c: any) => ({
    url: `${SITE_URL}/cursos/${c.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...paginasFixas, ...paginasDeCurso];
}
