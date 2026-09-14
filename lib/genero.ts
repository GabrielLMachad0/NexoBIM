export type Genero = 'masculino' | 'feminino' | null;

// Nomes comuns que fogem do padrão "termina em 'a' = feminino" — lista curta,
// só pra não chutar errado nos casos mais óbvios. Fora daqui, sem confiança
// suficiente, a função devolve null (não assume nada).
const NOMES_FEMININOS_EXCECAO = new Set([
  'beatriz', 'ines', 'isis', 'noemi', 'raquel', 'rute', 'ruth', 'ingrid',
  'miriam', 'carmen', 'yasmin', 'jasmin', 'nicole', 'ester', 'isadora',
]);
const NOMES_MASCULINOS_EXCECAO = new Set(['luca', 'joshua', 'josue', 'noah']);

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Só um palpite pra pré-selecionar o campo no cadastro — a pessoa sempre pode
// trocar antes de enviar. Nunca é a fonte de verdade: isso é o que ela mesma
// escolher no formulário (guardado em profiles.genero).
export function chutarGeneroPeloNome(nomeCompleto: string): Genero {
  const primeiroNome = normalizar((nomeCompleto.trim().split(/\s+/)[0] || ''));
  if (!primeiroNome) return null;
  if (NOMES_FEMININOS_EXCECAO.has(primeiroNome)) return 'feminino';
  if (NOMES_MASCULINOS_EXCECAO.has(primeiroNome)) return 'masculino';
  if (/a$/.test(primeiroNome)) return 'feminino';
  if (/[oeuil]$/.test(primeiroNome)) return 'masculino';
  return null;
}

// Escolhe a palavra certa conforme o gênero informado. Sem gênero (nem
// cadastrado, nem um palpite razoável pelo nome), cai no neutro — nunca
// assume silenciosamente um dos dois.
export function porGenero(genero: Genero, nome: string, opcoes: { masculino: string; feminino: string; neutro: string }): string {
  const g = genero ?? chutarGeneroPeloNome(nome);
  if (g === 'masculino') return opcoes.masculino;
  if (g === 'feminino') return opcoes.feminino;
  return opcoes.neutro;
}
