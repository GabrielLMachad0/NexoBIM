# NexoBIM — plataforma de cursos da Raíssa

Você vai continuar o desenvolvimento deste projeto. O código já existe neste
repositório (Next.js + Supabase) — leia os arquivos antes de alterar qualquer
coisa, em vez de reescrever do zero.

## Renomear — feito

O projeto foi prototipado com o nome provisório "Plataforma Raíssa" /
`plataforma-raissa`. Já foi renomeado para **NexoBIM** em `package.json`,
`app/layout.tsx`, `components/Cabecalho.tsx`, `README.md` e `supabase/schema.sql`.
O nome "Raíssa" continua onde se refere à pessoa (ex.: "Fale com a Raíssa",
a instrutora), não ao nome do projeto.

## Página de cursos — feito

`app/page.tsx` agora é a landing pública (antes só redirecionava para
`/dashboard` ou `/login`): apresentação da NexoBIM, os 4 cursos (BIM, Revit
Architecture, Revit MEP, AutoCAD) com seus níveis, link para o canal do
YouTube (@nexobim3550) e CTA para `/login`. Os nomes/descrições dos cursos
são um ponto de partida — ajustar com os cursos, preços e níveis reais
quando definidos.

## O que é

Site de cursos para a Raíssa (professora de BIM/Revit/AutoCAD/MEP, canal do
YouTube @nexobim3550). Dois jeitos de acesso, que uma mesma conta pode ter ao
mesmo tempo:

- **Assinante** — assiste vídeo aulas do YouTube organizadas por curso e
  nível, cumpre tarefas, tira certificado em PDF ao concluir um nível
- **Aluno particular** — recebe plano de aula sob medida (ligado ao motivo da
  dúvida que gerou a aula), tarefas designadas individualmente, e a gravação
  da própria aula particular (só esse aluno consegue abrir)

## Arquitetura já implementada

- **Next.js** (App Router) + **Supabase** (Postgres + Auth + RLS). Login por
  e-mail/senha; cada perfil tem `is_assinante`, `is_aluno_particular`,
  `is_admin` — os dois primeiros podem ser `true` ao mesmo tempo
- **Conteúdo padrão** (igual pra todo assinante): `cursos` → `niveis` →
  `aulas` (guardam só o `youtube_id`) + `planos_padrao` + `tarefas_padrao`
  por nível
- **Progresso**: `progresso_aulas` e `progresso_tarefas` por aluno;
  certificado é um PDF gerado no navegador (jsPDF) quando o nível chega a
  100% — não depende de servidor
- **Conteúdo do aluno particular**: `planos_personalizados` (tem o campo
  `motivo`), `tarefas_designadas`, `aulas_particulares_gravadas` — protegido
  por Row Level Security no Postgres (`aluno_id = auth.uid()` ou admin), não
  só escondido na tela. **Não remova essas policies** ao mexer no schema
- **Painel admin** (`/admin`): criar cursos/níveis, adicionar aulas (colar
  link do YouTube), e por aluno: liberar acesso, adicionar plano
  personalizado, designar tarefa, vincular o link da gravação
- **Pagamento** — Hotmart e Kiwify, dois produtos em cada uma (assinatura
  recorrente + aula particular avulsa). Webhooks em
  `app/api/webhooks/hotmart` e `.../kiwify` liberam ou revogam acesso
  automaticamente por e-mail. Se a compra acontece antes de a pessoa ter
  conta no site, o acesso fica em `acessos_pendentes` até o cadastro
- **Gravação da aula particular** — fluxo manual por enquanto: a Raíssa grava
  pelo Teams como já faz e cola o link no admin. Automatizar via Microsoft
  Graph API é trabalho futuro, e depende do tipo de licença Microsoft 365
  dela (funciona bem em Business/Empresarial; conta pessoal tem acesso bem
  mais limitado à API)

## Tarefas pendentes, em ordem

1. ~~Renomear~~ — feito
2. ~~Rodar `npm install && npm run build` e corrigir qualquer erro~~ — feito.
   `lib/supabaseClient.ts` e `lib/supabaseAdmin.ts` criavam o cliente Supabase
   direto no escopo do módulo com `!` (non-null assertion); sem `.env.local`
   preenchido isso quebrava o build (`supabaseUrl is required`) ao gerar as
   rotas de API e páginas. Corrigido com um fallback de placeholder — em
   produção, com as variáveis reais definidas, o fallback nunca é usado.
   `next` também foi atualizado de `14.2.5` para `14.2.35` (a versão 14.2.5
   tinha uma vulnerabilidade de segurança conhecida)
3. ~~Criar a página de cursos~~ — feito (seção acima)
4. Confirmar os payloads reais da Hotmart e da Kiwify assim que a Raíssa
   fizer uma compra de teste em cada uma, e ajustar os nomes de campo em
   `app/api/webhooks/*/route.ts` se necessário — estão marcados com
   comentários "ATENÇÃO" nos pontos exatos que podem precisar de ajuste
5. Quando os arquivos de identidade visual da NexoBIM chegarem (logo, cores,
   tipografia): aplicar em `app/globals.css`, `components/Cabecalho.tsx`,
   `app/page.tsx`, e no PDF do certificado (`app/dashboard/page.tsx`, função
   `gerarCertificado`). Hoje está com um tema provisório do tipo "prancheta
   de projeto" (azul-projeto/âmbar) — pode ser totalmente substituído
6. Ajustar em `app/page.tsx` os nomes, descrições e níveis reais dos cursos
   (hoje são um ponto de partida: BIM, Revit Architecture, Revit MEP,
   AutoCAD) e definir se haverá preço/plano exibido na própria página
7. Configurar o Supabase real: criar o projeto, rodar `supabase/schema.sql`,
   preencher `.env.local` a partir de `.env.example`
8. Deploy (sugestão: Vercel, pela integração direta com Next.js)
9. Considerar migrar de `next@14` para `next@16` no futuro — o restante das
   vulnerabilidades reportadas por `npm audit` só é corrigido por essa major
   (mudança grande o suficiente para não fazer de passagem)

## Cuidados de segurança

- `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser usada em código que roda no
  navegador (nada com prefixo `NEXT_PUBLIC_`) — só dentro de `app/api/**`
- Ao adicionar novas tabelas com dado pessoal de aluno, sempre habilite RLS e
  escreva a policy antes de considerar a tabela pronta
