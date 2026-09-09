'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Recurso = { id: string; categoria: string; nome: string; descricao: string | null; link_drive: string; ordem: number; arquivos: number };

export default function AdminRecursos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [categoria, setCategoria] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [linkDrive, setLinkDrive] = useState('');
  const [arquivos, setArquivos] = useState('1');
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
    const { data } = await supabase.from('recursos_download').select('id, categoria, nome, descricao, link_drive, ordem, arquivos').order('categoria').order('ordem');
    setRecursos((data as any) || []);
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria || !nome || !linkDrive) return;
    const numArquivos = parseInt(arquivos, 10) || 1;
    const { error } = await supabase.from('recursos_download').insert({
      categoria,
      nome,
      descricao: descricao || `${numArquivos} arquivo${numArquivos === 1 ? '' : 's'}`,
      link_drive: linkDrive,
      arquivos: numArquivos,
      ordem: recursos.filter((r) => r.categoria === categoria).length,
    });
    if (error) {
      setMensagem('Erro ao adicionar: ' + error.message);
      return;
    }
    setNome('');
    setDescricao('');
    setLinkDrive('');
    setArquivos('1');
    setMensagem('Recurso adicionado.');
    carregar();
  }

  async function remover(id: string) {
    await supabase.from('recursos_download').delete().eq('id', id);
    carregar();
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Acervo de recursos</h1>
        <p className="painel-legenda">Links do Google Drive para famílias e projetos de Revit, disponíveis pra qualquer aluno logado.</p>

        <div className="painel">
          <p className="painel-titulo">Adicionar recurso</p>
          <form onSubmit={adicionar}>
            <label className="rotulo">Categoria (agrupa os cards na página do aluno)</label>
            <input className="campo" list="categorias-existentes" placeholder="ex.: Famílias Revit" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
            <datalist id="categorias-existentes">
              {Array.from(new Set(recursos.map((r) => r.categoria))).map((c) => <option value={c} key={c} />)}
            </datalist>
            <label className="rotulo">Nome</label>
            <input className="campo" placeholder="ex.: Bancadas" value={nome} onChange={(e) => setNome(e.target.value)} />
            <label className="rotulo">Quantidade de arquivos dentro da pasta</label>
            <input className="campo" type="number" min="1" value={arquivos} onChange={(e) => setArquivos(e.target.value)} />
            <label className="rotulo">Descrição (opcional — se vazio, usa "N arquivos")</label>
            <input className="campo" placeholder="ex.: Mais de 140 famílias de bancadas" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <label className="rotulo">Link do Google Drive (pasta ou arquivo, com acesso "qualquer um com o link")</label>
            <input className="campo" placeholder="https://drive.google.com/..." value={linkDrive} onChange={(e) => setLinkDrive(e.target.value)} />
            <button className="botao" type="submit">Adicionar</button>
          </form>
          {mensagem && <p className="painel-legenda">{mensagem}</p>}
        </div>

        <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>
          Recursos cadastrados — {recursos.length} itens, {recursos.reduce((s, r) => s + r.arquivos, 0)} arquivos no total
        </p>
        <div className="painel">
          {recursos.map((r) => (
            <div className="aula-linha" key={r.id}>
              <div>
                <div className="aula-titulo">{r.nome}</div>
                <p className="painel-legenda" style={{ margin: 0 }}>{r.categoria}{r.descricao ? ` · ${r.descricao}` : ''}</p>
              </div>
              <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remover(r.id)}>remover</button>
            </div>
          ))}
          {recursos.length === 0 && <p className="painel-legenda" style={{ margin: 0 }}>Nenhum recurso cadastrado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
