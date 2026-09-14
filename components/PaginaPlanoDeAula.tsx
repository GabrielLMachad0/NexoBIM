import Link from 'next/link';
import Cabecalho from './Cabecalho';
import { comLinksClicaveis } from '../lib/linkify';
import { Plano } from '../lib/aulaParticular';

type Props = {
  planos: Plano[];
  hrefVoltar: string;
  ehAdmin?: boolean;
};

export default function PaginaPlanoDeAula({ planos, hrefVoltar, ehAdmin }: Props) {
  return (
    <div>
      <Cabecalho ehAdmin={ehAdmin} />
      <div className="envolucro">
        <Link href={hrefVoltar} className="voltar-link">← Voltar</Link>

        <div className="painel-documento" style={{ marginTop: 20 }}>
          <span className="etiqueta">Plano de aula</span>

          {planos.length === 0 && (
            <div className="painel" style={{ marginTop: 16 }}>
              <p className="painel-legenda" style={{ margin: 0 }}>Nenhum plano cadastrado ainda.</p>
            </div>
          )}

          {planos.map((p) => (
            <div key={p.id}>
              <h1 style={{ fontSize: 24, fontWeight: 600, margin: '8px 0 20px' }}>{p.motivo}</h1>
              <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{comLinksClicaveis(p.conteudo)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
