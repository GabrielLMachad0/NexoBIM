'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';
import { Recurso, normalizar, slugCategoria, iconeDaCategoria, totalDeArquivos } from '../../lib/recursos';

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
      supabase.from('recursos_download').select('id, categoria, nome, descricao, link_drive, arquivos, cliques').order('categoria').order('ordem'),
    ]);

    setEhAdmin(!!perfilData?.is_admin);
    setRecursos((recursosData as any) || []);
    setCarregando(false);
  }

  function registrarClique(recursoId: string) {
    supabase.rpc('incrementar_clique_recurso', { p_recurso_id: recursoId });
  }

  const buscaNormalizada = normalizar(busca.trim());
  const recursosFiltrados = useMemo(() => {
    if (!buscaNormalizada) return [];
    return recursos.filter((r) =>
      normalizar(r.nome).includes(buscaNormalizada) ||
      normalizar(r.categoria).includes(buscaNormalizada) ||
      (r.descricao && normalizar(r.descricao).includes(buscaNormalizada))
    );
  }, [recursos, buscaNormalizada]);

  const maisBaixados = [...recursos].sort((a, b) => b.cliques - a.cliques).filter((r) => r.cliques > 0).slice(0, 6);

  const categorias = useMemo(() => {
    const grupos = new Map<string, { itens: number; arquivos: number }>();
    for (const r of recursos) {
      const atual = grupos.get(r.categoria) || { itens: 0, arquivos: 0 };
      grupos.set(r.categoria, { itens: atual.itens + 1, arquivos: atual.arquivos + r.arquivos });
    }
    return Array.from(grupos.entries()).map(([nome, dados]) => ({ nome, ...dados }));
  }, [recursos]);

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Acervo de recursos</h1>
        <p className="painel-legenda">
          Famílias e projetos de Revit para baixar e usar nos seus próprios modelos — mais de{' '}
          <strong style={{ color: 'var(--azul-linha)' }}>{totalDeArquivos(recursos).toLocaleString('pt-BR')} arquivos</strong>{' '}
          em {categorias.length} categorias.
        </p>

        <input
          className="campo"
          style={{ marginTop: 4 }}
          placeholder="Buscar por nome, categoria ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {busca ? (
          recursosFiltrados.length === 0 ? (
            <div className="painel" style={{ marginTop: 20 }}>
              <p className="painel-legenda" style={{ margin: 0 }}>Nenhum resultado para "{busca}".</p>
            </div>
          ) : (
            <div className="grade-niveis" style={{ marginTop: 16 }}>
              {recursosFiltrados.map((recurso) => (
                <a
                  key={recurso.id}
                  className="painel cartao-nivel cartao-recurso"
                  href={recurso.link_drive}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => registrarClique(recurso.id)}
                >
                  <p className="painel-titulo">{recurso.nome}</p>
                  <p className="painel-legenda" style={{ margin: 0 }}>{recurso.categoria}</p>
                  <span className="link-baixar-recurso">Abrir no Drive ↗</span>
                </a>
              ))}
            </div>
          )
        ) : (
          <>
            {categorias.length === 0 && (
              <div className="painel" style={{ marginTop: 20 }}>
                <p className="painel-legenda" style={{ margin: 0 }}>Nenhum recurso disponível ainda.</p>
              </div>
            )}

            {maisBaixados.length > 0 && (
              <div>
                <p className="painel-legenda titulo-categoria-recurso">🔥 Mais baixados</p>
                <div className="grade-niveis">
                  {maisBaixados.map((recurso) => (
                    <a
                      key={recurso.id}
                      className="painel cartao-nivel cartao-recurso"
                      href={recurso.link_drive}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => registrarClique(recurso.id)}
                    >
                      <p className="painel-titulo">{recurso.nome}</p>
                      <p className="painel-legenda" style={{ margin: 0 }}>{recurso.categoria}</p>
                      <span className="link-baixar-recurso">Abrir no Drive ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {categorias.length > 0 && (
              <div>
                <p className="painel-legenda titulo-categoria-recurso">Categorias</p>
                <div className="grade-niveis">
                  {categorias.map((categoria) => (
                    <Link
                      key={categoria.nome}
                      href={`/recursos/${slugCategoria(categoria.nome)}`}
                      className="painel cartao-nivel cartao-categoria-recurso"
                    >
                      <span className="icone-categoria-grande">{iconeDaCategoria(categoria.nome)}</span>
                      <p className="painel-titulo">{categoria.nome}</p>
                      <p className="painel-legenda" style={{ margin: 0 }}>
                        {categoria.itens} pasta{categoria.itens === 1 ? '' : 's'} · {categoria.arquivos.toLocaleString('pt-BR')} arquivo{categoria.arquivos === 1 ? '' : 's'}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
