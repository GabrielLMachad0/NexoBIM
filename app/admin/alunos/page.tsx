'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Aluno = { id: string; nome: string; is_assinante: boolean; is_aluno_particular: boolean };

export default function AdminAlunos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [motivo, setMotivo] = useState('');
  const [conteudoPlano, setConteudoPlano] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [prazoTarefa, setPrazoTarefa] = useState('');
  const [tituloGravacao, setTituloGravacao] = useState('');
  const [linkGravacao, setLinkGravacao] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    guardaEcarrega();
  }, []);

  async function guardaEcarrega() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfil?.is_admin) { router.push('/dashboard'); return; }
    await carregar();
    setCarregando(false);
  }

  async function carregar() {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, is_assinante, is_aluno_particular')
      .eq('is_admin', false)
      .order('nome');
    setAlunos((data as any) || []);
  }

  async function alternarFlag(aluno: Aluno, campo: 'is_assinante' | 'is_aluno_particular') {
    await supabase.from('profiles').update({ [campo]: !aluno[campo] }).eq('id', aluno.id);
    carregar();
  }

  async function salvarPlano(alunoId: string) {
    if (!motivo || !conteudoPlano) return;
    await supabase.from('planos_personalizados').insert({ aluno_id: alunoId, motivo, conteudo: conteudoPlano });
    setMotivo(''); setConteudoPlano('');
    setMensagem('Plano de aula adicionado.');
  }

  async function salvarTarefa(alunoId: string) {
    if (!tituloTarefa) return;
    await supabase.from('tarefas_designadas').insert({
      aluno_id: alunoId, titulo: tituloTarefa, descricao: descricaoTarefa, prazo: prazoTarefa || null,
    });
    setTituloTarefa(''); setDescricaoTarefa(''); setPrazoTarefa('');
    setMensagem('Tarefa designada.');
  }

  async function salvarGravacao(alunoId: string) {
    if (!tituloGravacao || !linkGravacao) return;
    await supabase.from('aulas_particulares_gravadas').insert({
      aluno_id: alunoId, titulo: tituloGravacao, video_url: linkGravacao,
    });
    setTituloGravacao(''); setLinkGravacao('');
    setMensagem('Gravação vinculada — só esse aluno vai conseguir ver.');
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Alunos</h1>

        {alunos.map((aluno) => (
          <div className="painel" key={aluno.id}>
            <p className="painel-titulo">{aluno.nome}</p>

            <label style={{ fontSize: 13, marginRight: 16 }}>
              <input type="checkbox" checked={aluno.is_assinante} onChange={() => alternarFlag(aluno, 'is_assinante')} /> assinante
            </label>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={aluno.is_aluno_particular} onChange={() => alternarFlag(aluno, 'is_aluno_particular')} /> aluno particular
            </label>

            <div style={{ marginTop: 12 }}>
              <button
                className="botao fantasma"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setExpandido(expandido === aluno.id ? null : aluno.id)}
              >
                {expandido === aluno.id ? 'fechar' : 'adicionar conteúdo particular'}
              </button>
            </div>

            {expandido === aluno.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
                <label className="rotulo">Plano de aula personalizado</label>
                <input className="campo" placeholder="Motivo / dúvida da aula" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <textarea className="campo" placeholder="Conteúdo do plano" rows={3} value={conteudoPlano} onChange={(e) => setConteudoPlano(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarPlano(aluno.id)}>Salvar plano</button>

                <label className="rotulo" style={{ marginTop: 16 }}>Tarefa designada</label>
                <input className="campo" placeholder="Título" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} />
                <input className="campo" placeholder="Descrição" value={descricaoTarefa} onChange={(e) => setDescricaoTarefa(e.target.value)} />
                <input className="campo" type="date" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarTarefa(aluno.id)}>Designar tarefa</button>

                <label className="rotulo" style={{ marginTop: 16 }}>Aula particular gravada (link do Teams)</label>
                <input className="campo" placeholder="Título (ex.: Aula 12/09)" value={tituloGravacao} onChange={(e) => setTituloGravacao(e.target.value)} />
                <input className="campo" placeholder="Link da gravação" value={linkGravacao} onChange={(e) => setLinkGravacao(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarGravacao(aluno.id)}>Vincular gravação</button>
              </div>
            )}
          </div>
        ))}

        {mensagem && <p className="painel-legenda">{mensagem}</p>}
      </div>
    </div>
  );
}
