'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Cabecalho({ ehAdmin }: { ehAdmin?: boolean }) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="topo">
      <a className="marca" href="/">
        <Image src="/logo-nexobim-topo.png" alt="NexoBIM" width={80} height={22} priority />
      </a>
      <button
        className="botao-menu-mobile"
        aria-label="Abrir menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((v) => !v)}
      >
        {menuAberto ? '✕' : '☰'}
      </button>
      <nav className={menuAberto ? 'nav-mobile-aberto' : ''}>
        <a href="/dashboard" onClick={() => setMenuAberto(false)}>Meu painel</a>
        <a href="/recursos" onClick={() => setMenuAberto(false)}>Recursos</a>
        {ehAdmin && <a href="/admin" onClick={() => setMenuAberto(false)}>Administração</a>}
        <a href="#" onClick={(e) => { e.preventDefault(); sair(); }}>Sair</a>
      </nav>
    </header>
  );
}
