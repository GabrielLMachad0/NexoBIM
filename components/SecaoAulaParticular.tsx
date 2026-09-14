'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { comLinksClicaveis } from '../lib/linkify';
import { agruparConteudoPorAula, planosGerais, AulaGravada, Plano, TarefaDesignada } from '../lib/aulaParticular';

type Props = {
  aulasGravadas: AulaGravada[];
  planos: Plano[];
  tarefasDesignadas: TarefaDesignada[];
  hrefPlano: string;
  // Chave única (normalmente o id do aluno) usada para lembrar, no navegador
  // dele, qual foi a última aula/tarefa aberta — vira o "continuar de onde
  // parei". Sem essa chave (ex.: pré-visualização do admin) o recurso fica
  // desligado, porque aí seria o navegador do admin guardando isso, não o do aluno.
  chaveContinuar?: string | null;
};

function formatarData(data: string): string {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

function idDoVideoDrive(url: string): string | null {
  const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  return match ? match[1] : null;
}

export default function SecaoAulaParticular({ aulasGravadas, planos, tarefasDesignadas, hrefPlano, chaveContinuar }: Props) {
  const [rotuloAberto, setRotuloAberto] = useState<string | null>(null);
  const [tarefaAbertaId, setTarefaAbertaId] = useState<string | null>(null);
  const [ultimoRotulo, setUltimoRotulo] = useState<string | null>(null);

  const aulasAgrupadas = agruparConteudoPorAula(aulasGravadas, planos, tarefasDesignadas);
  const geral = planosGerais(planos);

  useEffect(() => {
    if (!chaveContinuar) return;
    try {
      const salvo = window.localStorage.getItem(`nexobim:continuar:${chaveContinuar}`);
      if (salvo) setUltimoRotulo(salvo);
    } catch {
      // localStorage pode não estar disponível (ex.: navegação privada) — sem problema, só não lembra.
    }
  }, [chaveContinuar]);

  function abrirAula(rotulo: string) {
    const novoAberto = rotuloAberto === rotulo ? null : rotulo;
    setRotuloAberto(novoAberto);
    if (novoAberto && chaveContinuar) {
      try {
        window.localStorage.setItem(`nexobim:continuar:${chaveContinuar}`, novoAberto);
      } catch {
        // ignora se não puder salvar
      }
    }
  }

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
          {ultimoRotulo && ultimoRotulo !== rotuloAberto && aulasAgrupadas.some((a) => a.rotulo === ultimoRotulo) && (
            <button className="painel continuar-card" style={{ marginBottom: 20, width: '100%', border: 'none', cursor: 'pointer' }} onClick={() => abrirAula(ultimoRotulo)}>
              <span className="etiqueta-nivel">Continuar de onde parei</span>
              <p className="painel-titulo" style={{ margin: 0 }}>{ultimoRotulo}</p>
            </button>
          )}

          <p className="painel-legenda titulo-categoria-recurso">Aulas</p>
          <div className="grade-baloes">
            {aulasAgrupadas.map((a) => (
              <button
                key={a.rotulo}
                className={`balao ${rotuloAberto === a.rotulo ? 'ativo' : ''}`}
                onClick={() => abrirAula(a.rotulo)}
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

              {aulaAberta.gravacoes.map((g) => {
                const idDrive = idDoVideoDrive(g.video_url);
                return (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <p className="painel-legenda" style={{ margin: '0 0 6px' }}>Gravada em {formatarData(g.data_aula)}</p>
                    {idDrive ? (
                      <div className="player-embed">
                        <iframe src={`https://drive.google.com/file/d/${idDrive}/preview`} title={g.titulo} allow="autoplay" allowFullScreen />
                      </div>
                    ) : (
                      <a className="botao" href={g.video_url} target="_blank" rel="noreferrer">Assistir gravação</a>
                    )}
                  </div>
                );
              })}

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
