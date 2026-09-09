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

async function imagemComoDataUrl(caminho: string): Promise<string | null> {
  try {
    const resposta = await fetch(caminho);
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(leitor.result as string);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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
  const [codigoCertificado, setCodigoCertificado] = useState<string | null>(null);
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
      .select('codigo')
      .eq('aluno_id', userId)
      .eq('nivel_id', params.id)
      .maybeSingle();
    setCertificadoEmitido(!!cert);
    setCodigoCertificado(cert?.codigo ?? null);

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

    let codigo = codigoCertificado;
    if (!certificadoEmitido) {
      codigo = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
      await supabase.from('certificados').insert({ aluno_id: userId, nivel_id: nivel.id, codigo });
      setCertificadoEmitido(true);
      setCodigoCertificado(codigo);
    }

    const urlVerificacao = `${window.location.origin}/certificado/${codigo}`;
    const logo = await imagemComoDataUrl('/logo-nexobim-preto.png');
    const QRCode = (await import('qrcode')).default;
    const qrCode = await QRCode.toDataURL(urlVerificacao, { margin: 1, width: 200 });

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    const largura = doc.internal.pageSize.getWidth();
    const meio = largura / 2;

    const CIANO = '#05e0e0';
    const CIANO_TEXTO = '#027373';
    const CARVAO = '#1a1a1c';
    const CINZA = '#5b5b60';

    doc.setFillColor(CIANO);
    doc.rect(0, 0, largura, 6, 'F');

    doc.setDrawColor(CARVAO);
    doc.setLineWidth(0.6);
    doc.rect(10, 14, largura - 20, 182);

    if (logo) {
      const logoLargura = 62;
      const logoAltura = logoLargura / (2490 / 1004);
      doc.addImage(logo, 'PNG', meio - logoLargura / 2, 24, logoLargura, logoAltura);
    }

    const qrTamanho = 24;
    doc.addImage(qrCode, 'PNG', largura - 20 - qrTamanho - 4, 20, qrTamanho, qrTamanho);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(CINZA);
    doc.text('escaneie para validar', largura - 20 - qrTamanho / 2 - 4, 20 + qrTamanho + 4, { align: 'center' });

    doc.setTextColor(CARVAO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Certificado de Conclusão', meio, 68, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(CINZA);
    doc.text('Este certificado confere a', meio, 80, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(CIANO_TEXTO);
    doc.text(nomeAluno, meio, 94, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(CARVAO);
    doc.text(
      `a conclusão do nível "${nivel.nome}", do curso "${nivel.cursos.nome}", na plataforma NexoBIM.`,
      meio, 105, { align: 'center' },
    );

    const temas = aulasOrdenadas.map((a) => a.titulo).join('  ·  ');
    doc.setFontSize(9);
    doc.setTextColor(CINZA);
    doc.text('Temas abordados:', meio, 118, { align: 'center' });
    const linhasTemas = doc.splitTextToSize(temas, largura - 60);
    doc.text(linhasTemas, meio, 124, { align: 'center' });

    const yRodape = 178;
    doc.setDrawColor('#cccccc');
    doc.setLineWidth(0.2);
    doc.line(20, yRodape, largura - 20, yRodape);

    doc.setFontSize(9);
    doc.setTextColor(CINZA);
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 20, yRodape + 8);
    doc.text(`Código de verificação: ${codigo}`, largura - 20, yRodape + 8, { align: 'right' });
    doc.text(`Verifique em ${urlVerificacao}`, meio, yRodape + 8, { align: 'center' });

    doc.save(`certificado-nexobim-${nivel.nome}.pdf`);
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
              <div className="selo-certificado">
                Certificado emitido para este nível.
                <br />
                Código de verificação: <strong>{codigoCertificado}</strong> —{' '}
                <a href={`/certificado/${codigoCertificado}`} target="_blank" rel="noreferrer">ver validação</a>
                <div style={{ marginTop: 12 }}>
                  <button className="botao fantasma" onClick={gerarCertificado}>Baixar PDF novamente</button>
                </div>
              </div>
            ) : (
              <button className="botao selo" onClick={gerarCertificado}>Gerar certificado</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
