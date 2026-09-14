import { describe, it, expect } from 'vitest';
import { responderPergunta, PERGUNTAS_SUGERIDAS } from './chatbotRespostas';
import { BaseDeConhecimento } from './chatbotBase';

const BASE_VAZIA: BaseDeConhecimento = { aulas: [], niveis: [], cursos: [], categorias: [] };

describe('responderPergunta — FAQ de senha', () => {
  it('reconhece a própria pergunta sugerida sobre recuperar senha', () => {
    // PERGUNTAS_SUGERIDAS traz "Como recupero minha senha?" (verbo conjugado) —
    // a lista de palavras-chave da FAQ tem que cobrir essa forma, não só o infinitivo.
    const pergunta = PERGUNTAS_SUGERIDAS.find((p) => p.toLowerCase().includes('senha'));
    expect(pergunta).toBeTruthy();
    const resposta = responderPergunta(pergunta!, BASE_VAZIA);
    expect(resposta.texto).toContain('Esqueci minha senha');
    expect(resposta.links[0]?.href).toBe('/login');
  });

  it('reconhece variações comuns de "esqueci a senha"', () => {
    for (const pergunta of ['esqueci minha senha', 'perdi a senha', 'como troco minha senha']) {
      const resposta = responderPergunta(pergunta, BASE_VAZIA);
      expect(resposta.links[0]?.href).toBe('/login');
    }
  });
});

describe('responderPergunta — sem correspondência', () => {
  it('cai na resposta padrão quando não reconhece nada', () => {
    const resposta = responderPergunta('xyzabc123 nada a ver', BASE_VAZIA);
    expect(resposta.texto).toContain('Não encontrei nada específico');
  });
});
