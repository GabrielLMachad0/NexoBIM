'use client';

import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Cabecalho({ ehAdmin }: { ehAdmin?: boolean }) {
  const router = useRouter();

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="topo">
      <a className="marca" href="/">
        Nexo<span>BIM</span>
      </a>
      <nav>
        <a href="/dashboard">Meu painel</a>
        {ehAdmin && <a href="/admin">Administração</a>}
        <a href="#" onClick={(e) => { e.preventDefault(); sair(); }}>Sair</a>
      </nav>
    </header>
  );
}
