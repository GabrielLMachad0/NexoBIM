'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';
import { Recurso, slugCategoria, iconeDaCategoria, thumbnailDoRecurso } from '../../../lib/recursos';

export default function CategoriaRecursos() {
  const params = useParams<{ categoria: string }>();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [itens, setItens] = useState<Recurso[]>([]);
  const [nomeCategoria, setNomeCategoria] = useState('');

  useEffect(() => {
    carregar();
  }, [params.categoria]);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.push('/login');
      return;
    }

    const [{ data: perfilData }, { data: recursosData }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single(),
      supabase.from('recursos_download').select('id, categoria, nome, descricao, link_drive, arquivos, cliques').order('ordem'),
    ]);

    setEhAdmin(!!perfilData?.is_admin);

    const todos = (recursosData as any as Recurso[]) || [];
    const doGrupo = todos.filter((r) => slugCategoria(r.categoria) === params.categoria);
    setItens(doGrupo);
    setNomeCategoria(doGrupo[0]?.categoria || '');
    setCarregando(false);
  }

  function registrarClique(recursoId: string) {
    supabase.rpc('incrementar_clique_recurso', { p_recurso_id: recursoId });
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <Link href="/recursos" className="voltar-link">← Acervo de recursos</Link>

        {itens.length === 0 ? (
          <div className="painel" style={{ marginTop: 16 }}>
            <p className="painel-legenda" style={{ margin: 0 }}>Categoria não encontrada.</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: '4px 0 4px' }}>
              {iconeDaCategoria(nomeCategoria)} {nomeCategoria}
            </h1>
            <p className="painel-legenda">
              {itens.length} pasta{itens.length === 1 ? '' : 's'} · {itens.reduce((s, r) => s + r.arquivos, 0).toLocaleString('pt-BR')} arquivos
            </p>

            <div className="grade-niveis">
              {itens.map((recurso) => {
                const thumbnail = thumbnailDoRecurso(recurso);
                return (
                  <a
                    key={recurso.id}
                    className="painel cartao-nivel cartao-recurso"
                    href={recurso.link_drive}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => registrarClique(recurso.id)}
                  >
                    {thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt="" className="thumbnail-recurso" loading="lazy" />
                    )}
                    <p className="painel-titulo">{recurso.nome}</p>
                    {recurso.descricao && <p className="painel-legenda" style={{ margin: 0 }}>{recurso.descricao}</p>}
                    <span className="link-baixar-recurso">Abrir no Drive ↗</span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
