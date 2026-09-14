'use client';

import { useState } from 'react';
import { comLinksClicaveis } from '../lib/linkify';

// Plano de ensino do nível (currículo padrão, igual para todo assinante) —
// mostrado retraído por padrão pra não competir com a lista de aulas, mas
// sempre visível como link no topo da página.
export default function PainelPlanoDeEnsino({ conteudo }: { conteudo: string | null }) {
  const [aberto, setAberto] = useState(false);

  if (!conteudo) return null;

  return (
    <div className="painel" style={{ marginBottom: 20 }}>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0 }}
      >
        <span className="etiqueta-nivel">Plano de ensino</span>
        <p className="painel-legenda" style={{ margin: '4px 0 0', color: 'var(--azul-linha)' }}>
          {aberto ? 'Recolher ↑' : 'Ver o que este nível cobre →'}
        </p>
      </button>
      {aberto && <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', marginTop: 12, marginBottom: 0 }}>{comLinksClicaveis(conteudo)}</p>}
    </div>
  );
}
