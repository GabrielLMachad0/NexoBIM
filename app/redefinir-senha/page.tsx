'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function RedefinirSenha() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        setPronto(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem('');

    if (senha.length < 6) {
      setMensagem('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setMensagem('As senhas não são iguais.');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);

    if (error) {
      setMensagem(error.message);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="envolucro" style={{ maxWidth: 420, paddingTop: 80 }}>
      <div className="painel">
        <p className="painel-titulo">Escolher nova senha</p>

        {!pronto ? (
          <p className="painel-legenda">
            Abra essa página a partir do link que chegou no seu e-mail. Se você digitou o endereço
            direto, o link de redefinição ainda não foi validado.
          </p>
        ) : (
          <form onSubmit={salvar}>
            <label className="rotulo" htmlFor="senha">Nova senha</label>
            <input id="senha" type="password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} />

            <label className="rotulo" htmlFor="confirmacao">Confirmar senha</label>
            <input id="confirmacao" type="password" className="campo" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />

            {mensagem && <p className="erro">{mensagem}</p>}

            <button className="botao" type="submit" disabled={carregando} style={{ width: '100%' }}>
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
