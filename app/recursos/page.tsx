'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';

type Recurso = { id: string; categoria: string; nome: string; descricao: string | null; link_drive: string };

export default function Recursos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);

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

  if (carregando) return <div className="envolucro">Carregando...</div>;

  const categorias = Array.from(new Set(recursos.map((r) => r.categoria)));

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Acervo de recursos</h1>
        <p className="painel-legenda">Famílias e projetos de Revit para baixar e usar nos seus próprios modelos.</p>

        {categorias.length === 0 && (
          <div className="painel">
            <p className="painel-legenda" style={{ margin: 0 }}>Nenhum recurso disponível ainda.</p>
          </div>
        )}

        {categorias.map((categoria) => (
          <div key={categoria}>
            <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>{categoria}</p>
            <div className="grade-niveis">
              {recursos.filter((r) => r.categoria === categoria).map((recurso) => (
                <a key={recurso.id} className="painel cartao-nivel" href={recurso.link_drive} target="_blank" rel="noreferrer">
                  <p className="painel-titulo">{recurso.nome}</p>
                  {recurso.descricao && <p className="painel-legenda" style={{ margin: 0 }}>{recurso.descricao}</p>}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
