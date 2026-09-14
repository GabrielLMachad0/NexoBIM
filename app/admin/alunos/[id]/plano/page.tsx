'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';
import PaginaPlanoDeAula from '../../../../../components/PaginaPlanoDeAula';
import { Plano, planosGerais } from '../../../../../lib/aulaParticular';

export default function PreviewPlanoDeAula() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [planos, setPlanos] = useState<Plano[]>([]);

  useEffect(() => {
    carregar();
  }, [params.id]);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfilAdmin } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfilAdmin?.is_admin) { router.push('/dashboard'); return; }

    const alunoId = params.id;
    const { data: perfilData } = await supabase.from('profiles').select('grupo_id').eq('id', alunoId).maybeSingle();
    if (!perfilData) { router.push('/admin/alunos'); return; }

    const dono = perfilData.grupo_id ? `aluno_id.eq.${alunoId},grupo_id.eq.${perfilData.grupo_id}` : `aluno_id.eq.${alunoId}`;
    const { data } = await supabase
      .from('planos_personalizados')
      .select('id, motivo, conteudo, aula_rotulo')
      .or(dono)
      .order('criado_em', { ascending: true });

    setPlanos((data as any) || []);
    setCarregando(false);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return <PaginaPlanoDeAula planos={planosGerais(planos)} hrefVoltar={`/admin/alunos/${params.id}`} ehAdmin />;
}
