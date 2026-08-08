-- ============================================================
-- DISCIPLINA — schema Supabase (Postgres)
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
-- Pressupõe autenticação nativa do Supabase (tabela auth.users),
-- que já garante unicidade de e-mail. Username tem UNIQUE explícito.
-- ============================================================

-- ---------- PERFIS ----------
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nome_guerra text not null,
  foto_url text,
  idade int,
  peso_kg numeric(5,1),
  altura_cm int,
  xp_total int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "Perfis são visíveis para todo mundo autenticado"
  on public.perfis for select
  to authenticated
  using (true);

create policy "Cada um só edita o próprio perfil"
  on public.perfis for update
  to authenticated
  using (auth.uid() = id);

create policy "Cada um só cria o próprio perfil"
  on public.perfis for insert
  to authenticated
  with check (auth.uid() = id);

-- ---------- STATUS DIÁRIO / XP (pra ranking e patente) ----------
create table public.dias_status (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  data date not null,
  status text not null check (status in ('perfeito','parcial','falta')),
  unique (usuario_id, data)
);
alter table public.dias_status enable row level security;

create policy "Dono le e escreve seus próprios dias"
  on public.dias_status for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "Todo mundo autenticado pode ver status alheio (ranking)"
  on public.dias_status for select
  to authenticated
  using (true);

-- ---------- TREINOS: template semanal (Seg-Dom) ----------
create table public.treino_template (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = segunda
  tipo text not null,
  descricao text,
  unique (usuario_id, dia_semana)
);
alter table public.treino_template enable row level security;
create policy "Dono gerencia seu template de treino"
  on public.treino_template for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- TREINOS: execução por data real ----------
create table public.treino_execucao (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  data date not null,
  concluido boolean not null default false,
  midia_url text,       -- URL no Cloudflare R2
  midia_tipo text,       -- 'foto' | 'video'
  duracao_segundos int,
  pausado_segundos int,
  unique (usuario_id, data)
);
alter table public.treino_execucao enable row level security;
create policy "Dono gerencia sua execução de treino"
  on public.treino_execucao for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- ESTUDOS: matérias e conteúdos ----------
create table public.materias (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  nome text not null,
  unique (usuario_id, nome)
);
alter table public.materias enable row level security;
create policy "Dono gerencia suas matérias"
  on public.materias for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table public.conteudos (
  id bigint generated always as identity primary key,
  materia_id bigint not null references public.materias(id) on delete cascade,
  nome text not null,
  concluido boolean not null default false,
  ordem int not null default 0
);
alter table public.conteudos enable row level security;
create policy "Dono gerencia conteúdos das próprias matérias"
  on public.conteudos for all
  to authenticated
  using (exists (select 1 from public.materias m where m.id = materia_id and m.usuario_id = auth.uid()))
  with check (exists (select 1 from public.materias m where m.id = materia_id and m.usuario_id = auth.uid()));

-- ---------- ESTUDOS: agenda semanal (que matéria em qual dia) ----------
create table public.estudo_agenda (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  materia_id bigint not null references public.materias(id) on delete cascade
);
alter table public.estudo_agenda enable row level security;
create policy "Dono gerencia sua agenda de estudo"
  on public.estudo_agenda for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- ESTUDOS: sessões (log do cronômetro) ----------
create table public.estudo_sessoes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  materia_id bigint references public.materias(id) on delete set null,
  data date not null,
  duracao_segundos int not null,
  pausado_segundos int not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.estudo_sessoes enable row level security;
create policy "Dono gerencia suas sessões de estudo"
  on public.estudo_sessoes for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- SIMULADOS ----------
create table public.simulados (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  data date not null,
  total int not null,
  acertos int not null,
  erros int not null,
  midia_url text
);
alter table public.simulados enable row level security;
create policy "Dono gerencia seus simulados"
  on public.simulados for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- ALIMENTAÇÃO ----------
create table public.alimentacao_template (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  descricao text not null,
  concluido boolean not null default false
);
alter table public.alimentacao_template enable row level security;
create policy "Dono gerencia alimentação"
  on public.alimentacao_template for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table public.medidas_corporais (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  data date not null,
  peso_kg numeric(5,1) not null,
  criado_em timestamptz not null default now()
);
alter table public.medidas_corporais enable row level security;
create policy "Dono gerencia suas medidas"
  on public.medidas_corporais for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- ROTINA ----------
create table public.rotina_items (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  titulo text not null,
  horario time not null,
  concluido_hoje boolean not null default false,
  ultima_conclusao date
);
alter table public.rotina_items enable row level security;
create policy "Dono gerencia sua rotina"
  on public.rotina_items for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- BATALHA: amigos ----------
create table public.amizades (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  amigo_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (usuario_id, amigo_id)
);
alter table public.amizades enable row level security;
create policy "Dono gerencia sua lista de amigos"
  on public.amizades for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ---------- BATALHA: feed social ----------
create table public.feed_posts (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null, -- 'treino' | 'estudo' | 'simulado' | 'manual'
  texto text,
  midia_url text,
  criado_em timestamptz not null default now()
);
alter table public.feed_posts enable row level security;
create policy "Todo mundo autenticado vê os posts (feed público entre usuários)"
  on public.feed_posts for select
  to authenticated
  using (true);
create policy "Dono cria/edita/apaga seus posts"
  on public.feed_posts for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table public.feed_likes (
  post_id bigint not null references public.feed_posts(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  primary key (post_id, usuario_id)
);
alter table public.feed_likes enable row level security;
create policy "Todo mundo vê curtidas"
  on public.feed_likes for select to authenticated using (true);
create policy "Usuário curte/descurte por conta própria"
  on public.feed_likes for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table public.feed_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.feed_posts(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);
alter table public.feed_comments enable row level security;
create policy "Todo mundo vê comentários"
  on public.feed_comments for select to authenticated using (true);
create policy "Usuário comenta por conta própria"
  on public.feed_comments for insert
  to authenticated
  with check (auth.uid() = usuario_id);

-- ============================================================
-- FIM DO SCHEMA
-- Depois de rodar isso, habilitar Realtime em:
-- dias_status, feed_posts, feed_likes, feed_comments
-- (Database → Replication, no painel do Supabase)
-- ============================================================
