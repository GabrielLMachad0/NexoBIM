'use client';

import Image from 'next/image';
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
        <Image src="/logo-nexobim-topo.png" alt="NexoBIM" width={80} height={22} priority />
      </a>
      <nav>
        <a href="/dashboard">Meu painel</a>
        <a href="/recursos">Recursos</a>
        {ehAdmin && <a href="/admin">Administração</a>}
        <a href="#" onClick={(e) => { e.preventDefault(); sair(); }}>Sair</a>
      </nav>
    </header>
  );
}
