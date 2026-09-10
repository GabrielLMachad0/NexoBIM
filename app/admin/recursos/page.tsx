'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Recurso = {
  id: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  link_drive: string;
  ordem: number;
  arquivos: number;
  cliques: number;
};

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

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edCategoria, setEdCategoria] = useState('');
  const [edNome, setEdNome] = useState('');
  const [edDescricao, setEdDescricao] = useState('');
  const [edLinkDrive, setEdLinkDrive] = useState('');
  const [edArquivos, setEdArquivos] = useState('1');

  const [verificando, setVerificando] = useState(false);
  const [linksComProblema, setLinksComProblema] = useState<{ id: string; nome: string; categoria: string; status: number }[] | null>(null);

  const [textoImportacao, setTextoImportacao] = useState('');
  const [mensagemImportacao, setMensagemImportacao] = useState('');

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
      .from('recursos_download')
      .select('id, categoria, nome, descricao, link_drive, ordem, arquivos, cliques')
      .order('categoria')
      .order('ordem');
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

  async function remover(id: string, nome: string) {
    if (!window.confirm(`Remover "${nome}" do acervo?`)) return;
    await supabase.from('recursos_download').delete().eq('id', id);
    carregar();
  }

  function iniciarEdicao(r: Recurso) {
    setEditandoId(r.id);
    setEdCategoria(r.categoria);
    setEdNome(r.nome);
    setEdDescricao(r.descricao || '');
    setEdLinkDrive(r.link_drive);
    setEdArquivos(String(r.arquivos));
  }

  function cancelarEdicao() {
    setEditandoId(null);
  }

  async function salvarEdicao(id: string) {
    const numArquivos = parseInt(edArquivos, 10) || 1;
    const { error } = await supabase
      .from('recursos_download')
      .update({
        categoria: edCategoria,
        nome: edNome,
        descricao: edDescricao || null,
        link_drive: edLinkDrive,
        arquivos: numArquivos,
      })
      .eq('id', id);
    if (error) {
      setMensagem('Erro ao salvar: ' + error.message);
      return;
    }
    setEditandoId(null);
    carregar();
  }

  async function importarEmMassa(e: React.FormEvent) {
    e.preventDefault();
    setMensagemImportacao('');

    const linhas = textoImportacao.split('\n').map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) return;

    const contadorPorCategoria = new Map<string, number>();
    for (const r of recursos) {
      contadorPorCategoria.set(r.categoria, (contadorPorCategoria.get(r.categoria) || 0) + 1);
    }

    const linhasInvalidas: number[] = [];
    const novos = linhas.map((linha, indice) => {
      const partes = linha.split(';').map((p) => p.trim());
      const [cat, nomeItem, link, qtd, desc] = partes;
      if (!cat || !nomeItem || !link) {
        linhasInvalidas.push(indice + 1);
        return null;
      }
      const numArquivos = parseInt(qtd, 10) || 1;
      const ordem = contadorPorCategoria.get(cat) || 0;
      contadorPorCategoria.set(cat, ordem + 1);
      return {
        categoria: cat,
        nome: nomeItem,
        link_drive: link,
        arquivos: numArquivos,
        descricao: desc || `${numArquivos} arquivo${numArquivos === 1 ? '' : 's'}`,
        ordem,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (linhasInvalidas.length > 0) {
      setMensagemImportacao(`Linha(s) ${linhasInvalidas.join(', ')} ignorada(s) — faltou categoria, nome ou link.`);
    }
    if (novos.length === 0) return;

    const { error } = await supabase.from('recursos_download').insert(novos);
    if (error) {
      setMensagemImportacao(`Erro ao importar: ${error.message}`);
      return;
    }
    setMensagemImportacao((m) => `${m ? m + ' ' : ''}${novos.length} recurso(s) importado(s) com sucesso.`);
    setTextoImportacao('');
    carregar();
  }

  async function verificarLinks() {
    setVerificando(true);
    setLinksComProblema(null);
    const { data: sessao } = await supabase.auth.getSession();
    const resposta = await fetch('/api/admin/verificar-links', {
      headers: { Authorization: `Bearer ${sessao.session?.access_token}` },
    });
    const dados = await resposta.json();
    setLinksComProblema(dados.comProblema || []);
    setVerificando(false);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  const totalCliques = recursos.reduce((s, r) => s + r.cliques, 0);
  const maisBaixados = [...recursos].sort((a, b) => b.cliques - a.cliques).filter((r) => r.cliques > 0).slice(0, 5);

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

        <div className="painel">
          <p className="painel-titulo">Importar vários de uma vez</p>
          <p className="painel-legenda">
            Uma linha por recurso, campos separados por ponto e vírgula:<br />
            <code>categoria; nome; link do drive; quantidade de arquivos; descrição (opcional)</code>
          </p>
          <form onSubmit={importarEmMassa}>
            <textarea
              className="campo"
              rows={5}
              placeholder={'Esquadrias; Porta de vidro; https://drive.google.com/...; 3\nEstrutura; Coluna redonda; https://drive.google.com/...; 1'}
              value={textoImportacao}
              onChange={(e) => setTextoImportacao(e.target.value)}
            />
            <button className="botao" type="submit">Importar</button>
          </form>
          {mensagemImportacao && <p className="painel-legenda">{mensagemImportacao}</p>}
        </div>

        <div className="painel">
          <p className="painel-titulo">Verificar links quebrados</p>
          <p className="painel-legenda">Testa se cada link do Drive ainda responde (não detecta pasta apagada por dentro, só links totalmente inválidos).</p>
          <button className="botao fantasma" onClick={verificarLinks} disabled={verificando}>
            {verificando ? 'Verificando...' : 'Verificar agora'}
          </button>
          {linksComProblema !== null && (
            linksComProblema.length === 0 ? (
              <p className="painel-legenda" style={{ marginTop: 12, marginBottom: 0 }}>Nenhum problema encontrado.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {linksComProblema.map((r) => (
                  <div className="aula-linha" key={r.id}>
                    <div className="aula-titulo">{r.nome} ({r.categoria})</div>
                    <span className="marcador">status {r.status || 'erro'}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {maisBaixados.length > 0 && (
          <>
            <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>Mais baixados ({totalCliques} cliques no total)</p>
            <div className="painel">
              {maisBaixados.map((r) => (
                <div className="aula-linha" key={r.id}>
                  <div className="aula-titulo">{r.nome}</div>
                  <span className="marcador feito">{r.cliques} clique{r.cliques === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>
          Recursos cadastrados — {recursos.length} itens, {recursos.reduce((s, r) => s + r.arquivos, 0)} arquivos no total
        </p>
        <div className="painel">
          {recursos.map((r) =>
            editandoId === r.id ? (
              <div className="aula-linha" key={r.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <input className="campo" list="categorias-existentes" value={edCategoria} onChange={(e) => setEdCategoria(e.target.value)} placeholder="Categoria" />
                <input className="campo" value={edNome} onChange={(e) => setEdNome(e.target.value)} placeholder="Nome" />
                <input className="campo" type="number" min="1" value={edArquivos} onChange={(e) => setEdArquivos(e.target.value)} placeholder="Qtd. de arquivos" />
                <input className="campo" value={edDescricao} onChange={(e) => setEdDescricao(e.target.value)} placeholder="Descrição" />
                <input className="campo" value={edLinkDrive} onChange={(e) => setEdLinkDrive(e.target.value)} placeholder="Link do Drive" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="botao" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => salvarEdicao(r.id)}>Salvar</button>
                  <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={cancelarEdicao}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="aula-linha" key={r.id}>
                <div>
                  <div className="aula-titulo">{r.nome}</div>
                  <p className="painel-legenda" style={{ margin: 0 }}>
                    {r.categoria}{r.descricao ? ` · ${r.descricao}` : ''}{r.cliques > 0 ? ` · ${r.cliques} clique${r.cliques === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => iniciarEdicao(r)}>Editar</button>
                  <button className="botao fantasma" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remover(r.id, r.nome)}>Remover</button>
                </div>
              </div>
            )
          )}
          {recursos.length === 0 && <p className="painel-legenda" style={{ margin: 0 }}>Nenhum recurso cadastrado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
