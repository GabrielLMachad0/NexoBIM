import { supabase } from './supabaseClient';
import { normalizar, slugCategoria } from './recursos';

export type AulaBusca = {
  id: string;
  titulo: string;
  descricao: string;
  nivelId: string;
  nivelNome: string;
  cursoNome: string;
};

export type NivelBusca = { id: string; nome: string; cursoNome: string };
export type CursoBusca = { nome: string; slug: string };
export type CategoriaBusca = { nome: string; slug: string };

export type BaseDeConhecimento = {
  aulas: AulaBusca[];
  niveis: NivelBusca[];
  cursos: CursoBusca[];
  categorias: CategoriaBusca[];
};

export async function carregarBaseDeConhecimento(): Promise<BaseDeConhecimento> {
  const [{ data: cursosData }, { data: recursosData }] = await Promise.all([
    supabase
      .from('cursos')
      .select('nome, slug, niveis(id, nome, aulas(id, titulo, descricao))')
      .order('ordem'),
    // Se o visitante não estiver logado, a RLS devolve uma lista vazia aqui —
    // sem erro, só sem sugestão de recursos até a pessoa entrar na conta.
    supabase.from('recursos_download').select('categoria'),
  ]);

  const aulas: AulaBusca[] = [];
  const niveis: NivelBusca[] = [];
  const cursos: CursoBusca[] = [];

  for (const curso of (cursosData as any[]) || []) {
    cursos.push({ nome: curso.nome, slug: curso.slug });
    for (const nivel of curso.niveis || []) {
      niveis.push({ id: nivel.id, nome: nivel.nome, cursoNome: curso.nome });
      for (const aula of nivel.aulas || []) {
        aulas.push({
          id: aula.id,
          titulo: aula.titulo,
          descricao: aula.descricao || '',
          nivelId: nivel.id,
          nivelNome: nivel.nome,
          cursoNome: curso.nome,
        });
      }
    }
  }

  const categoriasUnicas = Array.from(new Set(((recursosData as any[]) || []).map((r) => r.categoria)));
  const categorias: CategoriaBusca[] = categoriasUnicas.map((nome) => ({ nome, slug: slugCategoria(nome) }));

  return { aulas, niveis, cursos, categorias };
}

// Palavras curtas demais ou tão comuns em títulos/perguntas que não ajudam a
// diferenciar um resultado do outro (quase toda aula tem "revit" no título).
const PALAVRAS_IGNORADAS = new Set([
  'aula', 'aulas', 'curso', 'cursos', 'nivel', 'niveis', 'revit', 'onde', 'como',
  'para', 'quero', 'queria', 'saber', 'preciso', 'pode', 'poderia', 'uma', 'umas',
  'um', 'uns', 'dos', 'das', 'com', 'que', 'tem', 'ver', 'vejo', 'fazer', 'sobre',
  'achar', 'encontrar', 'ensina', 'ensinar', 'mostra', 'mostrar', 'qual', 'quais',
  'essa', 'esse', 'isso', 'estou', 'gostaria', 'ola', 'oi', 'bom', 'dia',
]);

export function palavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALAVRAS_IGNORADAS.has(p));
}
