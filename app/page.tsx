const YOUTUBE_URL = 'https://youtube.com/@nexobim3550';

const CURSOS = [
  {
    sigla: 'BÁSICO',
    slug: 'revit-basico',
    nome: 'Revit Básico',
    niveis: 'Interface e Primeiros Passos',
    detalhe: 'Minicurso gratuito: interface, paredes, esquadrias, piso, telhado e forro — o ponto de partida no Revit.',
  },
  {
    sigla: 'REVIT',
    slug: 'revit-architecture',
    nome: 'Revit Architecture',
    niveis: 'Fluxo de Trabalho · Elementos Construtivos',
    detalhe: 'Modelagem arquitetônica, documentação técnica e detalhamento executivo em Revit.',
  },
  {
    sigla: 'MEP',
    slug: 'revit-mep',
    nome: 'Revit MEP',
    niveis: 'Instalações Hidrossanitárias e Climatização',
    detalhe: 'Coordenação de instalações hidrossanitárias e climatização dentro do modelo BIM.',
  },
  {
    sigla: 'MD',
    slug: 'microdesk-para-revit',
    nome: 'MicroDesk para Revit',
    niveis: 'Primeiros passos',
    detalhe: 'Instalação e comandos do MicroDesk, plugin que acelera a modelagem no Revit.',
  },
];

export default function Inicio() {
  return (
    <div>
      <header className="topo">
        <a className="marca" href="/">
          <img src="/logo-nexobim-topo.png" alt="NexoBIM" />
        </a>
        <nav>
          <a href="#cursos">Cursos</a>
          <a href={YOUTUBE_URL} target="_blank" rel="noreferrer">YouTube</a>
          <a href="/login">Entrar</a>
        </nav>
      </header>

      <section className="envolucro-largo hero-nexobim">
        <span className="etiqueta">Cursos de BIM, Revit e MEP</span>
        <h1>Aprenda BIM do fundamento à execução do projeto.</h1>
        <p className="hero-legenda">
          Vídeo aulas organizadas por nível, tarefas práticas e certificado ao concluir
          cada etapa. Assista no seu ritmo e evolua com um plano claro de estudo.
        </p>
        <div className="hero-botoes">
          <a className="botao" href="/login">Entrar ou criar conta</a>
          <a className="botao fantasma" href={YOUTUBE_URL} target="_blank" rel="noreferrer">
            Ver aulas no YouTube
          </a>
        </div>
      </section>

      <section className="envolucro-largo" id="cursos">
        <h2 className="titulo-secao">Cursos disponíveis</h2>
        <p className="legenda-secao">Cada curso é dividido em níveis, com aulas, tarefas e certificado próprio.</p>
        <div className="grade-cursos">
          {CURSOS.map((curso) => {
            const conteudo = (
              <>
                <span className="codigo-nivel">{curso.sigla}</span>
                <p className="painel-titulo">{curso.nome}</p>
                <p className="painel-legenda">{curso.niveis}</p>
                <p className="cartao-curso-texto">{curso.detalhe}</p>
              </>
            );
            return curso.slug ? (
              <a className="painel cartao-curso cartao-curso-link" href={`/cursos/${curso.slug}`} key={curso.sigla}>
                {conteudo}
              </a>
            ) : (
              <article className="painel cartao-curso" key={curso.sigla}>{conteudo}</article>
            );
          })}
        </div>
      </section>

      <section className="envolucro-largo">
        <h2 className="titulo-secao">Como funciona</h2>
        <div className="grade-passos">
          <article className="painel">
            <span className="codigo-nivel">01</span>
            <p className="painel-titulo">Crie sua conta</p>
            <p className="cartao-curso-texto">Cadastre-se com e-mail e senha para acompanhar seu progresso.</p>
          </article>
          <article className="painel">
            <span className="codigo-nivel">02</span>
            <p className="painel-titulo">Assista por nível</p>
            <p className="cartao-curso-texto">Vídeo aulas e tarefas organizadas do fundamento ao avançado.</p>
          </article>
          <article className="painel">
            <span className="codigo-nivel">03</span>
            <p className="painel-titulo">Tire seu certificado</p>
            <p className="cartao-curso-texto">Ao concluir 100% de um nível, o certificado é emitido na hora.</p>
          </article>
        </div>
      </section>

      <section className="envolucro-largo painel-professora">
        <div className="painel">
          <span className="etiqueta">Quem ensina</span>
          <p className="painel-titulo">Raíssa, professora de BIM/Revit/MEP</p>
          <p className="cartao-curso-texto">
            Conteúdo em vídeo publicado também no canal do YouTube{' '}
            <a href={YOUTUBE_URL} target="_blank" rel="noreferrer">@nexobim3550</a>,
            além de aulas particulares sob medida para quem precisa de um acompanhamento
            mais próximo.
          </p>
          <a className="botao fantasma" href={YOUTUBE_URL} target="_blank" rel="noreferrer">
            Inscreva-se no canal
          </a>
        </div>
      </section>

      <section className="envolucro-largo secao-final">
        <div className="painel">
          <p className="painel-titulo">Pronto para começar?</p>
          <p className="painel-legenda">Assinatura para acompanhar os cursos por nível, ou aula particular sob medida.</p>
          <a className="botao" href="/login">Entrar ou criar conta</a>
        </div>
      </section>

      <footer className="rodape-nexobim">
        <span className="rodape-marca">
          <img src="/simbolo-nexobim-ciano.png" alt="" />
          NexoBIM
        </span>
        <a href={YOUTUBE_URL} target="_blank" rel="noreferrer">YouTube</a>
      </footer>
    </div>
  );
}
