'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';

type Recurso = { id: string; categoria: string; nome: string; descricao: string | null; link_drive: string };

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function iconeDaCategoria(categoria: string): string {
  const c = normalizar(categoria);
  if (c.includes('esquadria') || c.includes('porta') || c.includes('janela')) return '🚪';
  if (c.includes('portao') || c.includes('grade') || c.includes('cerca')) return '⛓️';
  if (c.includes('estrutura') || c.includes('cobertura')) return '🏗️';
  if (c.includes('eletrica') || c.includes('infraestrutura')) return '⚡';
  if (c.includes('decorativ')) return '🏛️';
  if (c.includes('biblioteca')) return '📚';
  if (c.includes('projeto')) return '📐';
  if (c.includes('template')) return '📄';
  if (c.includes('veiculo') || c.includes('equipamento')) return '🚧';
  if (c.includes('pessoa') || c.includes('figura')) return '🧍';
  if (c.includes('textura') || c.includes('material')) return '🎨';
  if (c.includes('paisagismo') || c.includes('mobiliario')) return '🌳';
  return '📁';
}

export default function Recursos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.push('/login');
      return;
    }

    const [{ data: perfilData }, { data: recursosData }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single(),
      supabase.from('recursos_download').select('id, categoria, nome, descricao, link_drive').order('categoria').order('ordem'),
    ]);

    setEhAdmin(!!perfilData?.is_admin);
    setRecursos((recursosData as any) || []);
    setCarregando(false);
  }

  const buscaNormalizada = normalizar(busca.trim());
  const recursosFiltrados = useMemo(() => {
    if (!buscaNormalizada) return recursos;
    return recursos.filter((r) =>
      normalizar(r.nome).includes(buscaNormalizada) ||
      normalizar(r.categoria).includes(buscaNormalizada) ||
      (r.descricao && normalizar(r.descricao).includes(buscaNormalizada))
    );
  }, [recursos, buscaNormalizada]);

  const categorias = Array.from(new Set(recursos.map((r) => r.categoria)));
  const categoriasComResultado = Array.from(new Set(recursosFiltrados.map((r) => r.categoria)));

  function slugCategoria(categoria: string): string {
    return normalizar(categoria).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Acervo de recursos</h1>
        <p className="painel-legenda">
          Famílias e projetos de Revit para baixar e usar nos seus próprios modelos — {recursos.length} recursos em {categorias.length} categorias.
        </p>

        <input
          className="campo"
          style={{ marginTop: 4 }}
          placeholder="Buscar por nome, categoria ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {!busca && categorias.length > 1 && (
          <div className="chips-categoria">
            {categorias.map((categoria) => (
              <a key={categoria} href={`#${slugCategoria(categoria)}`} className="chip-categoria">
                {iconeDaCategoria(categoria)} {categoria}
              </a>
            ))}
          </div>
        )}

        {categorias.length === 0 && (
          <div className="painel" style={{ marginTop: 20 }}>
            <p className="painel-legenda" style={{ margin: 0 }}>Nenhum recurso disponível ainda.</p>
          </div>
        )}

        {busca && categoriasComResultado.length === 0 && (
          <div className="painel" style={{ marginTop: 20 }}>
            <p className="painel-legenda" style={{ margin: 0 }}>Nenhum resultado para "{busca}".</p>
          </div>
        )}

        {(busca ? categoriasComResultado : categorias).map((categoria) => {
          const itens = recursosFiltrados.filter((r) => r.categoria === categoria);
          return (
            <div key={categoria} id={slugCategoria(categoria)}>
              <p className="painel-legenda titulo-categoria-recurso">
                {iconeDaCategoria(categoria)} {categoria} <span className="contagem-categoria">({itens.length})</span>
              </p>
              <div className="grade-niveis">
                {itens.map((recurso) => (
                  <a key={recurso.id} className="painel cartao-nivel cartao-recurso" href={recurso.link_drive} target="_blank" rel="noreferrer">
                    <p className="painel-titulo">{recurso.nome}</p>
                    {recurso.descricao && <p className="painel-legenda" style={{ margin: 0 }}>{recurso.descricao}</p>}
                    <span className="link-baixar-recurso">Abrir no Drive ↗</span>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
