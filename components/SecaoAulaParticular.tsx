'use client';

import { useState } from 'react';
import Link from 'next/link';
import { comLinksClicaveis } from '../lib/linkify';
import { agruparConteudoPorAula, planosGerais, AulaGravada, Plano, TarefaDesignada } from '../lib/aulaParticular';

type Props = {
  aulasGravadas: AulaGravada[];
  planos: Plano[];
  tarefasDesignadas: TarefaDesignada[];
  hrefPlano: string;
};

function formatarData(data: string): string {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function SecaoAulaParticular({ aulasGravadas, planos, tarefasDesignadas, hrefPlano }: Props) {
  const [rotuloAberto, setRotuloAberto] = useState<string | null>(null);
  const [tarefaAbertaId, setTarefaAbertaId] = useState<string | null>(null);

  const aulasAgrupadas = agruparConteudoPorAula(aulasGravadas, planos, tarefasDesignadas);
  const geral = planosGerais(planos);

  const dataPorRotulo = new Map(aulasAgrupadas.map((a) => [a.rotulo, a.dataOrdenacao]));
  const tarefasOrdenadas = [...tarefasDesignadas].sort((a, b) => {
    const da = (a.aula_rotulo && dataPorRotulo.get(a.aula_rotulo)) || '9999-99-99';
    const db = (b.aula_rotulo && dataPorRotulo.get(b.aula_rotulo)) || '9999-99-99';
    return da.localeCompare(db);
  });

  const aulaAberta = aulasAgrupadas.find((a) => a.rotulo === rotuloAberto) || null;
  const tarefaAberta = tarefasOrdenadas.find((t) => t.id === tarefaAbertaId) || null;

  return (
    <>
      {geral.length > 0 && (
        <Link href={hrefPlano} className="painel painel-plano-geral" style={{ marginBottom: 20 }}>
          <span className="etiqueta-nivel">Plano de aula</span>
          <p className="painel-titulo">{geral[0].motivo}</p>
          <p className="painel-legenda" style={{ margin: 0, color: 'var(--azul-linha)' }}>Ver plano completo →</p>
        </Link>
      )}

      {aulasAgrupadas.length > 0 && (
        <>
          <p className="painel-legenda titulo-categoria-recurso">Aulas</p>
          <div className="grade-baloes">
            {aulasAgrupadas.map((a) => (
              <button
                key={a.rotulo}
                className={`balao ${rotuloAberto === a.rotulo ? 'ativo' : ''}`}
                onClick={() => setRotuloAberto(rotuloAberto === a.rotulo ? null : a.rotulo)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          {aulaAberta && (
            <div className="painel" style={{ marginBottom: 20 }}>
              <p className="painel-titulo">{aulaAberta.rotulo}</p>

              {aulaAberta.gravacoes.length === 0 && aulaAberta.resumo === null && aulaAberta.tarefas.length === 0 && (
                <p className="painel-legenda" style={{ margin: 0 }}>Nada cadastrado ainda pra essa aula.</p>
              )}

              {aulaAberta.gravacoes.map((g) => (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <p className="painel-legenda" style={{ margin: '0 0 6px' }}>Gravada em {formatarData(g.data_aula)}</p>
                  <a className="botao" href={g.video_url} target="_blank" rel="noreferrer">Assistir gravação</a>
                </div>
              ))}

              {aulaAberta.resumo && (
                <>
                  <label className="rotulo" style={{ marginTop: 12 }}>Resumo da aula</label>
                  <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{comLinksClicaveis(aulaAberta.resumo.conteudo)}</p>
                </>
              )}

              {aulaAberta.tarefas.length > 0 && (
                <>
                  <label className="rotulo" style={{ marginTop: 12 }}>Tarefas desta aula</label>
                  {aulaAberta.tarefas.map((t) => (
                    <div className="aula-linha" key={t.id} style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="aula-titulo">{t.titulo}</div>
                        <p className="painel-legenda" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comLinksClicaveis(t.descricao)}</p>
                      </div>
                      <span className={`marcador ${t.status === 'concluida' ? 'feito' : ''}`}>{t.status}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {tarefasOrdenadas.length > 0 && (
        <>
          <p className="painel-legenda titulo-categoria-recurso">Tarefas</p>
          <div className="grade-baloes">
            {tarefasOrdenadas.map((t, i) => (
              <button
                key={t.id}
                className={`balao ${t.status === 'concluida' ? 'feito' : ''} ${tarefaAbertaId === t.id ? 'ativo' : ''}`}
                onClick={() => setTarefaAbertaId(tarefaAbertaId === t.id ? null : t.id)}
              >
                Tarefa {i + 1}{t.aula_rotulo ? ` — ${t.aula_rotulo}` : ''}
              </button>
            ))}
          </div>

          {tarefaAberta && (
            <div className="painel" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <p className="painel-titulo" style={{ margin: 0 }}>{tarefaAberta.titulo}</p>
                <span className={`marcador ${tarefaAberta.status === 'concluida' ? 'feito' : ''}`}>{tarefaAberta.status}</span>
              </div>
              {tarefaAberta.prazo && <p className="painel-legenda" style={{ marginTop: 4 }}>Prazo: {formatarData(tarefaAberta.prazo)}</p>}
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', marginTop: 8 }}>{comLinksClicaveis(tarefaAberta.descricao)}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
