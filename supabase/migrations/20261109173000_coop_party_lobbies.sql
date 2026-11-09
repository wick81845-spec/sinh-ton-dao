-- Historical migration retained for projects that already recorded this version.
-- Party APIs and UI have been retired in favor of one shared world.
create table if not exists public.game_parties (
  id uuid primary key,
  invite_code text not null unique
    check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  leader_id uuid not null references public.player_profiles (id) on delete cascade,
  max_members smallint not null check (max_members between 2 and 20),
  status text not null default 'open' check (status = 'open'),
  created_at timestamptz not null default now()
);

create table if not exists public.game_party_members (
  party_id uuid not null references public.game_parties (id) on delete cascade,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, player_id),
  unique (player_id)
);

alter table public.game_parties enable row level security;
alter table public.game_party_members enable row level security;

revoke all on public.game_parties, public.game_party_members from anon, authenticated;
grant all on public.game_parties, public.game_party_members to service_role;

create or replace function public.create_game_party(
  p_party_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_max_members smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_max_members not between 2 and 20
    or p_invite_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception 'Thông tin nhóm không hợp lệ.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.game_party_members
    where player_id = p_player_id
  ) then
    raise exception 'Bạn đang ở trong một nhóm khác.' using errcode = '23505';
  end if;

  insert into public.game_parties (id, invite_code, leader_id, max_members)
  values (p_party_id, p_invite_code, p_player_id, p_max_members);
  insert into public.game_party_members (party_id, player_id)
  values (p_party_id, p_player_id);
end;
$$;

create or replace function public.join_game_party(
  p_invite_code text,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_party public.game_parties%rowtype;
  existing_party_id uuid;
  member_count integer;
begin
  select party_id into existing_party_id
  from public.game_party_members
  where player_id = p_player_id;
  if existing_party_id is not null then
    if exists (
      select 1 from public.game_parties
      where id = existing_party_id and invite_code = upper(btrim(p_invite_code))
    ) then
      return;
    end if;
    raise exception 'Bạn đang ở trong một nhóm khác.' using errcode = '23505';
  end if;

  select * into target_party
  from public.game_parties
  where invite_code = upper(btrim(p_invite_code)) and status = 'open'
  for update;
  if not found then
    raise exception 'Không tìm thấy nhóm đang mở với mã này.' using errcode = 'P0002';
  end if;

  select count(*) into member_count
  from public.game_party_members
  where party_id = target_party.id;
  if member_count >= target_party.max_members then
    raise exception 'Nhóm đã đủ số thành viên.' using errcode = '23514';
  end if;

  insert into public.game_party_members (party_id, player_id)
  values (target_party.id, p_player_id);
end;
$$;

create or replace function public.leave_game_party(
  p_party_id uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_leader_id uuid;
  next_leader_id uuid;
begin
  select leader_id into current_leader_id
  from public.game_parties
  where id = p_party_id
  for update;
  if not found or not exists (
    select 1 from public.game_party_members
    where party_id = p_party_id and player_id = p_player_id
  ) then
    return;
  end if;

  delete from public.game_party_members
  where party_id = p_party_id and player_id = p_player_id;

  if current_leader_id = p_player_id then
    select player_id into next_leader_id
    from public.game_party_members
    where party_id = p_party_id
    order by joined_at, player_id
    limit 1;

    if next_leader_id is null then
      delete from public.game_parties where id = p_party_id;
    else
      update public.game_parties
      set leader_id = next_leader_id
      where id = p_party_id;
    end if;
  end if;
end;
$$;

revoke all on function public.create_game_party(uuid, text, uuid, smallint) from public, anon, authenticated;
revoke all on function public.join_game_party(text, uuid) from public, anon, authenticated;
revoke all on function public.leave_game_party(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_game_party(uuid, text, uuid, smallint) to service_role;
grant execute on function public.join_game_party(text, uuid) to service_role;
grant execute on function public.leave_game_party(uuid, uuid) to service_role;
