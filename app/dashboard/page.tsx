'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';
import AnelProgresso from '../../components/AnelProgresso';
import SecaoAulaParticular from '../../components/SecaoAulaParticular';
import { Plano, TarefaDesignada, AulaGravada } from '../../lib/aulaParticular';
import Esqueleto from '../../components/Esqueleto';

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

export default function Dashboard() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<{ nome: string; is_assinante: boolean; is_aluno_particular: boolean; is_admin: boolean; grupo_nome: string | null } | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [assistidas, setAssistidas] = useState<Set<string>>(new Set());
  const [tarefasFeitas, setTarefasFeitas] = useState<Set<string>>(new Set());
  const [certificados, setCertificados] = useState<Set<string>>(new Set());

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [tarefasDesignadas, setTarefasDesignadas] = useState<TarefaDesignada[]>([]);
  const [aulasGravadas, setAulasGravadas] = useState<AulaGravada[]>([]);
  const [continuarEm, setContinuarEm] = useState<{ nivelId: string; nivelNome: string; cursoNome: string; aulaTitulo: string } | null>(null);
  const [idUsuario, setIdUsuario] = useState<string | null>(null);

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
    setIdUsuario(userId);

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('nome, is_assinante, is_aluno_particular, is_admin, grupo_id, grupos_estudo(nome)')
      .eq('id', userId)
      .single();
    const grupoId = (perfilData as any)?.grupo_id as string | null | undefined;
    setPerfil(
      perfilData
        ? { ...(perfilData as any), grupo_nome: (perfilData as any).grupos_estudo?.nome || null }
        : null
    );

    // Cada consulta abaixo é independente das outras — dispara todas de uma vez
    // em vez de esperar uma terminar pra começar a próxima.
    const tarefas: PromiseLike<void>[] = [];

    if (perfilData?.is_assinante) {
      tarefas.push(
        supabase
          .from('cursos')
          .select('id, nome, niveis(id, nome, ordem, aulas(id, titulo, youtube_id, ordem), tarefas_padrao(id, titulo, descricao))')
          .order('ordem')
          .then(({ data }) => setCursos((data as any) || [])),
        supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', userId)
          .then(({ data }) => setAssistidas(new Set((data || []).map((p: any) => p.aula_id)))),
        supabase.from('progresso_tarefas').select('tarefa_padrao_id').eq('aluno_id', userId)
          .then(({ data }) => setTarefasFeitas(new Set((data || []).map((p: any) => p.tarefa_padrao_id)))),
        supabase.from('certificados').select('nivel_id').eq('aluno_id', userId)
          .then(({ data }) => setCertificados(new Set((data || []).map((c: any) => c.nivel_id)))),
        supabase
          .from('progresso_aulas')
          .select('assistido_em, aulas(titulo, niveis(id, nome, cursos(nome)))')
          .eq('aluno_id', userId)
          .order('assistido_em', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            const aula = (data as any)?.aulas;
            if (aula?.niveis) {
              setContinuarEm({
                nivelId: aula.niveis.id,
                nivelNome: aula.niveis.nome,
                cursoNome: aula.niveis.cursos.nome,
                aulaTitulo: aula.titulo,
              });
            }
          }),
      );
    }

    if (perfilData?.is_aluno_particular) {
      // Conteúdo de um aluno é dele (aluno_id) OU do grupo de estudo que ele integra
      // (grupo_id) — as duas fontes aparecem juntas, com a mesma apresentação.
      const dono = grupoId ? `aluno_id.eq.${userId},grupo_id.eq.${grupoId}` : `aluno_id.eq.${userId}`;
      tarefas.push(
        supabase
          .from('planos_personalizados')
          .select('id, motivo, conteudo, aula_rotulo')
          .or(dono)
          .order('criado_em', { ascending: true })
          .then(({ data }) => setPlanos((data as any) || [])),
        supabase
          .from('tarefas_designadas')
          .select('id, titulo, descricao, status, prazo, aula_rotulo')
          .or(dono)
          .then(({ data }) => setTarefasDesignadas((data as any) || [])),
        supabase
          .from('aulas_particulares_gravadas')
          .select('id, titulo, video_url, data_aula, aula_rotulo')
          .or(dono)
          .order('data_aula', { ascending: true })
          .then(({ data }) => setAulasGravadas((data as any) || [])),
      );
    }

    await Promise.all(tarefas);
    setCarregando(false);
  }

  if (carregando) return <Esqueleto />;
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
            {perfil.grupo_nome && (
              <p className="painel-legenda" style={{ marginTop: -4 }}>Você está no grupo <strong>{perfil.grupo_nome}</strong> — o conteúdo abaixo é o mesmo pra todo o grupo.</p>
            )}

            <SecaoAulaParticular
              aulasGravadas={aulasGravadas}
              planos={planos}
              tarefasDesignadas={tarefasDesignadas}
              hrefPlano="/dashboard/plano"
              chaveContinuar={idUsuario}
            />
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

                    const percentual = totalItens > 0 ? (feitos / totalItens) * 100 : 0;

                    return (
                      <Link href={`/dashboard/nivel/${nivel.id}`} className="painel cartao-nivel cartao-nivel-com-anel" key={nivel.id}>
                        <div className="cartao-nivel-topo">
                          <div>
                            <span className="etiqueta-nivel">{nivel.nome}</span>
                            <p className="painel-titulo">{curso.nome}</p>
                          </div>
                          <AnelProgresso percentual={percentual} />
                        </div>
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
