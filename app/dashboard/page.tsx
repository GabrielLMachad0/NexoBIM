'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';

type Aula = { id: string; titulo: string; youtube_id: string; ordem: number };
type TarefaPadrao = { id: string; titulo: string; descricao: string };
type Nivel = {
  id: string;
  nome: string;
  ordem: number;
  aulas: Aula[];
  tarefas_padrao: TarefaPadrao[];
};
type Curso = { id: string; nome: string; niveis: Nivel[] };

type TarefaDesignada = {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  prazo: string | null;
};
type PlanoPersonalizado = { id: string; motivo: string; conteudo: string; criado_em: string };
type AulaGravada = { id: string; titulo: string; video_url: string; data_aula: string };

export default function Dashboard() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<{ nome: string; is_assinante: boolean; is_aluno_particular: boolean; is_admin: boolean } | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [assistidas, setAssistidas] = useState<Set<string>>(new Set());
  const [tarefasFeitas, setTarefasFeitas] = useState<Set<string>>(new Set());
  const [certificados, setCertificados] = useState<Set<string>>(new Set());

  const [planos, setPlanos] = useState<PlanoPersonalizado[]>([]);
  const [tarefasDesignadas, setTarefasDesignadas] = useState<TarefaDesignada[]>([]);
  const [aulasGravadas, setAulasGravadas] = useState<AulaGravada[]>([]);
  const [continuarEm, setContinuarEm] = useState<{ nivelId: string; nivelNome: string; cursoNome: string; aulaTitulo: string } | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.push('/login');
      return;
    }
    const userId = sessao.session.user.id;

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('nome, is_assinante, is_aluno_particular, is_admin')
      .eq('id', userId)
      .single();
    setPerfil(perfilData as any);

    if (perfilData?.is_assinante) {
      const { data: cursosData } = await supabase
        .from('cursos')
        .select('id, nome, niveis(id, nome, ordem, aulas(id, titulo, youtube_id, ordem), tarefas_padrao(id, titulo, descricao))')
        .order('ordem');
      setCursos((cursosData as any) || []);

      const { data: progAulas } = await supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', userId);
      setAssistidas(new Set((progAulas || []).map((p: any) => p.aula_id)));

      const { data: progTarefas } = await supabase.from('progresso_tarefas').select('tarefa_padrao_id').eq('aluno_id', userId);
      setTarefasFeitas(new Set((progTarefas || []).map((p: any) => p.tarefa_padrao_id)));

      const { data: certs } = await supabase.from('certificados').select('nivel_id').eq('aluno_id', userId);
      setCertificados(new Set((certs || []).map((c: any) => c.nivel_id)));

      const { data: ultimaAula } = await supabase
        .from('progresso_aulas')
        .select('assistido_em, aulas(titulo, niveis(id, nome, cursos(nome)))')
        .eq('aluno_id', userId)
        .order('assistido_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      const aula = (ultimaAula as any)?.aulas;
      if (aula?.niveis) {
        setContinuarEm({
          nivelId: aula.niveis.id,
          nivelNome: aula.niveis.nome,
          cursoNome: aula.niveis.cursos.nome,
          aulaTitulo: aula.titulo,
        });
      }
    }

    if (perfilData?.is_aluno_particular) {
      const { data: planosData } = await supabase
        .from('planos_personalizados')
        .select('id, motivo, conteudo, criado_em')
        .eq('aluno_id', userId)
        .order('criado_em', { ascending: false });
      setPlanos((planosData as any) || []);

      const { data: tarefasData } = await supabase
        .from('tarefas_designadas')
        .select('id, titulo, descricao, status, prazo')
        .eq('aluno_id', userId);
      setTarefasDesignadas((tarefasData as any) || []);

      const { data: gravadasData } = await supabase
        .from('aulas_particulares_gravadas')
        .select('id, titulo, video_url, data_aula')
        .eq('aluno_id', userId)
        .order('data_aula', { ascending: false });
      setAulasGravadas((gravadasData as any) || []);
    }

    setCarregando(false);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;
  if (!perfil) return null;

  return (
    <div>
      <Cabecalho ehAdmin={perfil.is_admin} />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Olá, {perfil.nome}</h1>

        {!perfil.is_assinante && !perfil.is_aluno_particular && (
          <div className="painel">
            <p className="painel-titulo">Sua conta ainda não tem acesso liberado</p>
            <p className="painel-legenda">Fale com a Raíssa para liberar sua assinatura ou aula particular.</p>
          </div>
        )}

        {perfil.is_aluno_particular && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--texto-suave)', marginTop: 28 }}>Sua aula particular</h2>

            {aulasGravadas.map((a) => (
              <div className="painel" key={a.id}>
                <p className="painel-titulo">{a.titulo}</p>
                <p className="painel-legenda">Gravada em {new Date(a.data_aula).toLocaleDateString('pt-BR')}</p>
                <a className="botao" href={a.video_url} target="_blank" rel="noreferrer">Assistir gravação</a>
              </div>
            ))}

            {planos.map((p) => (
              <div className="painel" key={p.id}>
                <p className="painel-titulo">Plano de aula</p>
                <p className="painel-legenda">Sobre: {p.motivo}</p>
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{p.conteudo}</p>
              </div>
            ))}

            {tarefasDesignadas.length > 0 && (
              <div className="painel">
                <p className="painel-titulo">Suas tarefas</p>
                {tarefasDesignadas.map((t) => (
                  <div className="aula-linha" key={t.id}>
                    <div>
                      <div className="aula-titulo">{t.titulo}</div>
                      <p className="painel-legenda" style={{ margin: 0 }}>{t.descricao}</p>
                    </div>
                    <span className={`marcador ${t.status === 'concluida' ? 'feito' : ''}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {perfil.is_assinante && (
          <>
            {continuarEm && (
              <Link href={`/dashboard/nivel/${continuarEm.nivelId}`} className="painel continuar-card" style={{ marginTop: 28 }}>
                <span className="etiqueta-nivel">Continuar de onde parei</span>
                <p className="painel-titulo">{continuarEm.aulaTitulo}</p>
                <p className="painel-legenda" style={{ margin: 0 }}>{continuarEm.cursoNome} · {continuarEm.nivelNome}</p>
              </Link>
            )}

            <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--texto-suave)', marginTop: 28 }}>Seus cursos</h2>

            <div className="grade-niveis">
              {cursos.map((curso) =>
                curso.niveis
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((nivel) => {
                    const totalItens = nivel.aulas.length + nivel.tarefas_padrao.length;
                    const feitos =
                      nivel.aulas.filter((a) => assistidas.has(a.id)).length +
                      nivel.tarefas_padrao.filter((t) => tarefasFeitas.has(t.id)).length;
                    const completo = totalItens > 0 && feitos === totalItens;

                    return (
                      <Link href={`/dashboard/nivel/${nivel.id}`} className="painel cartao-nivel" key={nivel.id}>
                        <span className="etiqueta-nivel">{nivel.nome}</span>
                        <p className="painel-titulo">{curso.nome}</p>
                        <p className="painel-legenda">{nivel.aulas.length} aula{nivel.aulas.length === 1 ? '' : 's'}</p>
                        {completo ? (
                          <span className="marcador feito">
                            {certificados.has(nivel.id) ? 'certificado emitido' : 'concluído'}
                          </span>
                        ) : (
                          <span className="marcador">{feitos}/{totalItens} concluído{feitos === 1 ? '' : 's'}</span>
                        )}
                      </Link>
                    );
                  })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
