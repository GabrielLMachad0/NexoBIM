export type Plano = { id: string; motivo: string; conteudo: string; aula_rotulo: string | null };
export type TarefaDesignada = { id: string; titulo: string; descricao: string; status: string; prazo: string | null; aula_rotulo: string | null };
export type AulaGravada = { id: string; titulo: string; video_url: string; data_aula: string; aula_rotulo: string | null };

export type AulaAgrupada = {
  rotulo: string;
  gravacoes: AulaGravada[];
  resumo: Plano | null;
  tarefas: TarefaDesignada[];
  dataOrdenacao: string;
};

// Junta gravação, resumo (plano) e tarefas que compartilham o mesmo aula_rotulo
// num só grupo — é isso que vira um "balão de aula" clicável no painel.
export function agruparConteudoPorAula(gravacoes: AulaGravada[], planos: Plano[], tarefas: TarefaDesignada[]): AulaAgrupada[] {
  const rotulos = new Set<string>();
  gravacoes.forEach((g) => g.aula_rotulo && rotulos.add(g.aula_rotulo));
  planos.forEach((p) => p.aula_rotulo && rotulos.add(p.aula_rotulo));
  tarefas.forEach((t) => t.aula_rotulo && rotulos.add(t.aula_rotulo));

  const grupos = Array.from(rotulos).map((rotulo) => {
    const gravacoesDaAula = gravacoes.filter((g) => g.aula_rotulo === rotulo);
    const planosDaAula = planos.filter((p) => p.aula_rotulo === rotulo);
    const tarefasDaAula = tarefas.filter((t) => t.aula_rotulo === rotulo);
    return {
      rotulo,
      gravacoes: gravacoesDaAula,
      resumo: planosDaAula[0] || null,
      tarefas: tarefasDaAula,
      dataOrdenacao: gravacoesDaAula[0]?.data_aula || '',
    };
  });

  return grupos.sort((a, b) => (a.dataOrdenacao || '9999-99-99').localeCompare(b.dataOrdenacao || '9999-99-99'));
}

// Planos sem aula_rotulo são conteúdo geral (ex.: o currículo do curso) —
// vão pra página dedicada de plano, não pros balões de aula.
export function planosGerais(planos: Plano[]): Plano[] {
  return planos.filter((p) => !p.aula_rotulo);
}
