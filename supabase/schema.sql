-- =====================================================================
-- Esquema do banco - NexoBIM (plataforma de cursos)
-- Rodar isso no SQL editor do Supabase (Project > SQL Editor > New query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Perfis (estende auth.users, que o Supabase já cria e cuida das senhas)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  is_assinante boolean not null default false,
  is_aluno_particular boolean not null default false,
  is_admin boolean not null default false,
  -- Como a pessoa se identifica (informado por ela mesma no cadastro) —
  -- usado só pra escolher "aluno"/"aluna" no texto da plataforma. Nulo até
  -- ela informar; nunca inferido e gravado como se fosse fato.
  genero text check (genero in ('masculino', 'feminino')),
  created_at timestamptz not null default now()
);

-- Acesso comprado antes de a pessoa criar conta no site (paga na Hotmart/Kiwify
-- com um e-mail, mas ainda não passou pela tela de cadastro). Quando ela criar
-- a conta com o mesmo e-mail, o trigger abaixo aplica o que estava pendente aqui.
create table acessos_pendentes (
  email text primary key,
  is_assinante boolean not null default false,
  is_aluno_particular boolean not null default false,
  atualizado_em timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra (login por e-mail/senha),
-- e já aplica o acesso pendente se essa pessoa comprou antes de ter conta.
create function handle_new_user()
returns trigger as $$
declare
  pendente acessos_pendentes%rowtype;
begin
  select * into pendente from acessos_pendentes where email = new.email;

  insert into profiles (id, nome, email, is_assinante, is_aluno_particular, grupo_id, genero)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    coalesce(pendente.is_assinante, false),
    coalesce(pendente.is_aluno_particular, false),
    pendente.grupo_id,
    nullif(new.raw_user_meta_data->>'genero', '')
  );

  delete from acessos_pendentes where email = new.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Conteúdo padrão (igual para todos os assinantes, organizado por nível)
-- ---------------------------------------------------------------------
create table cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique, -- usado em /cursos/[slug], a página pública do curso
  ordem int not null default 0
);

create table niveis (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);

create table aulas (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references niveis(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  youtube_id text not null,
  ordem int not null default 0
);

create table planos_padrao (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references niveis(id) on delete cascade,
  conteudo text not null default ''
);

create table tarefas_padrao (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references niveis(id) on delete cascade,
  titulo text not null,
  descricao text not null default ''
);

-- ---------------------------------------------------------------------
-- 3. Progresso do assinante (o que já assistiu / concluiu)
-- ---------------------------------------------------------------------
create table progresso_aulas (
  aluno_id uuid not null references profiles(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  assistido_em timestamptz not null default now(),
  primary key (aluno_id, aula_id)
);

create table progresso_tarefas (
  aluno_id uuid not null references profiles(id) on delete cascade,
  tarefa_padrao_id uuid not null references tarefas_padrao(id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (aluno_id, tarefa_padrao_id)
);

create table certificados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  nivel_id uuid not null references niveis(id) on delete cascade,
  emitido_em timestamptz not null default now(),
  codigo text unique, -- código curto gerado no app (10 caracteres), usado em /certificado/[codigo]
  unique (aluno_id, nivel_id)
);

-- ---------------------------------------------------------------------
-- 4. Conteúdo personalizado (só existe para quem está em aula particular)
-- ---------------------------------------------------------------------

-- Grupo de estudo: várias alunas particulares no mesmo plano de aula
-- compartilham o mesmo conteúdo (plano, tarefas, gravações) em vez de
-- precisar duplicar tudo aluna por aluna.
create table grupos_estudo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

alter table profiles add column grupo_id uuid references grupos_estudo(id) on delete set null;

-- Um convite por e-mail (acessos_pendentes) também pode reservar o grupo —
-- aplicado automaticamente pelo handle_new_user() quando a pessoa se cadastra.
alter table acessos_pendentes add column grupo_id uuid references grupos_estudo(id) on delete set null;

-- planos_personalizados, tarefas_designadas e aulas_particulares_gravadas
-- pertencem a UM aluno OU a UM grupo — nunca os dois, nunca nenhum.
-- aula_rotulo (ex.: "Aula 1 e 2") agrupa plano, tarefa e gravação da MESMA
-- aula, pra montar os "balões" clicáveis no painel do aluno. Nulo = conteúdo
-- geral, não amarrado a uma aula específica (ex.: o currículo do curso).
create table planos_personalizados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references profiles(id) on delete cascade,
  grupo_id uuid references grupos_estudo(id) on delete cascade,
  motivo text not null,          -- a dúvida/razão que motivou a aula
  conteudo text not null,
  aula_rotulo text,
  criado_em timestamptz not null default now(),
  constraint plano_pertence_a_aluno_ou_grupo
    check ((aluno_id is not null and grupo_id is null) or (aluno_id is null and grupo_id is not null))
);

create table tarefas_designadas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references profiles(id) on delete cascade,
  grupo_id uuid references grupos_estudo(id) on delete cascade,
  tarefa_padrao_id uuid references tarefas_padrao(id), -- opcional: pode reaproveitar uma tarefa padrão
  titulo text not null,
  descricao text not null default '',
  status text not null default 'pendente' check (status in ('pendente','entregue','concluida')),
  prazo date,
  aula_rotulo text,
  constraint tarefa_pertence_a_aluno_ou_grupo
    check ((aluno_id is not null and grupo_id is null) or (aluno_id is null and grupo_id is not null))
);

-- Aula particular gravada: só o aluno dono (ou quem está no grupo dono) acessa,
-- além da Raíssa como admin.
create table aulas_particulares_gravadas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references profiles(id) on delete cascade,
  grupo_id uuid references grupos_estudo(id) on delete cascade,
  titulo text not null,
  video_url text not null,   -- link da gravação do Teams (ou onde ela for hospedada)
  data_aula date not null default current_date,
  aula_rotulo text,
  constraint gravacao_pertence_a_aluno_ou_grupo
    check ((aluno_id is not null and grupo_id is null) or (aluno_id is null and grupo_id is not null))
);

-- =====================================================================
-- 5. Row Level Security — a parte que garante "só ele acessa a aula dele"
-- =====================================================================
-- Só a service role (webhooks) e a admin (painel /admin/alunos, pra liberar
-- acesso por e-mail antes da pessoa se cadastrar) têm passe livre aqui —
-- a policy de admin fica declarada mais abaixo, depois de is_admin() existir.
alter table acessos_pendentes enable row level security;

alter table profiles enable row level security;
alter table cursos enable row level security;
alter table niveis enable row level security;
alter table aulas enable row level security;
alter table planos_padrao enable row level security;
alter table tarefas_padrao enable row level security;
alter table progresso_aulas enable row level security;
alter table progresso_tarefas enable row level security;
alter table certificados enable row level security;
alter table planos_personalizados enable row level security;
alter table tarefas_designadas enable row level security;
alter table aulas_particulares_gravadas enable row level security;
alter table grupos_estudo enable row level security;

-- função auxiliar: o usuário logado é admin (a Raíssa)?
create function is_admin()
returns boolean as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$ language sql security definer stable set search_path = public;

-- função auxiliar: qual o grupo de estudo do usuário logado (ou null, se não tiver)
create function grupo_do_usuario_atual()
returns uuid as $$
  select grupo_id from profiles where id = auth.uid();
$$ language sql security definer stable set search_path = public;

-- acessos pendentes: só a admin gerencia (liberar acesso por e-mail antes do cadastro)
create policy "admin gerencia acessos pendentes" on acessos_pendentes for all using (is_admin()) with check (is_admin());

-- perfis: cada um vê e edita o próprio; admin vê todos
create policy "ver proprio perfil" on profiles for select using (id = auth.uid() or is_admin());
create policy "editar proprio perfil" on profiles for update using (id = auth.uid() or is_admin());

-- A policy acima permite update na PRÓPRIA linha, mas não restringe QUAIS
-- colunas — sem isso, qualquer pessoa logada poderia se dar assinatura, aula
-- particular ou até virar admin direto pela API. Este trigger trava essas
-- colunas: só passa se for a admin, a service role (webhooks de pagamento)
-- ou uma conexão direta ao banco (SQL Editor, migrações — não vem do PostgREST).
create function protege_colunas_administrativas_do_perfil()
returns trigger as $$
begin
  if not (
    is_admin()
    or auth.role() = 'service_role'
    or current_setting('request.jwt.claims', true) is null
  ) then
    new.is_admin := old.is_admin;
    new.is_assinante := old.is_assinante;
    new.is_aluno_particular := old.is_aluno_particular;
    new.grupo_id := old.grupo_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trava_colunas_administrativas_do_perfil
  before update on profiles
  for each row execute procedure protege_colunas_administrativas_do_perfil();

-- conteúdo padrão: o catálogo (curso/nível/título da aula) é público de propósito —
-- vira a página /cursos/[slug] pra atrair gente pelo Google, igual a um índice de
-- programa de curso. O vídeo em si (assistir, marcar progresso, certificado) continua
-- exigindo login. Só admin escreve.
create policy "catalogo publico de cursos" on cursos for select using (true);
create policy "admin escreve cursos" on cursos for all using (is_admin());

create policy "catalogo publico de niveis" on niveis for select using (true);
create policy "admin escreve niveis" on niveis for all using (is_admin());

create policy "catalogo publico de aulas" on aulas for select using (true);
create policy "admin escreve aulas" on aulas for all using (is_admin());

create policy "ler planos padrao" on planos_padrao for select using (auth.role() = 'authenticated');
create policy "admin escreve planos padrao" on planos_padrao for all using (is_admin());

create policy "ler tarefas padrao" on tarefas_padrao for select using (auth.role() = 'authenticated');
create policy "admin escreve tarefas padrao" on tarefas_padrao for all using (is_admin());

-- progresso e certificados: só o próprio aluno mexe no que é dele
create policy "progresso aulas do proprio aluno" on progresso_aulas for all
  using (aluno_id = auth.uid() or is_admin());

create policy "progresso tarefas do proprio aluno" on progresso_tarefas for all
  using (aluno_id = auth.uid() or is_admin());

create policy "certificados do proprio aluno" on certificados for select
  using (aluno_id = auth.uid() or is_admin());
create policy "certificados inseridos pelo proprio aluno" on certificados for insert
  with check (aluno_id = auth.uid());

-- Consulta pública de certificado por código (usada em /certificado/[codigo]):
-- devolve só o necessário pra confirmar validade (nome, nível, curso, data),
-- nunca e-mail ou outro dado pessoal. Chamável sem login (RPC exposta de propósito).
create function verificar_certificado(p_codigo text)
returns table (nome_aluno text, nivel text, curso text, emitido_em timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.nome, n.nome, c.nome, cert.emitido_em
  from certificados cert
  join profiles p on p.id = cert.aluno_id
  join niveis n on n.id = cert.nivel_id
  join cursos c on c.id = n.curso_id
  where cert.codigo = p_codigo;
$$;

grant execute on function verificar_certificado(text) to anon, authenticated;

-- grupos de estudo: admin gerencia; cada membro vê o próprio grupo
create policy "admin gerencia grupos de estudo" on grupos_estudo for all
  using (is_admin()) with check (is_admin());
create policy "membro ve o proprio grupo" on grupos_estudo for select
  using (
    is_admin()
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.grupo_id = grupos_estudo.id)
  );

-- conteúdo personalizado: o aluno dono lê (ou, se for conteúdo de grupo, quem
-- estiver no mesmo grupo); só admin escreve
create policy "ler proprio plano personalizado" on planos_personalizados for select
  using (aluno_id = auth.uid() or grupo_id = grupo_do_usuario_atual() or is_admin());
create policy "admin escreve planos personalizados" on planos_personalizados for insert with check (is_admin());
create policy "admin atualiza planos personalizados" on planos_personalizados for update using (is_admin());

create policy "ler proprias tarefas designadas" on tarefas_designadas for select
  using (aluno_id = auth.uid() or grupo_id = grupo_do_usuario_atual() or is_admin());
create policy "aluno atualiza status da propria tarefa" on tarefas_designadas for update
  using (aluno_id = auth.uid() or grupo_id = grupo_do_usuario_atual() or is_admin());
create policy "admin cria tarefas designadas" on tarefas_designadas for insert with check (is_admin());

-- a linha mais importante do arquivo inteiro: a aula particular gravada só
-- pode ser lida por quem é o dono (aluno_id = auth.uid()), por quem está no
-- mesmo grupo (se for conteúdo de grupo) ou pela admin
create policy "so o dono ve a propria aula gravada" on aulas_particulares_gravadas for select
  using (aluno_id = auth.uid() or grupo_id = grupo_do_usuario_atual() or is_admin());

-- admin também pode remover conteúdo particular cadastrado por engano
create policy "admin remove planos personalizados" on planos_personalizados for delete using (is_admin());
create policy "admin remove tarefas designadas" on tarefas_designadas for delete using (is_admin());
create policy "admin remove aula gravada" on aulas_particulares_gravadas for delete using (is_admin());

-- ---------------------------------------------------------------------
-- 8. Acervo de recursos para download (famílias e projetos de Revit,
-- hospedados no Google Drive; aqui só ficam os links + metadados)
-- ---------------------------------------------------------------------
create table recursos_download (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  descricao text,
  link_drive text not null,
  ordem int not null default 0,
  arquivos int not null default 1,
  cliques int not null default 0,
  criado_em timestamptz not null default now()
);

alter table recursos_download enable row level security;

-- Qualquer usuário autenticado (com conta na plataforma) pode ver o acervo.
create policy "recursos_download_select_autenticado" on recursos_download for select
  to authenticated using (true);

-- Só admin pode gerenciar o acervo.
create policy "recursos_download_admin_insert" on recursos_download for insert
  to authenticated with check (is_admin());
create policy "recursos_download_admin_update" on recursos_download for update
  to authenticated using (is_admin()) with check (is_admin());
create policy "recursos_download_admin_delete" on recursos_download for delete
  to authenticated using (is_admin());

-- Incrementa o contador de cliques sem exigir que o aluno tenha permissão
-- de update na tabela inteira (só essa coluna, via função).
create or replace function incrementar_clique_recurso(p_recurso_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update recursos_download set cliques = cliques + 1 where id = p_recurso_id;
end;
$$;

grant execute on function incrementar_clique_recurso(uuid) to authenticated;
create policy "admin adiciona aula gravada" on aulas_particulares_gravadas for insert with check (is_admin());

-- Histórico das verificações de link do acervo de recursos (manual ou agendada) —
-- antes só existia enquanto o admin tinha a aba aberta, sem registro nenhum.
create table verificacoes_links (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  verificados int not null default 0,
  com_problema jsonb not null default '[]'::jsonb
);

alter table verificacoes_links enable row level security;

create policy "admin le verificacoes de links" on verificacoes_links for select using (is_admin());
create policy "service_role escreve verificacoes de links" on verificacoes_links for insert to service_role with check (true);
