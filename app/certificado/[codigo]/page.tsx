'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../../../lib/supabaseClient';

type Resultado = { nome_aluno: string; nivel: string; curso: string; emitido_em: string };

export default function VerificarCertificado() {
  const params = useParams<{ codigo: string }>();
  const [carregando, setCarregando] = useState(true);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    verificar();
  }, [params.codigo]);

  async function verificar() {
    const { data } = await supabase.rpc('verificar_certificado', { p_codigo: params.codigo });
    setResultado(data && data.length > 0 ? data[0] : null);
    setCarregando(false);
  }

  return (
    <div>
      <header className="topo">
        <a className="marca" href="/">
          <Image src="/logo-nexobim-topo.png" alt="NexoBIM" width={241} height={66} priority />
        </a>
      </header>

      <div className="envolucro" style={{ maxWidth: 480, paddingTop: 80 }}>
        <div className="painel" style={{ textAlign: 'center' }}>
          <span className="etiqueta">Validação de certificado</span>

          {carregando ? (
            <p className="painel-legenda" style={{ margin: 0 }}>Verificando...</p>
          ) : resultado ? (
            <>
              <div className="selo-certificado" style={{ textAlign: 'left', marginBottom: 16 }}>
                Certificado válido.
              </div>
              <p className="painel-titulo">{resultado.nome_aluno}</p>
              <p className="painel-legenda" style={{ margin: 0 }}>
                concluiu o nível <strong>{resultado.nivel}</strong> do curso <strong>{resultado.curso}</strong>
              </p>
              <p className="painel-legenda" style={{ marginTop: 8 }}>
                emitido em {new Date(resultado.emitido_em).toLocaleDateString('pt-BR')}
              </p>
              <p className="painel-legenda" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
                Código: {params.codigo}
              </p>
            </>
          ) : (
            <>
              <p className="painel-titulo">Código não encontrado</p>
              <p className="painel-legenda" style={{ margin: 0 }}>
                Não existe nenhum certificado emitido com o código <strong>{params.codigo}</strong>. Confira se
                digitou corretamente.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
