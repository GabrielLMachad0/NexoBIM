'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem('');

    if (!email || !senha) {
      setMensagem('Preencha e-mail e senha.');
      return;
    }

    setCarregando(true);

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setCarregando(false);
      if (error) {
        setMensagem('E-mail ou senha incorretos.');
        return;
      }
      router.push('/dashboard');
    } else {
      if (!nome) {
        setCarregando(false);
        setMensagem('Diga seu nome para criar a conta.');
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      setCarregando(false);
      if (error) {
        setMensagem(error.message);
        return;
      }
      setMensagem('Conta criada. Verifique seu e-mail para confirmar o acesso.');
      setModo('entrar');
    }
  }

  return (
    <div className="envolucro" style={{ maxWidth: 420, paddingTop: 80 }}>
      <div className="painel">
        <p className="painel-titulo">
          {modo === 'entrar' ? 'Entrar na plataforma' : 'Criar conta'}
        </p>
        <p className="painel-legenda">
          {modo === 'entrar'
            ? 'Acesso de assinantes e alunos em aula particular.'
            : 'A liberação do conteúdo é feita depois, pela administração.'}
        </p>

        <form onSubmit={enviar}>
          {modo === 'criar' && (
            <>
              <label className="rotulo" htmlFor="nome">Nome</label>
              <input
                id="nome"
                className="campo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </>
          )}

          <label className="rotulo" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className="campo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="rotulo" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            className="campo"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {mensagem && <p className="erro">{mensagem}</p>}

          <button className="botao" type="submit" disabled={carregando} style={{ width: '100%' }}>
            {carregando ? 'Um momento...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          {modo === 'entrar' ? (
            <>Ainda não tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setModo('criar'); setMensagem(''); }}>Criar uma</a></>
          ) : (
            <>Já tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setModo('entrar'); setMensagem(''); }}>Entrar</a></>
          )}
        </p>
      </div>
    </div>
  );
}
