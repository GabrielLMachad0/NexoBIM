import { describe, it, expect } from 'vitest';
import { normalizar, slugCategoria, idDoDrive, thumbnailDoRecurso, totalDeArquivos, Recurso } from './recursos';

describe('normalizar', () => {
  it('remove acentos e converte para minúsculas', () => {
    expect(normalizar('Esquadrias')).toBe('esquadrias');
    expect(normalizar('Decoração')).toBe('decoracao');
  });
});

describe('slugCategoria', () => {
  it('converte categoria em slug de URL', () => {
    expect(slugCategoria('Portas e Janelas')).toBe('portas-e-janelas');
    expect(slugCategoria('Elétrica / Infraestrutura')).toBe('eletrica-infraestrutura');
  });
});

describe('idDoDrive', () => {
  it('extrai o id de um link do tipo ?id=', () => {
    expect(idDoDrive('https://drive.google.com/uc?id=ABC123&export=view')).toBe('ABC123');
  });

  it('devolve null quando o link não tem id', () => {
    expect(idDoDrive('https://drive.google.com/drive/folders/xyz')).toBeNull();
  });
});

describe('thumbnailDoRecurso', () => {
  const base: Recurso = { id: '1', categoria: 'Texturas', nome: 'parede.png', descricao: null, link_drive: 'https://drive.google.com/uc?id=ABC', arquivos: 1, cliques: 0 };

  it('gera thumbnail para imagens', () => {
    expect(thumbnailDoRecurso(base)).toBe('https://drive.google.com/thumbnail?id=ABC&sz=w300');
  });

  it('não gera thumbnail para arquivos que não são imagem', () => {
    expect(thumbnailDoRecurso({ ...base, nome: 'familia.rfa' })).toBeNull();
  });
});

describe('totalDeArquivos', () => {
  it('soma a contagem de arquivos de todos os recursos', () => {
    const recursos: Recurso[] = [
      { id: '1', categoria: 'a', nome: 'x', descricao: null, link_drive: '', arquivos: 3, cliques: 0 },
      { id: '2', categoria: 'a', nome: 'y', descricao: null, link_drive: '', arquivos: 5, cliques: 0 },
    ];
    expect(totalDeArquivos(recursos)).toBe(8);
  });
});
