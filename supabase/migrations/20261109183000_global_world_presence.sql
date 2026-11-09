create table if not exists public.global_world_capacity (
  id smallint primary key check (id = 1),
  max_players smallint not null check (max_players = 20)
);

insert into public.global_world_capacity (id, max_players)
values (1, 20)
on conflict (id) do update set max_players = excluded.max_players;

create table if not exists public.world_online_players (
  player_id uuid primary key references public.player_profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.global_world_capacity enable row level security;
alter table public.world_online_players enable row level security;
revoke all on public.global_world_capacity, public.world_online_players from anon, authenticated;
grant all on public.global_world_capacity, public.world_online_players to service_role;

create or replace function public.enter_global_world(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_limit smallint;
begin
  select max_players into player_limit
  from public.global_world_capacity
  where id = 1
  for update;

  if player_limit is null then
    raise exception 'Cấu hình sức chứa thế giới chưa tồn tại.' using errcode = 'P0002';
  end if;

  delete from public.world_online_players
  where last_seen_at < now() - interval '60 seconds';

  if not exists (
    select 1 from public.world_online_players where player_id = p_player_id
  ) and (select count(*) from public.world_online_players) >= player_limit then
    raise exception 'Thế giới đã đủ 20 người chơi online.' using errcode = 'P0001';
  end if;

  insert into public.world_online_players (player_id, joined_at, last_seen_at)
  values (p_player_id, now(), now())
  on conflict (player_id) do update set last_seen_at = now();
end;
$$;

create or replace function public.leave_global_world(p_player_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.world_online_players where player_id = p_player_id;
$$;

revoke all on function public.enter_global_world(uuid) from public, anon, authenticated;
revoke all on function public.leave_global_world(uuid) from public, anon, authenticated;
grant execute on function public.enter_global_world(uuid) to service_role;
grant execute on function public.leave_global_world(uuid) to service_role;
