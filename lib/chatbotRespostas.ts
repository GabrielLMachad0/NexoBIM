import { normalizar } from './recursos';
import { BaseDeConhecimento, palavrasSignificativas } from './chatbotBase';

export type LinkSugerido = { texto: string; href: string };
export type RespostaBot = { texto: string; links: LinkSugerido[] };

type PerguntaFrequente = {
  palavrasChave: string[];
  resposta: string;
  link?: LinkSugerido;
};

const PERGUNTAS_FREQUENTES: PerguntaFrequente[] = [
  {
    palavrasChave: ['esqueci a senha', 'esqueci minha senha', 'recuperar senha', 'trocar senha', 'redefinir senha', 'nao lembro a senha'],
    resposta: 'Na tela de login, clique em "Esqueci minha senha" e informe seu e-mail — você recebe um link para criar uma senha nova na hora.',
    link: { texto: 'Ir para o login', href: '/login' },
  },
  {
    palavrasChave: ['criar conta', 'me cadastrar', 'fazer cadastro', 'como faço pra entrar'],
    resposta: 'Você pode criar sua conta com e-mail e senha na tela de login. Depois disso, o acesso aos cursos é liberado pela Raíssa.',
    link: { texto: 'Ir para o login', href: '/login' },
  },
  {
    palavrasChave: ['liberar acesso', 'nao tenho acesso', 'sem acesso', 'assinatura', 'assinar', 'comprar curso', 'pagamento', 'como assino'],
    resposta: 'O acesso (assinatura ou aula particular) é liberado pela Raíssa depois da confirmação da compra. Se você já pagou e ainda não conseguiu entrar, fale direto com ela.',
    link: { texto: 'Meu painel', href: '/dashboard' },
  },
  {
    palavrasChave: ['certificado', 'certificacao', 'emitir certificado'],
    resposta: 'O certificado é emitido automaticamente quando você conclui 100% das aulas e tarefas de um nível — ele aparece no seu painel, pronto pra baixar.',
    link: { texto: 'Meu painel', href: '/dashboard' },
  },
  {
    palavrasChave: ['familia', 'baixar', 'download', 'projeto pronto', 'arquivo rfa', 'acervo', 'porta', 'janela', 'bloco de revit'],
    resposta: 'Temos um acervo com milhares de arquivos de família e projetos de Revit prontos pra baixar, organizados por categoria (portas, elétrica, estrutura, hidrossanitário e mais).',
    link: { texto: 'Ver acervo de recursos', href: '/recursos' },
  },
  {
    palavrasChave: ['aula particular', 'aula individual', 'aula sob medida'],
    resposta: 'A aula particular é individual: você recebe plano de aula, tarefas e gravações específicas pra você, tudo disponível no seu painel.',
    link: { texto: 'Meu painel', href: '/dashboard' },
  },
  {
    palavrasChave: ['canal do youtube', 'youtube', 'video no youtube'],
    resposta: 'A Raíssa também publica aulas no canal do YouTube @nexobim3550.',
    link: { texto: 'Abrir canal no YouTube', href: 'https://youtube.com/@nexobim3550' },
  },
  {
    palavrasChave: ['progresso', 'quanto falta', 'continuar de onde parei'],
    resposta: 'Seu progresso é salvo automaticamente por aula assistida — no seu painel dá pra ver quanto falta em cada nível e continuar de onde parou.',
    link: { texto: 'Meu painel', href: '/dashboard' },
  },
];

function encontrarPerguntasFrequentes(perguntaNormalizada: string): PerguntaFrequente[] {
  return PERGUNTAS_FREQUENTES.filter((pf) =>
    pf.palavrasChave.some((chave) => perguntaNormalizada.includes(normalizar(chave)))
  );
}

function pontuar(palavras: string[], ...campos: string[]): number {
  const textoNormalizado = campos.map(normalizar).join(' · ');
  return palavras.reduce((soma, p) => (textoNormalizado.includes(p) ? soma + 1 : soma), 0);
}

export function responderPergunta(pergunta: string, base: BaseDeConhecimento): RespostaBot {
  const perguntaNormalizada = normalizar(pergunta);
  const palavras = palavrasSignificativas(pergunta);

  const faqEncontradas = encontrarPerguntasFrequentes(perguntaNormalizada);

  const aulasComPontuacao = base.aulas
    .map((a) => ({ a, pontos: pontuar(palavras, a.titulo, a.descricao, a.nivelNome, a.cursoNome) * 2 + pontuar(palavras, a.titulo) }))
    .filter((x) => x.pontos > 0)
    .sort((x, y) => y.pontos - x.pontos)
    .slice(0, 4);

  const linksAulas: LinkSugerido[] = aulasComPontuacao.map(({ a }) => ({
    texto: `${a.cursoNome} · ${a.nivelNome} — ${a.titulo}`,
    href: `/dashboard/nivel/${a.nivelId}`,
  }));

  let linksNiveis: LinkSugerido[] = [];
  if (linksAulas.length === 0) {
    const niveisComPontuacao = base.niveis
      .map((n) => ({ n, pontos: pontuar(palavras, n.nome, n.cursoNome) }))
      .filter((x) => x.pontos > 0)
      .sort((x, y) => y.pontos - x.pontos)
      .slice(0, 3);
    linksNiveis = niveisComPontuacao.map(({ n }) => ({
      texto: `${n.cursoNome} · ${n.nome}`,
      href: `/dashboard/nivel/${n.id}`,
    }));
  }

  let linksCursos: LinkSugerido[] = [];
  if (linksAulas.length === 0 && linksNiveis.length === 0) {
    const cursosComPontuacao = base.cursos
      .map((c) => ({ c, pontos: pontuar(palavras, c.nome) }))
      .filter((x) => x.pontos > 0)
      .sort((x, y) => y.pontos - x.pontos)
      .slice(0, 3);
    linksCursos = cursosComPontuacao.map(({ c }) => ({ texto: c.nome, href: `/cursos/${c.slug}` }));
  }

  const categoriasComPontuacao = base.categorias
    .map((c) => ({ c, pontos: pontuar(palavras, c.nome) }))
    .filter((x) => x.pontos > 0)
    .sort((x, y) => y.pontos - x.pontos)
    .slice(0, 3);
  const linksRecursos: LinkSugerido[] = categoriasComPontuacao.map(({ c }) => ({
    texto: `Recursos · ${c.nome}`,
    href: `/recursos/${c.slug}`,
  }));

  const linksConteudo = [...linksAulas, ...linksNiveis, ...linksCursos, ...linksRecursos].slice(0, 5);

  if (faqEncontradas.length > 0) {
    const principal = faqEncontradas[0];
    const links = [...(principal.link ? [principal.link] : []), ...linksConteudo].slice(0, 5);
    return { texto: principal.resposta, links };
  }

  if (linksConteudo.length > 0) {
    return {
      texto: 'Encontrei isso relacionado à sua pergunta:',
      links: linksConteudo,
    };
  }

  return {
    texto: 'Não encontrei nada específico sobre isso ainda. Dá uma olhada no seu painel ou no acervo de recursos — ou fale direto com a Raíssa.',
    links: [
      { texto: 'Meu painel', href: '/dashboard' },
      { texto: 'Acervo de recursos', href: '/recursos' },
    ],
  };
}

export const PERGUNTAS_SUGERIDAS = [
  'Como recupero minha senha?',
  'Tem família de porta pra baixar?',
  'Como funciona o certificado?',
  'Quero ver aulas de Revit MEP',
];
