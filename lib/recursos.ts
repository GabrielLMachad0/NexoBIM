export type Recurso = {
  id: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  link_drive: string;
  arquivos: number;
  cliques: number;
};

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function slugCategoria(categoria: string): string {
  return normalizar(categoria).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function iconeDaCategoria(categoria: string): string {
  const c = normalizar(categoria);
  if (c.includes('esquadria') || c.includes('porta') || c.includes('janela')) return '🚪';
  if (c.includes('portao') || c.includes('grade') || c.includes('cerca')) return '⛓️';
  if (c.includes('estrutura') || c.includes('cobertura')) return '🏗️';
  if (c.includes('eletrica') || c.includes('infraestrutura')) return '⚡';
  if (c.includes('decorativ')) return '🏛️';
  if (c.includes('biblioteca')) return '📚';
  if (c.includes('projeto')) return '📐';
  if (c.includes('template')) return '📄';
  if (c.includes('veiculo')) return '🚗';
  if (c.includes('equipamento')) return '🚧';
  if (c.includes('hidrossanit')) return '🚰';
  if (c.includes('pessoa') || c.includes('figura')) return '🧍';
  if (c.includes('textura') || c.includes('material')) return '🎨';
  if (c.includes('paisagismo') || c.includes('mobiliario')) return '🌳';
  return '📁';
}

export function idDoDrive(linkDrive: string): string | null {
  const match = linkDrive.match(/id=([^&]+)/);
  return match ? match[1] : null;
}

export function thumbnailDoRecurso(recurso: Recurso): string | null {
  if (!/\.(png|jpe?g)$/i.test(recurso.nome)) return null;
  const id = idDoDrive(recurso.link_drive);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w300` : null;
}

export function totalDeArquivos(recursos: Recurso[]): number {
  return recursos.reduce((soma, r) => soma + r.arquivos, 0);
}
