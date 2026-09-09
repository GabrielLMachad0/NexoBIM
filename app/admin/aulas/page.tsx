'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Aula = { id: string; titulo: string; youtube_id: string; ordem: number; descricao: string };
type TarefaPadrao = { id: string; titulo: string; descricao: string };
type Nivel = { id: string; nome: string; curso_id: string; aulas: Aula[]; tarefas_padrao: TarefaPadrao[] };
type Curso = { id: string; nome: string; niveis: Nivel[] };

function extrairYoutubeId(entrada: string): string {
  const linkado = entrada.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (linkado) return linkado[1];
  return entrada.trim();
}

export default function AdminAulas() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [nivelEscolhido, setNivelEscolhido] = useState('');
  const [tituloAula, setTituloAula] = useState('');
  const [linkVideo, setLinkVideo] = useState('');
  const [descricaoAula, setDescricaoAula] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [aulaEditandoId, setAulaEditandoId] = useState<string | null>(null);
  const [edTitulo, setEdTitulo] = useState('');
  const [edLink, setEdLink] = useState('');
  const [edDescricao, setEdDescricao] = useState('');

  const [tarefaEditandoId, setTarefaEditandoId] = useState<string | null>(null);
  const [edTituloTarefa, setEdTituloTarefa] = useState('');
  const [edDescricaoTarefa, setEdDescricaoTarefa] = useState('');

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
      .from('cursos')
      .select('id, nome, niveis(id, nome, curso_id, aulas(id, titulo, descricao, youtube_id, ordem), tarefas_padrao(id, titulo, descricao))')
      .order('ordem');
    setCursos((data as any) || []);
  }

  async function adicionarAula(e: React.FormEvent) {
    e.preventDefault();
    if (!nivelEscolhido || !tituloAula || !linkVideo) return;
    const nivel = cursos.flatMap((c) => c.niveis).find((n) => n.id === nivelEscolhido);
    await supabase.from('aulas').insert({
      nivel_id: nivelEscolhido,
      titulo: tituloAula,
      descricao: descricaoAula,
      youtube_id: extrairYoutubeId(linkVideo),
      ordem: (nivel?.aulas.length || 0) + 1,
    });
    setTituloAula('');
    setLinkVideo('');
    setDescricaoAula('');
    setMensagem('Aula adicionada.');
    carregar();
  }

  async function adicionarTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!nivelEscolhido || !tituloTarefa) return;
    await supabase.from('tarefas_padrao').insert({
      nivel_id: nivelEscolhido,
      titulo: tituloTarefa,
      descricao: descricaoTarefa,
    });
    setTituloTarefa('');
    setDescricaoTarefa('');
    setMensagem('Tarefa adicionada.');
    carregar();
  }

  function iniciarEdicaoAula(a: Aula) {
    setAulaEditandoId(a.id);
    setEdTitulo(a.titulo);
    setEdLink(a.youtube_id);
    setEdDescricao(a.descricao || '');
  }

  async function salvarAula(id: string) {
    await supabase.from('aulas').update({
      titulo: edTitulo,
      descricao: edDescricao,
      youtube_id: extrairYoutubeId(edLink),
    }).eq('id', id);
    setAulaEditandoId(null);
    carregar();
  }

  async function removerAula(id: string) {
    await supabase.from('aulas').delete().eq('id', id);
    carregar();
  }

  async function moverAula(nivel: Nivel, aula: Aula, direcao: -1 | 1) {
    const ordenadas = [...nivel.aulas].sort((a, b) => a.ordem - b.ordem);
    const indice = ordenadas.findIndex((a) => a.id === aula.id);
    const vizinho = ordenadas[indice + direcao];
    if (!vizinho) return;
    await Promise.all([
      supabase.from('aulas').update({ ordem: vizinho.ordem }).eq('id', aula.id),
      supabase.from('aulas').update({ ordem: aula.ordem }).eq('id', vizinho.id),
    ]);
    carregar();
  }

  function iniciarEdicaoTarefa(t: TarefaPadrao) {
    setTarefaEditandoId(t.id);
    setEdTituloTarefa(t.titulo);
    setEdDescricaoTarefa(t.descricao || '');
  }

  async function salvarTarefa(id: string) {
    await supabase.from('tarefas_padrao').update({ titulo: edTituloTarefa, descricao: edDescricaoTarefa }).eq('id', id);
    setTarefaEditandoId(null);
    carregar();
  }

  async function removerTarefa(id: string) {
    await supabase.from('tarefas_padrao').delete().eq('id', id);
    carregar();
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  const todosNiveis = cursos.flatMap((c) => c.niveis.map((n) => ({ ...n, nomeCurso: c.nome })));

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Aulas e tarefas</h1>

        <div className="painel">
          <p className="painel-titulo">Adicionar a um nível</p>
          <select className="campo" value={nivelEscolhido} onChange={(e) => setNivelEscolhido(e.target.value)}>
            <option value="">Escolha o nível</option>
            {todosNiveis.map((n) => (
              <option value={n.id} key={n.id}>{n.nomeCurso} — {n.nome}</option>
            ))}
          </select>

          <form onSubmit={adicionarAula}>
            <label className="rotulo">Nova aula</label>
            <input className="campo" placeholder="Título da aula" value={tituloAula} onChange={(e) => setTituloAula(e.target.value)} />
            <input className="campo" placeholder="Link ou ID do vídeo no YouTube" value={linkVideo} onChange={(e) => setLinkVideo(e.target.value)} />
            <input className="campo" placeholder="Descrição (opcional)" value={descricaoAula} onChange={(e) => setDescricaoAula(e.target.value)} />
            <button className="botao" type="submit">Adicionar aula</button>
          </form>

          <form onSubmit={adicionarTarefa} style={{ marginTop: 20 }}>
            <label className="rotulo">Nova tarefa do nível</label>
            <input className="campo" placeholder="Título da tarefa" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} />
            <input className="campo" placeholder="Descrição" value={descricaoTarefa} onChange={(e) => setDescricaoTarefa(e.target.value)} />
            <button className="botao" type="submit">Adicionar tarefa</button>
          </form>

          {mensagem && <p className="painel-legenda">{mensagem}</p>}
        </div>

        {cursos.map((curso) => (
          <div className="painel" key={curso.id}>
            <p className="painel-titulo">{curso.nome}</p>
            {curso.niveis.map((nivel) => (
              <div key={nivel.id} style={{ marginTop: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: '8px 0 4px' }}>{nivel.nome}</p>
                {[...nivel.aulas].sort((a, b) => a.ordem - b.ordem).map((a, indice) =>
                  aulaEditandoId === a.id ? (
                    <div className="aula-linha" key={a.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <input className="campo" value={edTitulo} onChange={(e) => setEdTitulo(e.target.value)} placeholder="Título" />
                      <input className="campo" value={edLink} onChange={(e) => setEdLink(e.target.value)} placeholder="Link/ID do YouTube" />
                      <input className="campo" value={edDescricao} onChange={(e) => setEdDescricao(e.target.value)} placeholder="Descrição" />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="botao" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => salvarAula(a.id)}>Salvar</button>
                        <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setAulaEditandoId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="aula-linha" key={a.id}>
                      <span className="aula-titulo">{a.titulo}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="marcador">{a.youtube_id}</span>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} disabled={indice === 0} onClick={() => moverAula(nivel, a, -1)}>↑</button>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} disabled={indice === nivel.aulas.length - 1} onClick={() => moverAula(nivel, a, 1)}>↓</button>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => iniciarEdicaoAula(a)}>editar</button>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerAula(a.id)}>remover</button>
                      </div>
                    </div>
                  )
                )}
                {nivel.tarefas_padrao.map((t) =>
                  tarefaEditandoId === t.id ? (
                    <div className="aula-linha" key={t.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <input className="campo" value={edTituloTarefa} onChange={(e) => setEdTituloTarefa(e.target.value)} placeholder="Título" />
                      <input className="campo" value={edDescricaoTarefa} onChange={(e) => setEdDescricaoTarefa(e.target.value)} placeholder="Descrição" />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="botao" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => salvarTarefa(t.id)}>Salvar</button>
                        <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setTarefaEditandoId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="aula-linha" key={t.id}>
                      <span className="aula-titulo">{t.titulo}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="marcador">tarefa</span>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => iniciarEdicaoTarefa(t)}>editar</button>
                        <button className="botao fantasma" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removerTarefa(t.id)}>remover</button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
