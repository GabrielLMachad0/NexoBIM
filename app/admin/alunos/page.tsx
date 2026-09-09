'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Aluno = { id: string; nome: string; is_assinante: boolean; is_aluno_particular: boolean };
type AcessoPendente = { email: string; is_assinante: boolean; is_aluno_particular: boolean; atualizado_em: string };
type Plano = { id: string; motivo: string; conteudo: string };
type TarefaDesignada = { id: string; titulo: string; descricao: string; status: string; prazo: string | null };
type Gravacao = { id: string; titulo: string; video_url: string; data_aula: string };

export default function AdminAlunos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pendentes, setPendentes] = useState<AcessoPendente[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [emailConvite, setEmailConvite] = useState('');
  const [assinanteConvite, setAssinanteConvite] = useState(false);
  const [particularConvite, setParticularConvite] = useState(true);
  const [mensagemConvite, setMensagemConvite] = useState('');

  const [motivo, setMotivo] = useState('');
  const [conteudoPlano, setConteudoPlano] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [prazoTarefa, setPrazoTarefa] = useState('');
  const [tituloGravacao, setTituloGravacao] = useState('');
  const [linkGravacao, setLinkGravacao] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [planosDoAluno, setPlanosDoAluno] = useState<Plano[]>([]);
  const [tarefasDoAluno, setTarefasDoAluno] = useState<TarefaDesignada[]>([]);
  const [gravacoesDoAluno, setGravacoesDoAluno] = useState<Gravacao[]>([]);

  useEffect(() => {
    guardaEcarrega();
  }, []);

  async function guardaEcarrega() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfil?.is_admin) { router.push('/dashboard'); return; }
    await carregar();
    await carregarPendentes();
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

  async function carregarPendentes() {
    const { data } = await supabase
      .from('acessos_pendentes')
      .select('email, is_assinante, is_aluno_particular, atualizado_em')
      .order('atualizado_em', { ascending: false });
    setPendentes((data as any) || []);
  }

  async function liberarAcessoPorEmail(e: React.FormEvent) {
    e.preventDefault();
    const email = emailConvite.trim().toLowerCase();
    if (!email) return;

    const { data: perfilExistente } = await supabase
      .from('profiles')
      .select('id, is_assinante, is_aluno_particular')
      .eq('email', email)
      .maybeSingle();

    if (perfilExistente) {
      await supabase.from('profiles').update({
        is_assinante: assinanteConvite || perfilExistente.is_assinante,
        is_aluno_particular: particularConvite || perfilExistente.is_aluno_particular,
      }).eq('id', perfilExistente.id);
      setMensagemConvite(`${email} já tinha conta — acesso liberado, já pode entrar.`);
      carregar();
    } else {
      const { data: pendenteExistente } = await supabase
        .from('acessos_pendentes')
        .select('is_assinante, is_aluno_particular')
        .eq('email', email)
        .maybeSingle();

      await supabase.from('acessos_pendentes').upsert({
        email,
        is_assinante: assinanteConvite || pendenteExistente?.is_assinante || false,
        is_aluno_particular: particularConvite || pendenteExistente?.is_aluno_particular || false,
        atualizado_em: new Date().toISOString(),
      });
      setMensagemConvite(`Acesso reservado para ${email} — quando essa pessoa criar a conta com esse e-mail em /login, o acesso é liberado na hora.`);
      carregarPendentes();
    }

    setEmailConvite('');
  }

  async function cancelarPendente(email: string) {
    await supabase.from('acessos_pendentes').delete().eq('email', email);
    carregarPendentes();
  }

  async function alternarFlag(aluno: Aluno, campo: 'is_assinante' | 'is_aluno_particular') {
    await supabase.from('profiles').update({ [campo]: !aluno[campo] }).eq('id', aluno.id);
    carregar();
  }

  async function carregarConteudoDoAluno(alunoId: string) {
    const [{ data: planos }, { data: tarefas }, { data: gravacoes }] = await Promise.all([
      supabase.from('planos_personalizados').select('id, motivo, conteudo').eq('aluno_id', alunoId).order('criado_em', { ascending: false }),
      supabase.from('tarefas_designadas').select('id, titulo, descricao, status, prazo').eq('aluno_id', alunoId),
      supabase.from('aulas_particulares_gravadas').select('id, titulo, video_url, data_aula').eq('aluno_id', alunoId).order('data_aula', { ascending: false }),
    ]);
    setPlanosDoAluno((planos as any) || []);
    setTarefasDoAluno((tarefas as any) || []);
    setGravacoesDoAluno((gravacoes as any) || []);
  }

  async function alternarExpandido(alunoId: string) {
    if (expandido === alunoId) {
      setExpandido(null);
      return;
    }
    setExpandido(alunoId);
    await carregarConteudoDoAluno(alunoId);
  }

  async function salvarPlano(alunoId: string) {
    if (!motivo || !conteudoPlano) return;
    await supabase.from('planos_personalizados').insert({ aluno_id: alunoId, motivo, conteudo: conteudoPlano });
    setMotivo(''); setConteudoPlano('');
    setMensagem('Plano de aula adicionado.');
    carregarConteudoDoAluno(alunoId);
  }

  async function salvarTarefa(alunoId: string) {
    if (!tituloTarefa) return;
    await supabase.from('tarefas_designadas').insert({
      aluno_id: alunoId, titulo: tituloTarefa, descricao: descricaoTarefa, prazo: prazoTarefa || null,
    });
    setTituloTarefa(''); setDescricaoTarefa(''); setPrazoTarefa('');
    setMensagem('Tarefa designada.');
    carregarConteudoDoAluno(alunoId);
  }

  async function salvarGravacao(alunoId: string) {
    if (!tituloGravacao || !linkGravacao) return;
    await supabase.from('aulas_particulares_gravadas').insert({
      aluno_id: alunoId, titulo: tituloGravacao, video_url: linkGravacao,
    });
    setTituloGravacao(''); setLinkGravacao('');
    setMensagem('Gravação vinculada — só esse aluno vai conseguir ver.');
    carregarConteudoDoAluno(alunoId);
  }

  async function removerPlano(id: string, alunoId: string) {
    if (!window.confirm('Remover este plano de aula?')) return;
    await supabase.from('planos_personalizados').delete().eq('id', id);
    carregarConteudoDoAluno(alunoId);
  }

  async function removerTarefaDesignada(id: string, alunoId: string) {
    if (!window.confirm('Remover esta tarefa?')) return;
    await supabase.from('tarefas_designadas').delete().eq('id', id);
    carregarConteudoDoAluno(alunoId);
  }

  async function removerGravacao(id: string, alunoId: string) {
    if (!window.confirm('Remover esta gravação?')) return;
    await supabase.from('aulas_particulares_gravadas').delete().eq('id', id);
    carregarConteudoDoAluno(alunoId);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Alunos</h1>

        <div className="painel">
          <p className="painel-titulo">Liberar acesso por e-mail</p>
          <p className="painel-legenda">
            Digite o e-mail da pessoa e marque o tipo de acesso. Se ela ainda não tem conta, o acesso fica
            reservado — assim que criar a conta em <code>/login</code> com esse mesmo e-mail, é liberado
            automaticamente. Se já tiver conta, é liberado na hora.
          </p>
          <form onSubmit={liberarAcessoPorEmail}>
            <input
              className="campo"
              type="email"
              placeholder="e-mail@exemplo.com"
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
              required
            />
            <label style={{ fontSize: 13, marginRight: 16 }}>
              <input type="checkbox" checked={assinanteConvite} onChange={(e) => setAssinanteConvite(e.target.checked)} /> assinante
            </label>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={particularConvite} onChange={(e) => setParticularConvite(e.target.checked)} /> aluno particular
            </label>
            <div style={{ marginTop: 12 }}>
              <button className="botao" type="submit">Liberar acesso</button>
            </div>
          </form>
          {mensagemConvite && <p className="painel-legenda" style={{ marginTop: 12, marginBottom: 0 }}>{mensagemConvite}</p>}

          {pendentes.length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
              <p className="rotulo">Aguardando cadastro</p>
              {pendentes.map((p) => (
                <div className="aula-linha" key={p.email}>
                  <div>
                    <div className="aula-titulo">{p.email}</div>
                    <p className="painel-legenda" style={{ margin: 0 }}>
                      {[p.is_assinante && 'assinante', p.is_aluno_particular && 'aluno particular'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => cancelarPendente(p.email)}>
                    cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
                onClick={() => alternarExpandido(aluno.id)}
              >
                {expandido === aluno.id ? 'fechar' : 'ver / adicionar conteúdo particular'}
              </button>
            </div>

            {expandido === aluno.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
                {planosDoAluno.length > 0 && (
                  <>
                    <label className="rotulo">Planos já cadastrados</label>
                    {planosDoAluno.map((p) => (
                      <div className="aula-linha" key={p.id}>
                        <div>
                          <div className="aula-titulo">{p.motivo}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{p.conteudo}</p>
                        </div>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerPlano(p.id, aluno.id)}>remover</button>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>Plano de aula personalizado</label>
                <input className="campo" placeholder="Motivo / dúvida da aula" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <textarea className="campo" placeholder="Conteúdo do plano" rows={3} value={conteudoPlano} onChange={(e) => setConteudoPlano(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarPlano(aluno.id)}>Salvar plano</button>

                {tarefasDoAluno.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Tarefas já designadas</label>
                    {tarefasDoAluno.map((t) => (
                      <div className="aula-linha" key={t.id}>
                        <div>
                          <div className="aula-titulo">{t.titulo}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{t.descricao} {t.prazo ? `· prazo ${new Date(t.prazo).toLocaleDateString('pt-BR')}` : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={`marcador ${t.status === 'concluida' ? 'feito' : ''}`}>{t.status}</span>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerTarefaDesignada(t.id, aluno.id)}>remover</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>Tarefa designada</label>
                <input className="campo" placeholder="Título" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} />
                <input className="campo" placeholder="Descrição" value={descricaoTarefa} onChange={(e) => setDescricaoTarefa(e.target.value)} />
                <input className="campo" type="date" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarTarefa(aluno.id)}>Designar tarefa</button>

                {gravacoesDoAluno.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Gravações já vinculadas</label>
                    {gravacoesDoAluno.map((g) => (
                      <div className="aula-linha" key={g.id}>
                        <div>
                          <div className="aula-titulo">{g.titulo}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{new Date(g.data_aula).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerGravacao(g.id, aluno.id)}>remover</button>
                      </div>
                    ))}
                  </>
                )}
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
