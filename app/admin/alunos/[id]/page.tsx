'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import Cabecalho from '../../../../components/Cabecalho';
import AnelProgresso from '../../../../components/AnelProgresso';
import { comLinksClicaveis } from '../../../../lib/linkify';

type Aula = { id: string; ordem: number };
type TarefaPadrao = { id: string };
type Nivel = { id: string; nome: string; ordem: number; aulas: Aula[]; tarefas_padrao: TarefaPadrao[] };
type Curso = { id: string; nome: string; niveis: Nivel[] };

type TarefaDesignada = { id: string; titulo: string; descricao: string; status: string; prazo: string | null };
type PlanoPersonalizado = { id: string; motivo: string; conteudo: string };
type AulaGravada = { id: string; titulo: string; video_url: string; data_aula: string };

type PerfilAluno = {
  nome: string;
  email: string | null;
  is_assinante: boolean;
  is_aluno_particular: boolean;
  grupo_id: string | null;
  grupo_nome: string | null;
};

export default function PreviewAluno() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [assistidas, setAssistidas] = useState<Set<string>>(new Set());
  const [tarefasFeitas, setTarefasFeitas] = useState<Set<string>>(new Set());
  const [certificados, setCertificados] = useState<Set<string>>(new Set());

  const [planos, setPlanos] = useState<PlanoPersonalizado[]>([]);
  const [tarefasDesignadas, setTarefasDesignadas] = useState<TarefaDesignada[]>([]);
  const [aulasGravadas, setAulasGravadas] = useState<AulaGravada[]>([]);

  useEffect(() => {
    carregar();
  }, [params.id]);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfilAdmin } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfilAdmin?.is_admin) { router.push('/dashboard'); return; }
    setEhAdmin(true);

    const alunoId = params.id;
    const { data: perfilData } = await supabase
      .from('profiles')
      .select('nome, email, is_assinante, is_aluno_particular, grupo_id, grupos_estudo(nome)')
      .eq('id', alunoId)
      .maybeSingle();

    if (!perfilData) { router.push('/admin/alunos'); return; }

    const grupoId = (perfilData as any).grupo_id as string | null;
    setPerfil({
      nome: perfilData.nome,
      email: (perfilData as any).email,
      is_assinante: perfilData.is_assinante,
      is_aluno_particular: perfilData.is_aluno_particular,
      grupo_id: grupoId,
      grupo_nome: (perfilData as any).grupos_estudo?.nome || null,
    });

    const tarefas: PromiseLike<void>[] = [];

    if (perfilData.is_assinante) {
      tarefas.push(
        supabase
          .from('cursos')
          .select('id, nome, niveis(id, nome, ordem, aulas(id, ordem), tarefas_padrao(id))')
          .order('ordem')
          .then(({ data }) => setCursos((data as any) || [])),
        supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', alunoId)
          .then(({ data }) => setAssistidas(new Set((data || []).map((p: any) => p.aula_id)))),
        supabase.from('progresso_tarefas').select('tarefa_padrao_id').eq('aluno_id', alunoId)
          .then(({ data }) => setTarefasFeitas(new Set((data || []).map((p: any) => p.tarefa_padrao_id)))),
        supabase.from('certificados').select('nivel_id').eq('aluno_id', alunoId)
          .then(({ data }) => setCertificados(new Set((data || []).map((c: any) => c.nivel_id)))),
      );
    }

    if (perfilData.is_aluno_particular) {
      const dono = grupoId ? `aluno_id.eq.${alunoId},grupo_id.eq.${grupoId}` : `aluno_id.eq.${alunoId}`;
      tarefas.push(
        supabase.from('planos_personalizados').select('id, motivo, conteudo').or(dono).order('criado_em', { ascending: false })
          .then(({ data }) => setPlanos((data as any) || [])),
        supabase.from('tarefas_designadas').select('id, titulo, descricao, status, prazo').or(dono)
          .then(({ data }) => setTarefasDesignadas((data as any) || [])),
        supabase.from('aulas_particulares_gravadas').select('id, titulo, video_url, data_aula').or(dono).order('data_aula', { ascending: false })
          .then(({ data }) => setAulasGravadas((data as any) || [])),
      );
    }

    await Promise.all(tarefas);
    setCarregando(false);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;
  if (!perfil) return null;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <Link href="/admin/alunos" className="voltar-link">← Alunos</Link>

        <div className="painel" style={{ marginTop: 12, borderColor: 'var(--azul-linha)' }}>
          <span className="etiqueta-nivel">Pré-visualização</span>
          <p className="painel-titulo" style={{ marginTop: 6 }}>É assim que {perfil.nome} vê o painel dela</p>
          <p className="painel-legenda" style={{ margin: 0 }}>
            {[perfil.is_assinante && 'assinante', perfil.is_aluno_particular && 'aluno particular', perfil.grupo_nome && `grupo: ${perfil.grupo_nome}`]
              .filter(Boolean).join(' · ') || 'sem acesso liberado ainda'}
          </p>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Olá, {perfil.nome}</h1>

        {!perfil.is_assinante && !perfil.is_aluno_particular && (
          <div className="painel">
            <p className="painel-titulo">Esta conta ainda não tem acesso liberado</p>
            <p className="painel-legenda">É isso que ela vê até você liberar assinatura ou aula particular em <Link href="/admin/alunos">/admin/alunos</Link>.</p>
          </div>
        )}

        {perfil.is_aluno_particular && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--texto-suave)', marginTop: 28 }}>Sua aula particular</h2>
            {perfil.grupo_nome && (
              <p className="painel-legenda" style={{ marginTop: -4 }}>Ela está no grupo <strong>{perfil.grupo_nome}</strong> — o conteúdo abaixo é o mesmo pra todo o grupo.</p>
            )}

            {aulasGravadas.length === 0 && planos.length === 0 && tarefasDesignadas.length === 0 && (
              <div className="painel">
                <p className="painel-legenda" style={{ margin: 0 }}>Nada cadastrado ainda — adicione plano, tarefa ou gravação em <Link href="/admin/alunos">/admin/alunos</Link>{perfil.grupo_nome && <> ou <Link href="/admin/grupos">/admin/grupos</Link></>}.</p>
              </div>
            )}

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
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{comLinksClicaveis(p.conteudo)}</p>
              </div>
            ))}

            {tarefasDesignadas.length > 0 && (
              <div className="painel">
                <p className="painel-titulo">Suas tarefas</p>
                {tarefasDesignadas.map((t) => (
                  <div className="aula-linha" key={t.id} style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="aula-titulo">{t.titulo}</div>
                      <p className="painel-legenda" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comLinksClicaveis(t.descricao)}</p>
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
                      <Link href={`/admin/alunos/${params.id}/nivel/${nivel.id}`} className="painel cartao-nivel cartao-nivel-com-anel" key={nivel.id}>
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
