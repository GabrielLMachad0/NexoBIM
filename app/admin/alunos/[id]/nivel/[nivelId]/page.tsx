'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../../lib/supabaseClient';
import Cabecalho from '../../../../../../components/Cabecalho';
import Esqueleto from '../../../../../../components/Esqueleto';

type Aula = { id: string; titulo: string; descricao: string; youtube_id: string; ordem: number };
type TarefaPadrao = { id: string; titulo: string; descricao: string };
type Nivel = {
  id: string;
  nome: string;
  aulas: Aula[];
  tarefas_padrao: TarefaPadrao[];
  cursos: { nome: string };
};

export default function PreviewNivel() {
  const params = useParams<{ id: string; nivelId: string }>();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [nomeAluno, setNomeAluno] = useState('');
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [assistidas, setAssistidas] = useState<Set<string>>(new Set());
  const [tarefasFeitas, setTarefasFeitas] = useState<Set<string>>(new Set());
  const [certificadoEmitido, setCertificadoEmitido] = useState(false);
  const [aulaSelecionada, setAulaSelecionada] = useState<Aula | null>(null);

  useEffect(() => {
    carregar();
  }, [params.id, params.nivelId]);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfilAdmin } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfilAdmin?.is_admin) { router.push('/dashboard'); return; }
    setEhAdmin(true);

    const alunoId = params.id;

    const [{ data: perfilAluno }, { data: nivelData }, { data: cert }] = await Promise.all([
      supabase.from('profiles').select('nome').eq('id', alunoId).maybeSingle(),
      supabase
        .from('niveis')
        .select('id, nome, curso_id, cursos(nome), aulas(id, titulo, descricao, youtube_id, ordem), tarefas_padrao(id, titulo, descricao)')
        .eq('id', params.nivelId)
        .single(),
      supabase.from('certificados').select('codigo').eq('aluno_id', alunoId).eq('nivel_id', params.nivelId).maybeSingle(),
    ]);

    if (!perfilAluno || !nivelData) { router.push('/admin/alunos'); return; }
    setNomeAluno(perfilAluno.nome);
    setNivel(nivelData as any);
    setCertificadoEmitido(!!cert);

    const aulaIds = ((nivelData as any).aulas as Aula[]).map((a) => a.id);
    const tarefaIds = ((nivelData as any).tarefas_padrao as TarefaPadrao[]).map((t) => t.id);

    await Promise.all([
      aulaIds.length > 0
        ? supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', alunoId).in('aula_id', aulaIds)
            .then(({ data }) => setAssistidas(new Set((data || []).map((p: any) => p.aula_id))))
        : Promise.resolve(),
      tarefaIds.length > 0
        ? supabase.from('progresso_tarefas').select('tarefa_padrao_id').eq('aluno_id', alunoId).in('tarefa_padrao_id', tarefaIds)
            .then(({ data }) => setTarefasFeitas(new Set((data || []).map((p: any) => p.tarefa_padrao_id))))
        : Promise.resolve(),
    ]);

    setCarregando(false);
  }

  if (carregando) return <Esqueleto />;
  if (!nivel) return null;

  const aulasOrdenadas = [...nivel.aulas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro envolucro-nivel">
        <Link href={`/admin/alunos/${params.id}`} className="voltar-link">← Painel de {nomeAluno}</Link>

        <div className="painel" style={{ marginTop: 12, marginBottom: 16, borderColor: 'var(--azul-linha)' }}>
          <span className="etiqueta-nivel">Pré-visualização</span>
          <p className="painel-legenda" style={{ margin: '6px 0 0' }}>Só pra ver a apresentação — assistir aqui não marca nada como concluído para {nomeAluno}.</p>
        </div>

        <p className="painel-legenda" style={{ margin: '4px 0 0' }}>{nivel.cursos.nome}</p>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '2px 0 20px' }}>{nivel.nome}</h1>

        {aulaSelecionada ? (
          <div className="painel player-painel">
            <div className="player-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${aulaSelecionada.youtube_id}`}
                title={aulaSelecionada.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="painel-titulo" style={{ marginTop: 16 }}>{aulaSelecionada.titulo}</p>
            {aulaSelecionada.descricao && <p className="cartao-curso-texto">{aulaSelecionada.descricao}</p>}
            {assistidas.has(aulaSelecionada.id) && <span className="marcador feito">assistida por {nomeAluno}</span>}
          </div>
        ) : (
          <div className="painel player-painel player-vazio">
            <p className="painel-legenda" style={{ margin: 0 }}>Escolha uma aula da lista abaixo para ver como ela aparece.</p>
          </div>
        )}

        <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>Aulas deste nível</p>
        <div className="painel">
          {aulasOrdenadas.length === 0 && <p className="painel-legenda" style={{ margin: 0 }}>Nenhuma aula cadastrada neste nível ainda.</p>}
          {aulasOrdenadas.map((aula) => (
            <button
              key={aula.id}
              className={`aula-linha aula-selecionavel ${aulaSelecionada?.id === aula.id ? 'selecionada' : ''}`}
              onClick={() => setAulaSelecionada(aula)}
            >
              <div>
                <div className="aula-titulo">{aula.titulo}</div>
                {aula.descricao && <p className="painel-legenda" style={{ margin: '2px 0 0' }}>{aula.descricao}</p>}
              </div>
              {assistidas.has(aula.id) && <span className="marcador feito">assistida</span>}
            </button>
          ))}
        </div>

        {nivel.tarefas_padrao.length > 0 && (
          <>
            <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>Tarefas do nível</p>
            <div className="painel">
              {nivel.tarefas_padrao.map((tarefa) => (
                <div className="aula-linha" key={tarefa.id}>
                  <div>
                    <div className="aula-titulo">{tarefa.titulo}</div>
                    {tarefa.descricao && <p className="painel-legenda" style={{ margin: 0 }}>{tarefa.descricao}</p>}
                  </div>
                  <span className={`marcador ${tarefasFeitas.has(tarefa.id) ? 'feito' : ''}`}>
                    {tarefasFeitas.has(tarefa.id) ? 'concluída' : 'pendente'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {certificadoEmitido && (
          <div className="selo-certificado" style={{ marginTop: 16 }}>
            Certificado já emitido para {nomeAluno} neste nível.
          </div>
        )}
      </div>
    </div>
  );
}
