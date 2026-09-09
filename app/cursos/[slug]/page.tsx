import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Regera a página em segundo plano no máximo a cada 5 min, servindo do cache no meio tempo.
export const revalidate = 300;

type Aula = { id: string; titulo: string; ordem: number };
type Nivel = { id: string; nome: string; ordem: number; aulas: Aula[] };
type Curso = { nome: string; slug: string; niveis: Nivel[] };

export async function generateStaticParams() {
  const { data } = await supabase.from('cursos').select('slug');
  return (data || []).map((c: any) => ({ slug: c.slug }));
}

async function buscarCurso(slug: string): Promise<Curso | null> {
  const { data } = await supabase
    .from('cursos')
    .select('nome, slug, niveis(id, nome, ordem, aulas(id, titulo, ordem))')
    .eq('slug', slug)
    .maybeSingle();
  return data as any;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const curso = await buscarCurso(params.slug);
  if (!curso) return { title: 'Curso não encontrado — NexoBIM' };
  return {
    title: `${curso.nome} — Curso NexoBIM`,
    description: `Aprenda ${curso.nome} na NexoBIM: vídeo aulas por nível, tarefas práticas e certificado ao concluir.`,
  };
}

export default async function PaginaCurso({ params }: { params: { slug: string } }) {
  const curso = await buscarCurso(params.slug);
  if (!curso) notFound();

  const niveis = [...curso.niveis].sort((a, b) => a.ordem - b.ordem);
  const totalAulas = niveis.reduce((soma, n) => soma + n.aulas.length, 0);

  return (
    <div>
      <header className="topo">
        <a className="marca" href="/">
          <Image src="/logo-nexobim-topo.png" alt="NexoBIM" width={80} height={22} priority />
        </a>
        <nav>
          <a href="/#cursos">Cursos</a>
          <a href="/login">Entrar</a>
        </nav>
      </header>

      <section className="envolucro-largo hero-nexobim">
        <span className="etiqueta">Curso NexoBIM</span>
        <h1>{curso.nome}</h1>
        <p className="hero-legenda">
          {totalAulas} aula{totalAulas === 1 ? '' : 's'} organizada{totalAulas === 1 ? '' : 's'} em {niveis.length} {niveis.length === 1 ? 'nível' : 'níveis'},
          com tarefas práticas e certificado ao concluir cada etapa.
        </p>
        <div className="hero-botoes">
          <a className="botao" href="/login">Entrar ou criar conta</a>
        </div>
      </section>

      <section className="envolucro-largo" id="programa">
        <h2 className="titulo-secao">Programa do curso</h2>
        <p className="legenda-secao">O que você assiste em cada nível.</p>

        {niveis.map((nivel) => (
          <div className="painel" key={nivel.id}>
            <span className="etiqueta-nivel">{nivel.nome}</span>
            <p className="painel-legenda" style={{ marginBottom: 12 }}>
              {nivel.aulas.length} aula{nivel.aulas.length === 1 ? '' : 's'}
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {[...nivel.aulas].sort((a, b) => a.ordem - b.ordem).map((aula) => (
                <li key={aula.id} className="aula-titulo" style={{ fontSize: 14 }}>{aula.titulo}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="envolucro-largo secao-final">
        <div className="painel">
          <p className="painel-titulo">Quer assistir?</p>
          <p className="painel-legenda">Crie sua conta e comece esse curso agora, no seu ritmo.</p>
          <a className="botao" href="/login">Entrar ou criar conta</a>
        </div>
      </section>

      <footer className="rodape-nexobim">
        <span className="rodape-marca">
          <Image src="/simbolo-nexobim-ciano.png" alt="" width={18} height={16} />
          NexoBIM
        </span>
        <a href="/">voltar pra home</a>
      </footer>
    </div>
  );
}
