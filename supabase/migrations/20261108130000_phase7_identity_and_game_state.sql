create table if not exists public.player_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 40)
    check (username ~ '^[A-Za-z0-9_-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_game_states (
  player_id uuid primary key references public.player_profiles (id) on delete cascade,
  schema_version smallint not null default 5 check (schema_version = 5),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := new.raw_user_meta_data ->> 'username';
  if requested_username is null
    or char_length(requested_username) not between 3 and 24
    or requested_username !~ '^[A-Za-z0-9_-]+$' then
    requested_username := 'p-' || replace(new.id::text, '-', '');
  end if;

  insert into public.player_profiles (id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_player_profile();

insert into public.player_profiles (id, username)
select id, 'p-' || replace(id::text, '-', '')
from auth.users
on conflict (id) do nothing;

drop trigger if exists player_profiles_updated_at on public.player_profiles;
create trigger player_profiles_updated_at
  before update on public.player_profiles
  for each row execute function public.touch_updated_at();

alter table public.player_profiles enable row level security;
alter table public.player_game_states enable row level security;

drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile"
  on public.player_profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Players can read their own game state" on public.player_game_states;
create policy "Players can read their own game state"
  on public.player_game_states for select to authenticated
  using (auth.uid() = player_id);

revoke insert, update, delete on public.player_game_states from anon, authenticated;
grant select on public.player_game_states to authenticated;
grant select, update on public.player_profiles to authenticated;
