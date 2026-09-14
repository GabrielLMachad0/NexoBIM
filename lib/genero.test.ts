import { describe, it, expect } from 'vitest';
import { chutarGeneroPeloNome, porGenero } from './genero';

describe('chutarGeneroPeloNome', () => {
  it('chuta feminino para nomes terminados em "a"', () => {
    expect(chutarGeneroPeloNome('Ana Silva')).toBe('feminino');
  });

  it('chuta masculino para nomes terminados em vogal masculina comum', () => {
    expect(chutarGeneroPeloNome('Pedro Souza')).toBe('masculino');
  });

  it('reconhece exceções femininas fora do padrão', () => {
    expect(chutarGeneroPeloNome('Beatriz Lima')).toBe('feminino');
  });

  it('reconhece exceções masculinas fora do padrão', () => {
    expect(chutarGeneroPeloNome('Luca Ferreira')).toBe('masculino');
  });

  it('devolve null quando não tem confiança suficiente', () => {
    expect(chutarGeneroPeloNome('Alex Santos')).toBeNull();
  });

  it('devolve null para nome vazio', () => {
    expect(chutarGeneroPeloNome('')).toBeNull();
  });
});

describe('porGenero', () => {
  const opcoes = { masculino: 'aluno', feminino: 'aluna', neutro: 'pessoa' };

  it('usa o gênero informado quando existe', () => {
    expect(porGenero('masculino', 'Ana', opcoes)).toBe('aluno');
  });

  it('cai no palpite pelo nome quando o gênero não foi informado', () => {
    expect(porGenero(null, 'Ana', opcoes)).toBe('aluna');
  });

  it('cai no neutro quando não há gênero nem palpite confiável', () => {
    expect(porGenero(null, 'Alex', opcoes)).toBe('pessoa');
  });
});
