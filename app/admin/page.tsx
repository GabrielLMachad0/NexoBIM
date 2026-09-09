'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Cabecalho from '../../components/Cabecalho';

type Curso = { id: string; nome: string };

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminHome() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [novoCurso, setNovoCurso] = useState('');
  const [cursoParaNivel, setCursoParaNivel] = useState('');
  const [novoNivel, setNovoNivel] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    guardaEcarrega();
  }, []);

  async function guardaEcarrega() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', sessao.session.user.id)
      .single();

    if (!perfil?.is_admin) { router.push('/dashboard'); return; }

    await carregarCursos();
    setCarregando(false);
  }

  async function carregarCursos() {
    const { data } = await supabase.from('cursos').select('id, nome').order('ordem');
    setCursos((data as any) || []);
  }

  async function criarCurso(e: React.FormEvent) {
    e.preventDefault();
    if (!novoCurso) return;
    await supabase.from('cursos').insert({ nome: novoCurso, slug: slugificar(novoCurso), ordem: cursos.length });
    setNovoCurso('');
    setMensagem('Curso criado.');
    carregarCursos();
  }

  async function criarNivel(e: React.FormEvent) {
    e.preventDefault();
    if (!cursoParaNivel || !novoNivel) return;
    const { count } = await supabase
      .from('niveis')
      .select('id', { count: 'exact', head: true })
      .eq('curso_id', cursoParaNivel);
    await supabase.from('niveis').insert({ curso_id: cursoParaNivel, nome: novoNivel, ordem: (count || 0) + 1 });
    setNovoNivel('');
    setMensagem('Nível criado.');
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Administração</h1>

        <div className="painel">
          <p className="painel-titulo">Conteúdo</p>
          <p className="painel-legenda">Cursos, níveis e vídeo aulas.</p>
          <a className="botao" href="/admin/aulas">Gerenciar aulas</a>
        </div>

        <div className="painel">
          <p className="painel-titulo">Métricas</p>
          <p className="painel-legenda">Alunos ativos, progresso por nível e aula mais assistida.</p>
          <a className="botao" href="/admin/metricas">Ver métricas</a>
        </div>

        <div className="painel">
          <p className="painel-titulo">Alunos</p>
          <p className="painel-legenda">Liberar acesso e adicionar conteúdo personalizado.</p>
          <a className="botao" href="/admin/alunos">Gerenciar alunos</a>
        </div>

        <div className="painel">
          <p className="painel-titulo">Novo curso</p>
          <form onSubmit={criarCurso}>
            <input className="campo" placeholder="Nome do curso (ex.: Revit)" value={novoCurso} onChange={(e) => setNovoCurso(e.target.value)} />
            <button className="botao" type="submit">Criar curso</button>
          </form>
        </div>

        <div className="painel">
          <p className="painel-titulo">Novo nível</p>
          <select className="campo" value={cursoParaNivel} onChange={(e) => setCursoParaNivel(e.target.value)}>
            <option value="">Escolha o curso</option>
            {cursos.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}
          </select>
          <form onSubmit={criarNivel}>
            <input className="campo" placeholder="Nome do nível (ex.: Fundamentos)" value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} />
            <button className="botao" type="submit">Criar nível</button>
          </form>
        </div>

        {mensagem && <p className="painel-legenda">{mensagem}</p>}
      </div>
    </div>
  );
}
