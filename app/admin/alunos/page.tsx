'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';
import Aviso from '../../../components/Aviso';
import { porGenero } from '../../../lib/genero';
import Esqueleto from '../../../components/Esqueleto';

type Aluno = { id: string; nome: string; is_assinante: boolean; is_aluno_particular: boolean; grupo_id: string | null; genero: 'masculino' | 'feminino' | null };
type AcessoPendente = { email: string; is_assinante: boolean; is_aluno_particular: boolean; grupo_id: string | null; atualizado_em: string };
type Grupo = { id: string; nome: string };
type Plano = { id: string; motivo: string; conteudo: string; aula_rotulo: string | null };
type TarefaDesignada = { id: string; titulo: string; descricao: string; status: string; prazo: string | null; aula_rotulo: string | null };
type Gravacao = { id: string; titulo: string; video_url: string; data_aula: string; aula_rotulo: string | null };

export default function AdminAlunos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [grupoParaSelecionados, setGrupoParaSelecionados] = useState('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [pendentes, setPendentes] = useState<AcessoPendente[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [emailConvite, setEmailConvite] = useState('');
  const [assinanteConvite, setAssinanteConvite] = useState(false);
  const [particularConvite, setParticularConvite] = useState(true);
  const [grupoConvite, setGrupoConvite] = useState('');
  const [mensagemConvite, setMensagemConvite] = useState('');

  const [motivo, setMotivo] = useState('');
  const [conteudoPlano, setConteudoPlano] = useState('');
  const [rotuloPlano, setRotuloPlano] = useState('');
  const [editandoPlanoId, setEditandoPlanoId] = useState<string | null>(null);
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [prazoTarefa, setPrazoTarefa] = useState('');
  const [rotuloTarefa, setRotuloTarefa] = useState('');
  const [editandoTarefaId, setEditandoTarefaId] = useState<string | null>(null);
  const [tituloGravacao, setTituloGravacao] = useState('');
  const [linkGravacao, setLinkGravacao] = useState('');
  const [rotuloGravacao, setRotuloGravacao] = useState('');
  const [editandoGravacaoId, setEditandoGravacaoId] = useState<string | null>(null);
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
    await Promise.all([carregar(), carregarPendentes(), carregarGrupos()]);
    setCarregando(false);
  }

  async function carregar() {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, is_assinante, is_aluno_particular, grupo_id, genero')
      .eq('is_admin', false)
      .order('nome');
    setAlunos((data as any) || []);
  }

  async function carregarGrupos() {
    const { data } = await supabase.from('grupos_estudo').select('id, nome').order('nome');
    setGrupos((data as any) || []);
  }

  async function alterarGrupoDoAluno(alunoId: string, grupoId: string) {
    const { error } = await supabase.from('profiles').update({ grupo_id: grupoId || null }).eq('id', alunoId);
    if (error) { setMensagem(`Não deu para trocar o grupo: ${error.message}`); return; }
    carregar();
  }

  function alternarSelecionado(alunoId: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(alunoId)) novo.delete(alunoId); else novo.add(alunoId);
      return novo;
    });
  }

  async function adicionarSelecionadosAoGrupo() {
    if (!grupoParaSelecionados || selecionados.size === 0) return;
    const ids = Array.from(selecionados);
    const { error } = await supabase.from('profiles').update({ grupo_id: grupoParaSelecionados }).in('id', ids);
    if (error) { setMensagem(`Não deu para adicionar ao grupo: ${error.message}`); return; }
    setMensagem(`${ids.length} aluno${ids.length === 1 ? '' : 's'} adicionado${ids.length === 1 ? '' : 's'} ao grupo.`);
    setSelecionados(new Set());
    setGrupoParaSelecionados('');
    carregar();
  }

  async function liberarFlagSelecionados(campo: 'is_assinante' | 'is_aluno_particular') {
    if (selecionados.size === 0) return;
    const ids = Array.from(selecionados);
    const { error } = await supabase.from('profiles').update({ [campo]: true }).in('id', ids);
    if (error) { setMensagem(`Não deu para atualizar: ${error.message}`); return; }
    setMensagem(`${ids.length} aluno${ids.length === 1 ? '' : 's'} atualizado${ids.length === 1 ? '' : 's'}.`);
    setSelecionados(new Set());
    carregar();
  }

  function exportarCsv() {
    const cabecalho = ['Nome', 'Assinante', 'Aluno particular', 'Grupo de estudo'];
    const linhasCsv = alunos.map((a) => [
      a.nome,
      a.is_assinante ? 'sim' : 'não',
      a.is_aluno_particular ? 'sim' : 'não',
      grupos.find((g) => g.id === a.grupo_id)?.nome || '',
    ]);
    const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
    const csv = [cabecalho, ...linhasCsv].map((linha) => linha.map(escapar).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alunos-nexobim-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function carregarPendentes() {
    const { data } = await supabase
      .from('acessos_pendentes')
      .select('email, is_assinante, is_aluno_particular, grupo_id, atualizado_em')
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
      const { error } = await supabase.from('profiles').update({
        is_assinante: assinanteConvite || perfilExistente.is_assinante,
        is_aluno_particular: particularConvite || perfilExistente.is_aluno_particular,
        ...(grupoConvite ? { grupo_id: grupoConvite } : {}),
      }).eq('id', perfilExistente.id);
      if (error) {
        setMensagemConvite(`Não deu para liberar o acesso de ${email}: ${error.message}`);
        return;
      }
      setMensagemConvite(`${email} já tinha conta — acesso liberado, já pode entrar.`);
      carregar();
    } else {
      const { data: pendenteExistente } = await supabase
        .from('acessos_pendentes')
        .select('is_assinante, is_aluno_particular, grupo_id')
        .eq('email', email)
        .maybeSingle();

      const { error } = await supabase.from('acessos_pendentes').upsert({
        email,
        is_assinante: assinanteConvite || pendenteExistente?.is_assinante || false,
        is_aluno_particular: particularConvite || pendenteExistente?.is_aluno_particular || false,
        grupo_id: grupoConvite || pendenteExistente?.grupo_id || null,
        atualizado_em: new Date().toISOString(),
      });
      if (error) {
        setMensagemConvite(`Não deu para reservar o acesso de ${email}: ${error.message}`);
        return;
      }
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
    const { error } = await supabase.from('profiles').update({ [campo]: !aluno[campo] }).eq('id', aluno.id);
    if (error) { setMensagem(`Não deu para atualizar: ${error.message}`); return; }
    carregar();
  }

  async function carregarConteudoDoAluno(alunoId: string) {
    const [{ data: planos }, { data: tarefas }, { data: gravacoes }] = await Promise.all([
      supabase.from('planos_personalizados').select('id, motivo, conteudo, aula_rotulo').eq('aluno_id', alunoId).order('criado_em', { ascending: false }),
      supabase.from('tarefas_designadas').select('id, titulo, descricao, status, prazo, aula_rotulo').eq('aluno_id', alunoId),
      supabase.from('aulas_particulares_gravadas').select('id, titulo, video_url, data_aula, aula_rotulo').eq('aluno_id', alunoId).order('data_aula', { ascending: false }),
    ]);
    setPlanosDoAluno((planos as any) || []);
    setTarefasDoAluno((tarefas as any) || []);
    setGravacoesDoAluno((gravacoes as any) || []);
  }

  async function alternarExpandido(alunoId: string) {
    cancelarEdicaoPlano(); cancelarEdicaoTarefa(); cancelarEdicaoGravacao();
    if (expandido === alunoId) {
      setExpandido(null);
      return;
    }
    setExpandido(alunoId);
    await carregarConteudoDoAluno(alunoId);
  }

  function editarPlano(p: Plano) {
    setEditandoPlanoId(p.id);
    setMotivo(p.motivo); setConteudoPlano(p.conteudo); setRotuloPlano(p.aula_rotulo || '');
  }

  function cancelarEdicaoPlano() {
    setEditandoPlanoId(null);
    setMotivo(''); setConteudoPlano(''); setRotuloPlano('');
  }

  async function salvarPlano(alunoId: string) {
    if (!motivo || !conteudoPlano) return;
    const dados = { motivo, conteudo: conteudoPlano, aula_rotulo: rotuloPlano.trim() || null };
    const { error } = editandoPlanoId
      ? await supabase.from('planos_personalizados').update(dados).eq('id', editandoPlanoId)
      : await supabase.from('planos_personalizados').insert({ aluno_id: alunoId, ...dados });
    if (error) { setMensagem(`Não deu para salvar o plano: ${error.message}`); return; }
    setMensagem(editandoPlanoId ? 'Plano de aula atualizado.' : 'Plano de aula adicionado.');
    cancelarEdicaoPlano();
    carregarConteudoDoAluno(alunoId);
  }

  function editarTarefa(t: TarefaDesignada) {
    setEditandoTarefaId(t.id);
    setTituloTarefa(t.titulo); setDescricaoTarefa(t.descricao); setPrazoTarefa(t.prazo || ''); setRotuloTarefa(t.aula_rotulo || '');
  }

  function cancelarEdicaoTarefa() {
    setEditandoTarefaId(null);
    setTituloTarefa(''); setDescricaoTarefa(''); setPrazoTarefa(''); setRotuloTarefa('');
  }

  async function salvarTarefa(alunoId: string) {
    if (!tituloTarefa) return;
    const dados = { titulo: tituloTarefa, descricao: descricaoTarefa, prazo: prazoTarefa || null, aula_rotulo: rotuloTarefa.trim() || null };
    const { error } = editandoTarefaId
      ? await supabase.from('tarefas_designadas').update(dados).eq('id', editandoTarefaId)
      : await supabase.from('tarefas_designadas').insert({ aluno_id: alunoId, ...dados });
    if (error) { setMensagem(`Não deu para salvar a tarefa: ${error.message}`); return; }
    setMensagem(editandoTarefaId ? 'Tarefa atualizada.' : 'Tarefa designada.');
    cancelarEdicaoTarefa();
    carregarConteudoDoAluno(alunoId);
  }

  function editarGravacao(g: Gravacao) {
    setEditandoGravacaoId(g.id);
    setTituloGravacao(g.titulo); setLinkGravacao(g.video_url); setRotuloGravacao(g.aula_rotulo || '');
  }

  function cancelarEdicaoGravacao() {
    setEditandoGravacaoId(null);
    setTituloGravacao(''); setLinkGravacao(''); setRotuloGravacao('');
  }

  async function salvarGravacao(alunoId: string) {
    if (!tituloGravacao || !linkGravacao) return;
    const dados = { titulo: tituloGravacao, video_url: linkGravacao, aula_rotulo: rotuloGravacao.trim() || null };
    const { error } = editandoGravacaoId
      ? await supabase.from('aulas_particulares_gravadas').update(dados).eq('id', editandoGravacaoId)
      : await supabase.from('aulas_particulares_gravadas').insert({ aluno_id: alunoId, ...dados });
    if (error) { setMensagem(`Não deu para salvar a gravação: ${error.message}`); return; }
    setMensagem(editandoGravacaoId ? 'Gravação atualizada.' : 'Gravação vinculada — só esse aluno vai conseguir ver.');
    cancelarEdicaoGravacao();
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

  const alunosFiltrados = busca.trim()
    ? alunos.filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : alunos;

  if (carregando) return <Esqueleto />;

  return (
    <div>
      <Cabecalho ehAdmin />
      <Aviso texto={mensagem} />
      <div className="envolucro">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Alunos</h1>
          {alunos.length > 0 && (
            <button className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }} onClick={exportarCsv}>
              Exportar CSV
            </button>
          )}
        </div>

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
              <input type="checkbox" checked={assinanteConvite} onChange={(e) => setAssinanteConvite(e.target.checked)} /> Assinante
            </label>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={particularConvite} onChange={(e) => setParticularConvite(e.target.checked)} /> Aluno particular
            </label>
            {particularConvite && grupos.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="rotulo" style={{ margin: 0 }}>Grupo de estudo (opcional)</label>
                <select className="campo" style={{ marginBottom: 0, width: 'auto' }} value={grupoConvite} onChange={(e) => setGrupoConvite(e.target.value)}>
                  <option value="">Nenhum</option>
                  {grupos.map((g) => <option value={g.id} key={g.id}>{g.nome}</option>)}
                </select>
              </div>
            )}
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
                      {[
                        p.is_assinante && 'assinante',
                        p.is_aluno_particular && 'aluno particular',
                        p.grupo_id && `grupo: ${grupos.find((g) => g.id === p.grupo_id)?.nome || '—'}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => cancelarPendente(p.email)}>
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {alunos.length > 5 && (
          <input
            className="campo"
            placeholder="Buscar aluno pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        )}

        {alunosFiltrados.length === 0 && busca && (
          <div className="painel">
            <p className="painel-legenda" style={{ margin: 0 }}>Nenhum aluno com "{busca}" no nome.</p>
          </div>
        )}

        {selecionados.size > 0 && (
          <div className="painel" style={{ borderColor: 'var(--azul-linha)' }}>
            <p className="painel-titulo" style={{ margin: 0 }}>{selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              <button className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => liberarFlagSelecionados('is_assinante')}>
                Marcar como assinante
              </button>
              <button className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => liberarFlagSelecionados('is_aluno_particular')}>
                Marcar como aluno particular
              </button>
              {grupos.length > 0 && (
                <>
                  <select className="campo" style={{ marginBottom: 0, width: 'auto' }} value={grupoParaSelecionados} onChange={(e) => setGrupoParaSelecionados(e.target.value)}>
                    <option value="">Escolha um grupo...</option>
                    {grupos.map((g) => <option value={g.id} key={g.id}>{g.nome}</option>)}
                  </select>
                  <button className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }} onClick={adicionarSelecionadosAoGrupo} disabled={!grupoParaSelecionados}>
                    Adicionar ao grupo
                  </button>
                </>
              )}
              <button className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSelecionados(new Set())}>
                Limpar seleção
              </button>
            </div>
          </div>
        )}

        {alunosFiltrados.map((aluno) => (
          <div className="painel" key={aluno.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                style={{ marginTop: 4 }}
                checked={selecionados.has(aluno.id)}
                onChange={() => alternarSelecionado(aluno.id)}
                aria-label={`Selecionar ${aluno.nome}`}
              />
              <p className="painel-titulo" style={{ margin: 0 }}>{aluno.nome}</p>
            </div>

            <label style={{ fontSize: 13, marginRight: 16 }}>
              <input type="checkbox" checked={aluno.is_assinante} onChange={() => alternarFlag(aluno, 'is_assinante')} /> Assinante
            </label>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={aluno.is_aluno_particular} onChange={() => alternarFlag(aluno, 'is_aluno_particular')} /> Aluno particular
            </label>

            {aluno.is_aluno_particular && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="rotulo" style={{ margin: 0 }}>Grupo de estudo</label>
                <select
                  className="campo"
                  style={{ marginBottom: 0, width: 'auto' }}
                  value={aluno.grupo_id || ''}
                  onChange={(e) => alterarGrupoDoAluno(aluno.id, e.target.value)}
                >
                  <option value="">Nenhum (conteúdo individual)</option>
                  {grupos.map((g) => <option value={g.id} key={g.id}>{g.nome}</option>)}
                </select>
              </div>
            )}

            {aluno.grupo_id && (
              <p className="painel-legenda" style={{ marginTop: 8, marginBottom: 0 }}>
                {porGenero(aluno.genero, aluno.nome, { masculino: 'Este aluno está', feminino: 'Esta aluna está', neutro: `${aluno.nome} está` })} no grupo{' '}
                <strong>{grupos.find((g) => g.id === aluno.grupo_id)?.nome}</strong> — o plano de aula, as tarefas e as gravações do
                grupo aparecem {porGenero(aluno.genero, aluno.nome, { masculino: 'pra ele', feminino: 'pra ela', neutro: 'pra essa pessoa' })} automaticamente.{' '}
                <Link href="/admin/grupos">Gerenciar conteúdo do grupo →</Link>
              </p>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="botao fantasma"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => alternarExpandido(aluno.id)}
              >
                {expandido === aluno.id ? 'Fechar' : 'Ver / adicionar conteúdo particular'}
              </button>
              <Link href={`/admin/alunos/${aluno.id}`} className="botao fantasma" style={{ fontSize: 12, padding: '4px 10px' }}>
                {porGenero(aluno.genero, aluno.nome, { masculino: 'Visualizar página dele', feminino: 'Visualizar página dela', neutro: 'Visualizar página' })} →
              </Link>
            </div>

            {expandido === aluno.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
                {planosDoAluno.length > 0 && (
                  <>
                    <label className="rotulo">Planos já cadastrados</label>
                    {planosDoAluno.map((p) => (
                      <div className="aula-linha" key={p.id}>
                        <div>
                          <div className="aula-titulo">{p.motivo}{p.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{p.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{p.conteudo}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => editarPlano(p)}>Editar</button>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerPlano(p.id, aluno.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>{editandoPlanoId ? 'Editando plano de aula' : 'Plano de aula personalizado'}</label>
                <input className="campo" placeholder="Motivo / dúvida da aula" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <textarea className="campo" placeholder="Conteúdo do plano" rows={3} value={conteudoPlano} onChange={(e) => setConteudoPlano(e.target.value)} />
                <input className="campo" placeholder="Aula (opcional — ex.: Aula 1 e 2 — deixe vazio se for o plano geral do curso)" value={rotuloPlano} onChange={(e) => setRotuloPlano(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="botao fantasma" onClick={() => salvarPlano(aluno.id)}>{editandoPlanoId ? 'Atualizar plano' : 'Salvar plano'}</button>
                  {editandoPlanoId && <button className="botao fantasma" onClick={cancelarEdicaoPlano}>Cancelar</button>}
                </div>

                {tarefasDoAluno.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Tarefas já designadas</label>
                    {tarefasDoAluno.map((t) => (
                      <div className="aula-linha" key={t.id}>
                        <div>
                          <div className="aula-titulo">{t.titulo}{t.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{t.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{t.descricao} {t.prazo ? `· prazo ${new Date(t.prazo).toLocaleDateString('pt-BR')}` : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={`marcador ${t.status === 'concluida' ? 'feito' : ''}`}>{t.status}</span>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => editarTarefa(t)}>Editar</button>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerTarefaDesignada(t.id, aluno.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>{editandoTarefaId ? 'Editando tarefa' : 'Tarefa designada'}</label>
                <input className="campo" placeholder="Título" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} />
                <input className="campo" placeholder="Descrição" value={descricaoTarefa} onChange={(e) => setDescricaoTarefa(e.target.value)} />
                <input className="campo" type="date" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} />
                <input className="campo" placeholder="Aula (opcional — ex.: Aula 1 e 2)" value={rotuloTarefa} onChange={(e) => setRotuloTarefa(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="botao fantasma" onClick={() => salvarTarefa(aluno.id)}>{editandoTarefaId ? 'Atualizar tarefa' : 'Designar tarefa'}</button>
                  {editandoTarefaId && <button className="botao fantasma" onClick={cancelarEdicaoTarefa}>Cancelar</button>}
                </div>

                {gravacoesDoAluno.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Gravações já vinculadas</label>
                    {gravacoesDoAluno.map((g) => (
                      <div className="aula-linha" key={g.id}>
                        <div>
                          <div className="aula-titulo">{g.titulo}{g.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{g.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{new Date(g.data_aula).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => editarGravacao(g)}>Editar</button>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerGravacao(g.id, aluno.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>{editandoGravacaoId ? 'Editando gravação' : 'Aula particular gravada (link do Teams)'}</label>
                <input className="campo" placeholder="Título (ex.: Aula 12/09)" value={tituloGravacao} onChange={(e) => setTituloGravacao(e.target.value)} />
                <input className="campo" placeholder="Link da gravação" value={linkGravacao} onChange={(e) => setLinkGravacao(e.target.value)} />
                <input className="campo" placeholder="Aula (rótulo — ex.: Aula 1 e 2)" value={rotuloGravacao} onChange={(e) => setRotuloGravacao(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="botao fantasma" onClick={() => salvarGravacao(aluno.id)}>{editandoGravacaoId ? 'Atualizar gravação' : 'Vincular gravação'}</button>
                  {editandoGravacaoId && <button className="botao fantasma" onClick={cancelarEdicaoGravacao}>Cancelar</button>}
                </div>
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}
