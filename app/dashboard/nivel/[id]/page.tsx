'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import Cabecalho from '../../../../components/Cabecalho';

type Aula = { id: string; titulo: string; descricao: string; youtube_id: string; ordem: number };
type TarefaPadrao = { id: string; titulo: string; descricao: string };
type Nivel = {
  id: string;
  nome: string;
  ordem: number;
  curso_id: string;
  aulas: Aula[];
  tarefas_padrao: TarefaPadrao[];
  cursos: { nome: string };
};

export default function NivelPage() {
  const params = useParams<{ id: string }>();
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
  }, [params.id]);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.push('/login');
      return;
    }
    const userId = sessao.session.user.id;

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('nome, is_assinante, is_admin')
      .eq('id', userId)
      .single();

    if (!perfilData?.is_assinante) {
      router.push('/dashboard');
      return;
    }
    setEhAdmin(!!perfilData.is_admin);
    setNomeAluno(perfilData.nome);

    const { data: nivelData } = await supabase
      .from('niveis')
      .select('id, nome, ordem, curso_id, cursos(nome), aulas(id, titulo, descricao, youtube_id, ordem), tarefas_padrao(id, titulo, descricao)')
      .eq('id', params.id)
      .single();

    if (!nivelData) {
      router.push('/dashboard');
      return;
    }
    setNivel(nivelData as any);

    const aulaIds = ((nivelData as any).aulas as Aula[]).map((a) => a.id);
    if (aulaIds.length > 0) {
      const { data: progAulas } = await supabase
        .from('progresso_aulas')
        .select('aula_id')
        .eq('aluno_id', userId)
        .in('aula_id', aulaIds);
      setAssistidas(new Set((progAulas || []).map((p: any) => p.aula_id)));
    }

    const tarefaIds = ((nivelData as any).tarefas_padrao as TarefaPadrao[]).map((t) => t.id);
    if (tarefaIds.length > 0) {
      const { data: progTarefas } = await supabase
        .from('progresso_tarefas')
        .select('tarefa_padrao_id')
        .eq('aluno_id', userId)
        .in('tarefa_padrao_id', tarefaIds);
      setTarefasFeitas(new Set((progTarefas || []).map((p: any) => p.tarefa_padrao_id)));
    }

    const { data: cert } = await supabase
      .from('certificados')
      .select('id')
      .eq('aluno_id', userId)
      .eq('nivel_id', params.id)
      .maybeSingle();
    setCertificadoEmitido(!!cert);

    setCarregando(false);
  }

  async function marcarAulaAssistida(aulaId: string) {
    const { data: sessao } = await supabase.auth.getSession();
    const userId = sessao.session!.user.id;
    await supabase.from('progresso_aulas').upsert({ aluno_id: userId, aula_id: aulaId });
    setAssistidas((s) => new Set(s).add(aulaId));
  }

  async function marcarTarefaFeita(tarefaId: string) {
    const { data: sessao } = await supabase.auth.getSession();
    const userId = sessao.session!.user.id;
    await supabase.from('progresso_tarefas').upsert({ aluno_id: userId, tarefa_padrao_id: tarefaId });
    setTarefasFeitas((s) => new Set(s).add(tarefaId));
  }

  async function gerarCertificado() {
    if (!nivel) return;
    const { data: sessao } = await supabase.auth.getSession();
    const userId = sessao.session!.user.id;

    if (!certificadoEmitido) {
      await supabase.from('certificados').insert({ aluno_id: userId, nivel_id: nivel.id });
      setCertificadoEmitido(true);
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(24);
    doc.text('Certificado de conclusão', 148, 60, { align: 'center' });
    doc.setFontSize(16);
    doc.text(nomeAluno, 148, 90, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`concluiu o nível "${nivel.nome}" do curso "${nivel.cursos.nome}"`, 148, 105, { align: 'center' });
    doc.text(new Date().toLocaleDateString('pt-BR'), 148, 120, { align: 'center' });
    doc.save(`certificado-${nivel.nome}.pdf`);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;
  if (!nivel) return null;

  const aulasOrdenadas = [...nivel.aulas].sort((a, b) => a.ordem - b.ordem);
  const totalItens = nivel.aulas.length + nivel.tarefas_padrao.length;
  const feitos = nivel.aulas.filter((a) => assistidas.has(a.id)).length + nivel.tarefas_padrao.filter((t) => tarefasFeitas.has(t.id)).length;
  const completo = totalItens > 0 && feitos === totalItens;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro envolucro-nivel">
        <Link href="/dashboard" className="voltar-link">← Meus cursos</Link>
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
            {assistidas.has(aulaSelecionada.id) ? (
              <span className="marcador feito">assistida</span>
            ) : (
              <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => marcarAulaAssistida(aulaSelecionada.id)}>
                marcar como assistida
              </button>
            )}
          </div>
        ) : (
          <div className="painel player-painel player-vazio">
            <p className="painel-legenda" style={{ margin: 0 }}>Escolha uma aula da lista abaixo para assistir.</p>
          </div>
        )}

        <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>Aulas deste nível</p>
        <div className="painel">
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
                  {tarefasFeitas.has(tarefa.id) ? (
                    <span className="marcador feito">concluída</span>
                  ) : (
                    <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => marcarTarefaFeita(tarefa.id)}>
                      marcar como concluída
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {completo && (
          <div style={{ marginTop: 16 }}>
            {certificadoEmitido ? (
              <div className="selo-certificado">Certificado emitido para este nível.</div>
            ) : (
              <button className="botao selo" onClick={gerarCertificado}>Gerar certificado</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
