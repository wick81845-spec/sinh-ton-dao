create table if not exists public.global_game_settings (
  id boolean primary key default true check (id),
  global_weather_id text,
  updated_by uuid references public.player_profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.global_game_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.game_admin_commands (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  created_by uuid references public.player_profiles (id) on delete set null,
  command jsonb not null check (jsonb_typeof(command) = 'object'),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists game_admin_commands_pending_by_player
  on public.game_admin_commands (player_id, created_at)
  where applied_at is null;

alter table public.global_game_settings enable row level security;
alter table public.game_admin_commands enable row level security;

revoke all on public.global_game_settings from public, anon, authenticated;
revoke all on public.game_admin_commands from public, anon, authenticated;
grant all on public.global_game_settings to service_role;
grant all on public.game_admin_commands to service_role;
