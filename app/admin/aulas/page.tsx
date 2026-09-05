'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Aula = { id: string; titulo: string; youtube_id: string; ordem: number };
type TarefaPadrao = { id: string; titulo: string };
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
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
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
      .from('cursos')
      .select('id, nome, niveis(id, nome, curso_id, aulas(id, titulo, youtube_id, ordem), tarefas_padrao(id, titulo))')
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
      youtube_id: extrairYoutubeId(linkVideo),
      ordem: (nivel?.aulas.length || 0) + 1,
    });
    setTituloAula('');
    setLinkVideo('');
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
                {nivel.aulas.map((a) => (
                  <div className="aula-linha" key={a.id}>
                    <span className="aula-titulo">{a.titulo}</span>
                    <span className="marcador">{a.youtube_id}</span>
                  </div>
                ))}
                {nivel.tarefas_padrao.map((t) => (
                  <div className="aula-linha" key={t.id}>
                    <span className="aula-titulo">{t.titulo}</span>
                    <span className="marcador">tarefa</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
