import { describe, it, expect } from 'vitest';
import { agruparConteudoPorAula, planosGerais } from './aulaParticular';

describe('agruparConteudoPorAula', () => {
  it('agrupa gravação, resumo e tarefas que compartilham o mesmo rótulo', () => {
    const gravacoes = [{ id: 'g1', titulo: 'Aula 1', video_url: 'https://drive.google.com/file/d/abc/view', data_aula: '2026-01-10', aula_rotulo: 'Aula 1 e 2' }];
    const planos = [{ id: 'p1', motivo: 'Resumo', conteudo: 'texto', aula_rotulo: 'Aula 1 e 2' }];
    const tarefas = [{ id: 't1', titulo: 'Tarefa 1', descricao: 'desc', status: 'pendente', prazo: null, aula_rotulo: 'Aula 1 e 2' }];

    const agrupado = agruparConteudoPorAula(gravacoes, planos, tarefas);

    expect(agrupado).toHaveLength(1);
    expect(agrupado[0].rotulo).toBe('Aula 1 e 2');
    expect(agrupado[0].gravacoes).toHaveLength(1);
    expect(agrupado[0].resumo?.id).toBe('p1');
    expect(agrupado[0].tarefas).toHaveLength(1);
  });

  it('ignora conteúdo sem aula_rotulo (é conteúdo geral, não de uma aula específica)', () => {
    const planos = [{ id: 'p1', motivo: 'Currículo geral', conteudo: 'texto', aula_rotulo: null }];
    expect(agruparConteudoPorAula([], planos, [])).toHaveLength(0);
  });

  it('ordena os grupos pela data da gravação, do mais antigo pro mais novo', () => {
    const gravacoes = [
      { id: 'g1', titulo: 'Aula 3', video_url: 'x', data_aula: '2026-03-01', aula_rotulo: 'Aula 5 e 6' },
      { id: 'g2', titulo: 'Aula 1', video_url: 'x', data_aula: '2026-01-01', aula_rotulo: 'Aula 1 e 2' },
    ];
    const agrupado = agruparConteudoPorAula(gravacoes, [], []);
    expect(agrupado.map((a) => a.rotulo)).toEqual(['Aula 1 e 2', 'Aula 5 e 6']);
  });
});

describe('planosGerais', () => {
  it('mantém só os planos sem aula_rotulo', () => {
    const planos = [
      { id: 'p1', motivo: 'Currículo', conteudo: 'x', aula_rotulo: null },
      { id: 'p2', motivo: 'Resumo aula', conteudo: 'x', aula_rotulo: 'Aula 1 e 2' },
    ];
    expect(planosGerais(planos).map((p) => p.id)).toEqual(['p1']);
  });
});
