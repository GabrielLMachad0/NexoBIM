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

  insert into profiles (id, nome, email, is_assinante, is_aluno_particular)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    coalesce(pendente.is_assinante, false),
    coalesce(pendente.is_aluno_particular, false)
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
  unique (aluno_id, nivel_id)
);

-- ---------------------------------------------------------------------
-- 4. Conteúdo personalizado (só existe para quem está em aula particular)
-- ---------------------------------------------------------------------
create table planos_personalizados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  motivo text not null,          -- a dúvida/razão que motivou a aula
  conteudo text not null,
  criado_em timestamptz not null default now()
);

create table tarefas_designadas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  tarefa_padrao_id uuid references tarefas_padrao(id), -- opcional: pode reaproveitar uma tarefa padrão
  titulo text not null,
  descricao text not null default '',
  status text not null default 'pendente' check (status in ('pendente','entregue','concluida')),
  prazo date
);

-- Aula particular gravada: só o aluno dono acessa (e a Raíssa, como admin)
create table aulas_particulares_gravadas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  titulo text not null,
  video_url text not null,   -- link da gravação do Teams (ou onde ela for hospedada)
  data_aula date not null default current_date
);

-- =====================================================================
-- 5. Row Level Security — a parte que garante "só ele acessa a aula dele"
-- =====================================================================
-- Sem nenhuma "policy" criada para essa tabela: com RLS ligado e zero policies,
-- nem o próprio usuário logado consegue ler ou escrever aqui — só a service role
-- (usada pelos webhooks no servidor) tem passe livre, que é exatamente o que queremos.
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

-- função auxiliar: o usuário logado é admin (a Raíssa)?
create function is_admin()
returns boolean as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$ language sql security definer stable set search_path = public;

-- perfis: cada um vê e edita o próprio; admin vê todos
create policy "ver proprio perfil" on profiles for select using (id = auth.uid() or is_admin());
create policy "editar proprio perfil" on profiles for update using (id = auth.uid() or is_admin());

-- conteúdo padrão: qualquer usuário autenticado lê; só admin escreve
create policy "ler cursos" on cursos for select using (auth.role() = 'authenticated');
create policy "admin escreve cursos" on cursos for all using (is_admin());

create policy "ler niveis" on niveis for select using (auth.role() = 'authenticated');
create policy "admin escreve niveis" on niveis for all using (is_admin());

create policy "ler aulas" on aulas for select using (auth.role() = 'authenticated');
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

-- conteúdo personalizado: só o aluno dono lê; só admin escreve
create policy "ler proprio plano personalizado" on planos_personalizados for select
  using (aluno_id = auth.uid() or is_admin());
create policy "admin escreve planos personalizados" on planos_personalizados for insert with check (is_admin());
create policy "admin atualiza planos personalizados" on planos_personalizados for update using (is_admin());

create policy "ler proprias tarefas designadas" on tarefas_designadas for select
  using (aluno_id = auth.uid() or is_admin());
create policy "aluno atualiza status da propria tarefa" on tarefas_designadas for update
  using (aluno_id = auth.uid() or is_admin());
create policy "admin cria tarefas designadas" on tarefas_designadas for insert with check (is_admin());

-- a linha mais importante do arquivo inteiro: a aula particular gravada
-- só pode ser lida por quem é o dono (aluno_id = auth.uid()) ou pela admin
create policy "so o dono ve a propria aula gravada" on aulas_particulares_gravadas for select
  using (aluno_id = auth.uid() or is_admin());
create policy "admin adiciona aula gravada" on aulas_particulares_gravadas for insert with check (is_admin());
