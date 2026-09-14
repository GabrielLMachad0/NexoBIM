'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';
import { Genero } from '../../../lib/genero';
import Esqueleto from '../../../components/Esqueleto';

export default function MeuPerfil() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<Genero>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLinkSenha, setEnviandoLinkSenha] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfil } = await supabase
      .from('profiles')
      .select('nome, email, genero, is_admin')
      .eq('id', sessao.session.user.id)
      .single();
    if (perfil) {
      setNome(perfil.nome);
      setEmail(perfil.email || sessao.session.user.email || '');
      setGenero((perfil as any).genero);
      setEhAdmin(!!perfil.is_admin);
    }
    setCarregando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setMensagem('');
    const { error } = await supabase.from('profiles').update({ nome: nome.trim(), genero: genero || null }).eq('id', (await supabase.auth.getUser()).data.user!.id);
    setSalvando(false);
    setMensagem(error ? 'Não deu para salvar — tenta de novo.' : 'Dados salvos.');
  }

  async function enviarLinkSenha() {
    setEnviandoLinkSenha(true);
    setMensagem('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviandoLinkSenha(false);
    setMensagem(error ? error.message : 'Enviamos um link para você escolher uma nova senha.');
  }

  if (carregando) return <Esqueleto />;

  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro" style={{ maxWidth: 480 }}>
        <Link href="/dashboard" className="voltar-link">← Meu painel</Link>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Meu perfil</h1>

        <div className="painel">
          <form onSubmit={salvar}>
            <label className="rotulo" htmlFor="nome">Nome</label>
            <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />

            <label className="rotulo" htmlFor="genero">Como prefere ser chamado(a)?</label>
            <select id="genero" className="campo" value={genero ?? ''} onChange={(e) => setGenero((e.target.value || null) as Genero)}>
              <option value="">Prefiro não dizer</option>
              <option value="feminino">Aluna</option>
              <option value="masculino">Aluno</option>
            </select>

            <label className="rotulo" htmlFor="email">E-mail</label>
            <input id="email" className="campo" value={email} disabled style={{ opacity: 0.6 }} />
            <p className="painel-legenda" style={{ marginTop: -8 }}>O e-mail não pode ser alterado por aqui — fale com a administração.</p>

            <button className="botao" type="submit" disabled={salvando} style={{ width: '100%', marginTop: 8 }}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
            <p className="painel-titulo" style={{ marginBottom: 4 }}>Senha</p>
            <p className="painel-legenda">Enviamos um link no seu e-mail para você escolher uma nova senha.</p>
            <button className="botao fantasma" onClick={enviarLinkSenha} disabled={enviandoLinkSenha}>
              {enviandoLinkSenha ? 'Enviando...' : 'Enviar link para redefinir senha'}
            </button>
          </div>

          {mensagem && <p className="painel-legenda" style={{ marginTop: 16 }}>{mensagem}</p>}
        </div>
      </div>
    </div>
  );
}
