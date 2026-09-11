'use client';

import { useEffect, useRef, useState } from 'react';
import { BaseDeConhecimento, carregarBaseDeConhecimento } from '../lib/chatbotBase';
import { LinkSugerido, PERGUNTAS_SUGERIDAS, responderPergunta } from '../lib/chatbotRespostas';

type Mensagem = { autor: 'bot' | 'usuario'; texto: string; links?: LinkSugerido[] };

const MENSAGEM_INICIAL: Mensagem = {
  autor: 'bot',
  texto: 'Oi! Eu ajudo a encontrar aulas, recursos pra baixar e responder dúvidas rápidas sobre a plataforma. O que você procura?',
};

const BASE_VAZIA: BaseDeConhecimento = { aulas: [], niveis: [], cursos: [], categorias: [] };

// Se o catálogo demorar demais (ou a rede falhar), a conversa não pode travar —
// depois desse tempo, responde só com o que já tiver (FAQ + o que já carregou).
function comLimiteDeTempo<T>(promessa: Promise<T>, ms: number, valorPadrao: T): Promise<T> {
  return new Promise((resolve) => {
    const cronometro = setTimeout(() => resolve(valorPadrao), ms);
    promessa.then((v) => { clearTimeout(cronometro); resolve(v); });
  });
}

export default function ChatBot() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_INICIAL]);
  const [entrada, setEntrada] = useState('');
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  // Busca o catálogo em segundo plano assim que a página carrega — não espera
  // a pessoa abrir o chat, pra já estar pronto quando ela mandar a primeira pergunta.
  const basePromiseRef = useRef<Promise<BaseDeConhecimento>>();
  if (!basePromiseRef.current) {
    basePromiseRef.current = carregarBaseDeConhecimento().catch(() => BASE_VAZIA);
  }

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, aberto]);

  async function enviar(pergunta: string) {
    const texto = pergunta.trim();
    if (!texto) return;

    setMensagens((atual) => [...atual, { autor: 'usuario', texto }]);
    setEntrada('');

    const base = await comLimiteDeTempo(basePromiseRef.current!, 3000, BASE_VAZIA);
    const resposta = responderPergunta(texto, base);
    setMensagens((atual) => [...atual, { autor: 'bot', texto: resposta.texto, links: resposta.links }]);
  }

  return (
    <div className="chatbot-caixa">
      {aberto && (
        <div className="chatbot-painel">
          <div className="chatbot-cabecalho">
            <span>Assistente NexoBIM</span>
            <button className="chatbot-fechar" aria-label="Fechar chat" onClick={() => setAberto(false)}>✕</button>
          </div>

          <div className="chatbot-mensagens">
            {mensagens.map((m, i) => (
              <div key={i} className={`chatbot-bolha chatbot-bolha-${m.autor}`}>
                <p style={{ margin: 0 }}>{m.texto}</p>
                {m.links && m.links.length > 0 && (
                  <div className="chatbot-links">
                    {m.links.map((l, j) => (
                      <a key={j} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        {l.texto} →
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {mensagens.length === 1 && (
              <div className="chatbot-sugestoes">
                {PERGUNTAS_SUGERIDAS.map((sugestao) => (
                  <button key={sugestao} className="chatbot-chip" onClick={() => enviar(sugestao)}>
                    {sugestao}
                  </button>
                ))}
              </div>
            )}
            <div ref={fimDaListaRef} />
          </div>

          <form
            className="chatbot-formulario"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(entrada);
            }}
          >
            <input
              className="campo"
              placeholder="Digite sua dúvida..."
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
            />
            <button className="botao" type="submit">Enviar</button>
          </form>
        </div>
      )}

      <button className="chatbot-botao-flutuante" onClick={() => setAberto((v) => !v)} aria-label="Abrir assistente">
        {aberto ? '✕' : '💬'}
      </button>
    </div>
  );
}
