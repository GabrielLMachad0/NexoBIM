import { describe, it, expect } from 'vitest';
import { comLinksClicaveis } from './linkify';
import { isValidElement } from 'react';

describe('comLinksClicaveis', () => {
  it('mantém texto sem link como string simples', () => {
    const partes = comLinksClicaveis('sem nenhum link aqui');
    expect(partes).toEqual(['sem nenhum link aqui']);
  });

  it('transforma uma URL em elemento de link clicável', () => {
    const partes = comLinksClicaveis('veja em https://drive.google.com/x depois');
    expect(partes).toHaveLength(3);
    expect(partes[0]).toBe('veja em ');
    expect(isValidElement(partes[1])).toBe(true);
    expect((partes[1] as any).props.href).toBe('https://drive.google.com/x');
    expect(partes[2]).toBe(' depois');
  });

  it('lida com múltiplos links no mesmo texto', () => {
    const partes = comLinksClicaveis('https://a.com e https://b.com');
    const links = partes.filter((p) => isValidElement(p));
    expect(links).toHaveLength(2);
  });
});
