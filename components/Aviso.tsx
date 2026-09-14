'use client';

import { useEffect, useState } from 'react';

// Aviso fixo no topo da tela — aparece mesmo se o admin já tiver rolado a
// página pra baixo (por exemplo dentro de um grupo ou aluno expandido),
// diferente de uma mensagem perdida lá no início da página.
export default function Aviso({ texto }: { texto: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!texto) return;
    setVisivel(true);
    const tempo = setTimeout(() => setVisivel(false), 5000);
    return () => clearTimeout(tempo);
  }, [texto]);

  if (!texto || !visivel) return null;

  const ehErro = /não deu|erro/i.test(texto);

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        maxWidth: 'min(90vw, 480px)',
        padding: '10px 16px',
        borderRadius: 6,
        fontSize: 13,
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        background: ehErro ? '#3a1c1c' : 'var(--painel)',
        border: `1px solid ${ehErro ? '#ff6b6b' : 'var(--azul-linha)'}`,
        color: ehErro ? '#ff9b9b' : 'var(--texto)',
      }}
    >
      {texto}
    </div>
  );
}
