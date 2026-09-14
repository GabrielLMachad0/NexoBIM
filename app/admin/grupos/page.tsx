'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Grupo = { id: string; nome: string; criado_em: string };
type Membro = { id: string; nome: string };
type Plano = { id: string; motivo: string; conteudo: string; aula_rotulo: string | null };
type TarefaDesignada = { id: string; titulo: string; descricao: string; status: string; prazo: string | null; aula_rotulo: string | null };
type Gravacao = { id: string; titulo: string; video_url: string; data_aula: string; aula_rotulo: string | null };

export default function AdminGrupos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alunosParticulares, setAlunosParticulares] = useState<Membro[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [nomeGrupo, setNomeGrupo] = useState('');
  const [membroParaAdicionar, setMembroParaAdicionar] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [motivo, setMotivo] = useState('');
  const [conteudoPlano, setConteudoPlano] = useState('');
  const [rotuloPlano, setRotuloPlano] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [prazoTarefa, setPrazoTarefa] = useState('');
  const [rotuloTarefa, setRotuloTarefa] = useState('');
  const [tituloGravacao, setTituloGravacao] = useState('');
  const [linkGravacao, setLinkGravacao] = useState('');
  const [rotuloGravacao, setRotuloGravacao] = useState('');

  const [membrosDoGrupo, setMembrosDoGrupo] = useState<Membro[]>([]);
  const [planosDoGrupo, setPlanosDoGrupo] = useState<Plano[]>([]);
  const [tarefasDoGrupo, setTarefasDoGrupo] = useState<TarefaDesignada[]>([]);
  const [gravacoesDoGrupo, setGravacoesDoGrupo] = useState<Gravacao[]>([]);

  useEffect(() => {
    guardaEcarrega();
  }, []);

  async function guardaEcarrega() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfil?.is_admin) { router.push('/dashboard'); return; }
    await Promise.all([carregarGrupos(), carregarAlunosParticulares()]);
    setCarregando(false);
  }

  async function carregarGrupos() {
    const { data } = await supabase.from('grupos_estudo').select('id, nome, criado_em').order('criado_em', { ascending: false });
    setGrupos((data as any) || []);
  }

  async function carregarAlunosParticulares() {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('is_aluno_particular', true)
      .order('nome');
    setAlunosParticulares((data as any) || []);
  }

  async function criarGrupo(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeGrupo.trim()) return;
    await supabase.from('grupos_estudo').insert({ nome: nomeGrupo.trim() });
    setNomeGrupo('');
    setMensagem('Grupo criado.');
    carregarGrupos();
  }

  async function removerGrupo(id: string, nome: string) {
    if (!window.confirm(`Remover o grupo "${nome}"? Isso apaga o plano, as tarefas e as gravações do grupo — as alunas voltam a não ter grupo.`)) return;
    await supabase.from('grupos_estudo').delete().eq('id', id);
    if (expandido === id) setExpandido(null);
    carregarGrupos();
  }

  async function carregarConteudoDoGrupo(grupoId: string) {
    const [{ data: membros }, { data: planos }, { data: tarefas }, { data: gravacoes }] = await Promise.all([
      supabase.from('profiles').select('id, nome').eq('grupo_id', grupoId).order('nome'),
      supabase.from('planos_personalizados').select('id, motivo, conteudo, aula_rotulo').eq('grupo_id', grupoId).order('criado_em', { ascending: false }),
      supabase.from('tarefas_designadas').select('id, titulo, descricao, status, prazo, aula_rotulo').eq('grupo_id', grupoId),
      supabase.from('aulas_particulares_gravadas').select('id, titulo, video_url, data_aula, aula_rotulo').eq('grupo_id', grupoId).order('data_aula', { ascending: false }),
    ]);
    setMembrosDoGrupo((membros as any) || []);
    setPlanosDoGrupo((planos as any) || []);
    setTarefasDoGrupo((tarefas as any) || []);
    setGravacoesDoGrupo((gravacoes as any) || []);
  }

  async function alternarExpandido(grupoId: string) {
    if (expandido === grupoId) {
      setExpandido(null);
      return;
    }
    setExpandido(grupoId);
    setMembroParaAdicionar('');
    await carregarConteudoDoGrupo(grupoId);
  }

  async function adicionarMembro(grupoId: string) {
    if (!membroParaAdicionar) return;
    await supabase.from('profiles').update({ grupo_id: grupoId }).eq('id', membroParaAdicionar);
    setMembroParaAdicionar('');
    carregarConteudoDoGrupo(grupoId);
    carregarAlunosParticulares();
  }

  async function removerMembro(alunoId: string, grupoId: string) {
    await supabase.from('profiles').update({ grupo_id: null }).eq('id', alunoId);
    carregarConteudoDoGrupo(grupoId);
    carregarAlunosParticulares();
  }

  async function salvarPlano(grupoId: string) {
    if (!motivo || !conteudoPlano) return;
    await supabase.from('planos_personalizados').insert({ grupo_id: grupoId, motivo, conteudo: conteudoPlano, aula_rotulo: rotuloPlano.trim() || null });
    setMotivo(''); setConteudoPlano(''); setRotuloPlano('');
    carregarConteudoDoGrupo(grupoId);
  }

  async function salvarTarefa(grupoId: string) {
    if (!tituloTarefa) return;
    await supabase.from('tarefas_designadas').insert({
      grupo_id: grupoId, titulo: tituloTarefa, descricao: descricaoTarefa, prazo: prazoTarefa || null, aula_rotulo: rotuloTarefa.trim() || null,
    });
    setTituloTarefa(''); setDescricaoTarefa(''); setPrazoTarefa(''); setRotuloTarefa('');
    carregarConteudoDoGrupo(grupoId);
  }

  async function salvarGravacao(grupoId: string) {
    if (!tituloGravacao || !linkGravacao) return;
    await supabase.from('aulas_particulares_gravadas').insert({
      grupo_id: grupoId, titulo: tituloGravacao, video_url: linkGravacao, aula_rotulo: rotuloGravacao.trim() || null,
    });
    setTituloGravacao(''); setLinkGravacao(''); setRotuloGravacao('');
    carregarConteudoDoGrupo(grupoId);
  }

  async function removerPlano(id: string, grupoId: string) {
    if (!window.confirm('Remover este plano de aula do grupo?')) return;
    await supabase.from('planos_personalizados').delete().eq('id', id);
    carregarConteudoDoGrupo(grupoId);
  }

  async function removerTarefaDesignada(id: string, grupoId: string) {
    if (!window.confirm('Remover esta tarefa do grupo?')) return;
    await supabase.from('tarefas_designadas').delete().eq('id', id);
    carregarConteudoDoGrupo(grupoId);
  }

  async function removerGravacao(id: string, grupoId: string) {
    if (!window.confirm('Remover esta gravação do grupo?')) return;
    await supabase.from('aulas_particulares_gravadas').delete().eq('id', id);
    carregarConteudoDoGrupo(grupoId);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  const alunosSemGrupo = alunosParticulares.filter((a) => !membrosDoGrupo.some((m) => m.id === a.id));

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Grupos de estudo</h1>
        <p className="painel-legenda">
          Alunas particulares que seguem o mesmo plano de aula podem ficar no mesmo grupo — o plano, as tarefas
          e as gravações que você adicionar aqui aparecem, com a mesma apresentação, pra todo mundo do grupo.
        </p>

        <div className="painel">
          <p className="painel-titulo">Criar grupo</p>
          <form onSubmit={criarGrupo}>
            <input className="campo" placeholder="Nome do grupo (ex.: Turma de terça 19h)" value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} />
            <button className="botao" type="submit">Criar grupo</button>
          </form>
          {mensagem && <p className="painel-legenda" style={{ marginTop: 12, marginBottom: 0 }}>{mensagem}</p>}
        </div>

        {grupos.length === 0 && (
          <div className="painel">
            <p className="painel-legenda" style={{ margin: 0 }}>Nenhum grupo criado ainda.</p>
          </div>
        )}

        {grupos.map((grupo) => (
          <div className="painel" key={grupo.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <p className="painel-titulo" style={{ margin: 0 }}>{grupo.nome}</p>
              <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removerGrupo(grupo.id, grupo.nome)}>Remover grupo</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className="botao fantasma"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => alternarExpandido(grupo.id)}
              >
                {expandido === grupo.id ? 'Fechar' : 'Ver / gerenciar grupo'}
              </button>
            </div>

            {expandido === grupo.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
                <label className="rotulo">Integrantes do grupo</label>
                {membrosDoGrupo.length === 0 && (
                  <p className="painel-legenda" style={{ marginTop: 0 }}>Ninguém neste grupo ainda.</p>
                )}
                {membrosDoGrupo.map((m) => (
                  <div className="aula-linha" key={m.id}>
                    <div className="aula-titulo">{m.nome}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/admin/alunos/${m.id}`} className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }}>Visualizar página →</Link>
                      <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerMembro(m.id, grupo.id)}>Remover do grupo</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <select className="campo" style={{ marginBottom: 0 }} value={membroParaAdicionar} onChange={(e) => setMembroParaAdicionar(e.target.value)}>
                    <option value="">Escolha quem adicionar...</option>
                    {alunosSemGrupo.map((a) => <option value={a.id} key={a.id}>{a.nome}</option>)}
                  </select>
                  <button className="botao fantasma" style={{ whiteSpace: 'nowrap' }} onClick={() => adicionarMembro(grupo.id)}>Adicionar ao grupo</button>
                </div>
                <p className="painel-legenda" style={{ marginTop: 6 }}>
                  Só aparecem aqui pessoas marcadas como "Aluno particular" em <code>/admin/alunos</code> e que ainda não estão em outro grupo.
                </p>

                {planosDoGrupo.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 20 }}>Planos já cadastrados</label>
                    {planosDoGrupo.map((p) => (
                      <div className="aula-linha" key={p.id}>
                        <div>
                          <div className="aula-titulo">{p.motivo}{p.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{p.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{p.conteudo}</p>
                        </div>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerPlano(p.id, grupo.id)}>Remover</button>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>Plano de aula do grupo</label>
                <input className="campo" placeholder="Motivo / dúvida da aula" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <textarea className="campo" placeholder="Conteúdo do plano" rows={3} value={conteudoPlano} onChange={(e) => setConteudoPlano(e.target.value)} />
                <input className="campo" placeholder="Aula (opcional — ex.: Aula 1 e 2 — deixe vazio se for o plano geral do curso)" value={rotuloPlano} onChange={(e) => setRotuloPlano(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarPlano(grupo.id)}>Salvar plano</button>

                {tarefasDoGrupo.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Tarefas já designadas</label>
                    {tarefasDoGrupo.map((t) => (
                      <div className="aula-linha" key={t.id}>
                        <div>
                          <div className="aula-titulo">{t.titulo}{t.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{t.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{t.descricao} {t.prazo ? `· prazo ${new Date(t.prazo).toLocaleDateString('pt-BR')}` : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={`marcador ${t.status === 'concluida' ? 'feito' : ''}`}>{t.status}</span>
                          <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerTarefaDesignada(t.id, grupo.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>Tarefa designada ao grupo</label>
                <input className="campo" placeholder="Título" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} />
                <input className="campo" placeholder="Descrição" value={descricaoTarefa} onChange={(e) => setDescricaoTarefa(e.target.value)} />
                <input className="campo" type="date" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} />
                <input className="campo" placeholder="Aula (opcional — ex.: Aula 1 e 2)" value={rotuloTarefa} onChange={(e) => setRotuloTarefa(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarTarefa(grupo.id)}>Designar tarefa</button>
                <p className="painel-legenda" style={{ marginTop: 6 }}>
                  O status da tarefa é único pro grupo inteiro — quando alguém do grupo (ou você) marcar como entregue/concluída, vale pra todo mundo do grupo.
                </p>

                {gravacoesDoGrupo.length > 0 && (
                  <>
                    <label className="rotulo" style={{ marginTop: 16 }}>Gravações já vinculadas</label>
                    {gravacoesDoGrupo.map((g) => (
                      <div className="aula-linha" key={g.id}>
                        <div>
                          <div className="aula-titulo">{g.titulo}{g.aula_rotulo && <span className="marcador" style={{ marginLeft: 8 }}>{g.aula_rotulo}</span>}</div>
                          <p className="painel-legenda" style={{ margin: 0 }}>{new Date(g.data_aula).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerGravacao(g.id, grupo.id)}>Remover</button>
                      </div>
                    ))}
                  </>
                )}
                <label className="rotulo" style={{ marginTop: 16 }}>Aula gravada do grupo (link do Teams)</label>
                <input className="campo" placeholder="Título (ex.: Aula 12/09)" value={tituloGravacao} onChange={(e) => setTituloGravacao(e.target.value)} />
                <input className="campo" placeholder="Link da gravação" value={linkGravacao} onChange={(e) => setLinkGravacao(e.target.value)} />
                <input className="campo" placeholder="Aula (rótulo — ex.: Aula 1 e 2)" value={rotuloGravacao} onChange={(e) => setRotuloGravacao(e.target.value)} />
                <button className="botao fantasma" onClick={() => salvarGravacao(grupo.id)}>Vincular gravação</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
