# NexoBIM — plataforma de cursos

Cursos de BIM, Revit, AutoCAD e MEP com a Raíssa. Canal do YouTube:
[@nexobim3550](https://youtube.com/@nexobim3550).

## O que já está pronto

- **Página de cursos** (`/`) — landing pública com a apresentação da NexoBIM, os cursos e o link para o canal do YouTube
- **Login por e-mail/senha** (`/login`), com auto-cadastro
- **Painel único do aluno** (`/dashboard`) — mostra as seções de assinante e/ou aluno particular, dependendo do que estiver liberado para aquela pessoa
- **Assinante**: cursos organizados por nível, aulas do YouTube, tarefas por nível, certificado em PDF gerado na hora quando o nível é concluído
- **Aluno particular**: plano de aula personalizado (com o motivo da dúvida), tarefas designadas, e a gravação da própria aula particular — **só aquele aluno enxerga a própria gravação**, isso é garantido no banco de dados (RLS), não só escondido na tela
- **Painel da administração** (`/admin`) — só a Raíssa acessa: criar cursos/níveis, adicionar aulas (colando o link do YouTube), liberar assinatura/aula particular por aluno, adicionar plano personalizado, tarefa designada e o link da gravação de cada aula particular

## Decisão sobre o Teams

Você mencionou que a Raíssa já usa o Teams (com calendário integrado) para as aulas. Para essa primeira versão, mantive isso **manual e simples**: ela continua agendando e gravando a aula pelo Teams normalmente, e depois só cola o link da gravação no painel de administração, associado ao aluno. O sistema já garante que só aquele aluno vai conseguir abrir aquele link pela plataforma.

Existe uma versão mais automática — a plataforma criar a reunião do Teams e buscar a gravação sozinha, via API da Microsoft (Graph API). Isso só é possível dependendo do tipo de conta Microsoft 365 que vocês têm (funciona bem em contas Business/Empresariais; contas pessoais têm acesso bem mais limitado à API). Se depois vocês quiserem automatizar isso, me diga qual o plano do Microsoft 365 dela e eu monto essa parte.

## O que falta configurar (fora do código)

1. **Criar um projeto no [supabase.com](https://supabase.com)** (gratuito para começar)
2. Rodar o arquivo `supabase/schema.sql` no SQL Editor do painel do Supabase — isso cria todas as tabelas e as regras de acesso
3. Copiar `.env.example` para `.env.local` e preencher com a URL e a chave anônima do seu projeto (em Project Settings > API)
4. Tornar a Raíssa admin: depois que ela criar a própria conta pela tela de login, rodar no SQL Editor:
   ```sql
   update profiles set is_admin = true where nome = 'Raíssa';
   ```
5. Ajustar em `app/page.tsx` os nomes, descrições e níveis reais dos cursos (hoje é um ponto de partida: BIM, Revit Architecture, Revit MEP, AutoCAD)

## Pagamento — Hotmart e Kiwify

Cada plataforma tem seu próprio endpoint de webhook, que libera (ou revoga) o acesso automaticamente quando a compra é aprovada, reembolsada ou cancelada:

- `https://SEU_DOMINIO/api/webhooks/hotmart`
- `https://SEU_DOMINIO/api/webhooks/kiwify?token=SEU_TOKEN`

Passo a passo:

1. Crie dois produtos em cada plataforma: **assinatura** (recorrente) e **aula particular** (avulso)
2. Copie o ID de cada produto e preencha no `.env.local` (`HOTMART_ID_PRODUTO_...`, `KIWIFY_ID_PRODUTO_...`)
3. Na Hotmart: Ferramentas > Webhook > cole a URL acima, selecione os eventos de compra aprovada/completa/cancelada/reembolsada, e copie o **Hottok** da aba Autenticação para `HOTMART_HOTTOK`
4. Na Kiwify: no cadastro do webhook, escolha um token qualquer, cole-o tanto na URL (`?token=...`) quanto em `KIWIFY_WEBHOOK_TOKEN`
5. Preencha `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > service_role) — é o que permite o webhook liberar acesso sem depender de login

**Um ponto de atenção real:** o formato exato dos dados que a Hotmart e a Kiwify mandam no webhook (nome dos campos de e-mail e produto) pode variar um pouco conforme o tipo de produto e a versão. Deixei os dois arquivos (`app/api/webhooks/hotmart/route.ts` e `.../kiwify/route.ts`) com comentários no ponto exato onde isso é lido — antes de ativar de vez, dispare uma compra de teste em cada plataforma, veja o payload real que ela mostra no próprio painel (a Hotmart tem um histórico com o conteúdo enviado; a Kiwify tem um botão de testar webhook), e ajuste esses trechos se os nomes de campo forem diferentes do que está no código. Eu te ajudo a fazer esse ajuste quando você tiver esse payload real em mãos.

Se alguém comprar antes de criar a própria conta na plataforma (comum, já que o checkout é na Hotmart/Kiwify), o acesso fica guardado esperando — assim que a pessoa se cadastra com o mesmo e-mail, ele é aplicado automaticamente.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Publicando

O jeito mais simples é subir esse projeto num repositório do GitHub e conectar no [vercel.com](https://vercel.com) (gratuito, e feito pela mesma empresa do Next.js) — ele publica sozinho a cada alteração. As variáveis de `.env.local` precisam ser configuradas lá também, na aba Environment Variables.
