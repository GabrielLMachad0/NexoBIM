'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import PaginaPlanoDeAula from '../../../components/PaginaPlanoDeAula';
import { Plano, planosGerais } from '../../../lib/aulaParticular';

export default function PlanoDeAulaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [ehAdmin, setEhAdmin] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const userId = sessao.session.user.id;

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('is_aluno_particular, grupo_id, is_admin')
      .eq('id', userId)
      .single();

    if (!perfilData?.is_aluno_particular) { router.push('/dashboard'); return; }
    setEhAdmin(!!perfilData.is_admin);

    const dono = perfilData.grupo_id ? `aluno_id.eq.${userId},grupo_id.eq.${perfilData.grupo_id}` : `aluno_id.eq.${userId}`;
    const { data } = await supabase
      .from('planos_personalizados')
      .select('id, motivo, conteudo, aula_rotulo')
      .or(dono)
      .order('criado_em', { ascending: true });

    setPlanos((data as any) || []);
    setCarregando(false);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return <PaginaPlanoDeAula planos={planosGerais(planos)} hrefVoltar="/dashboard" ehAdmin={ehAdmin} />;
}
