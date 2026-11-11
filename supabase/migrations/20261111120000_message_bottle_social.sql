create table if not exists public.message_bottle_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.player_profiles (id) on delete cascade,
  sender_display_name text not null,
  sender_island_id text not null,
  message text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'hidden'))
);

create index if not exists message_bottle_messages_expiry_idx
  on public.message_bottle_messages (expires_at);

create table if not exists public.message_bottle_readers (
  message_id bigint not null references public.message_bottle_messages (id) on delete cascade,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, player_id)
);

create index if not exists message_bottle_readers_player_idx
  on public.message_bottle_readers (player_id, read_at desc);

create table if not exists public.message_bottle_reports (
  message_id bigint not null references public.message_bottle_messages (id) on delete cascade,
  reporter_id uuid not null references public.player_profiles (id) on delete cascade,
  reason text not null
    check (reason in ('spam', 'inappropriate', 'personal_info', 'scam', 'other')),
  created_at timestamptz not null default now(),
  primary key (message_id, reporter_id)
);

alter table public.message_bottle_messages enable row level security;
alter table public.message_bottle_readers enable row level security;
alter table public.message_bottle_reports enable row level security;

revoke all on public.message_bottle_messages from anon, authenticated;
revoke all on public.message_bottle_readers from anon, authenticated;
revoke all on public.message_bottle_reports from anon, authenticated;

create or replace function public.send_message_bottle(p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_id uuid;
  sender_name text;
  sender_island text;
  clean_message text;
  active_message_count bigint;
begin
  sender_id := auth.uid();
  clean_message := btrim(p_message);
  if sender_id is null then
    raise exception 'Cần đăng nhập để gửi chai thông điệp.';
  end if;
  if clean_message is null or char_length(clean_message) = 0 or char_length(clean_message) > 280 then
    raise exception 'Thông điệp cần có từ 1 đến 280 ký tự.';
  end if;
  if clean_message ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|[[:alnum:]_-]+\.(com|net|org|io|vn|edu|gov)([^[:alpha:]]|$))' then
    raise exception 'Không được gửi liên kết hoặc địa chỉ email trong chai thông điệp.';
  end if;
  if char_length(pg_catalog.regexp_replace(clean_message, '[^0-9]', '', 'g')) >= 9 then
    raise exception 'Không được gửi số điện thoại hoặc dãy số có thể nhận dạng cá nhân.';
  end if;
  if clean_message ~* '(^|[^[:alnum:]])(fuck|shit|bitch|nigger|cặc|địt|đụ|lồn|đĩ)([^[:alnum:]]|$)' then
    raise exception 'Thông điệp có nội dung không phù hợp.';
  end if;

  select profile.display_name into sender_name
  from public.player_profiles as profile
  where profile.id = sender_id;
  if sender_name is null then
    raise exception 'Không tìm thấy hồ sơ người chơi.';
  end if;

  select game_state.state #>> '{character,currentLocationId}'
  into sender_island
  from public.player_game_states as game_state
  where game_state.player_id = sender_id;
  if sender_island is null or char_length(sender_island) = 0 then
    raise exception 'Không thể xác định hòn đảo hiện tại của bạn.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(sender_id::text || ':message-bottle', 0));
  if exists (
    select 1
    from public.message_bottle_messages as recent_message
    where recent_message.sender_id = sender_id
      and recent_message.created_at >= date_trunc('day', now())
  ) then
    raise exception 'Bạn đã gửi chai thông điệp hôm nay. Hãy quay lại vào ngày mai.';
  end if;

  delete from public.message_bottle_messages
  where expires_at <= now();

  select count(*) into active_message_count
  from public.message_bottle_messages
  where expires_at > now();
  if active_message_count >= 50000 then
    raise exception 'Kho thông điệp đang đầy. Hãy thử lại sau.';
  end if;

  insert into public.message_bottle_messages (
    sender_id, sender_display_name, sender_island_id, message
  ) values (sender_id, sender_name, sender_island, clean_message);
end;
$$;

create or replace function public.read_message_bottle()
returns table (
  message_id bigint,
  sender_display_name text,
  sender_island_id text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reader_id uuid;
  reader_island text;
  selected_message public.message_bottle_messages%rowtype;
begin
  reader_id := auth.uid();
  if reader_id is null then
    raise exception 'Cần đăng nhập để đọc chai thông điệp.';
  end if;

  select game_state.state #>> '{character,currentLocationId}'
  into reader_island
  from public.player_game_states as game_state
  where game_state.player_id = reader_id;
  if reader_island is null or char_length(reader_island) = 0 then
    raise exception 'Không thể xác định hòn đảo hiện tại của bạn.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(reader_id::text || ':message-bottle', 0));
  select candidate.* into selected_message
  from public.message_bottle_messages as candidate
  where candidate.sender_id <> reader_id
    and candidate.sender_island_id <> reader_island
    and candidate.moderation_status = 'visible'
    and candidate.expires_at > now()
    and not exists (
      select 1
      from public.message_bottle_readers as reader
      where reader.message_id = candidate.id
        and reader.player_id = reader_id
    )
  order by random()
  limit 1;

  if not found then
    return;
  end if;

  insert into public.message_bottle_readers (message_id, player_id)
  values (selected_message.id, reader_id)
  on conflict (message_id, player_id) do nothing;

  return query select
    selected_message.id,
    selected_message.sender_display_name,
    selected_message.sender_island_id,
    selected_message.message,
    selected_message.created_at;
end;
$$;

create or replace function public.report_message_bottle(p_message_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid;
  report_count bigint;
begin
  reporter_id := auth.uid();
  if reporter_id is null then
    raise exception 'Cần đăng nhập để báo cáo chai thông điệp.';
  end if;
  if p_reason not in ('spam', 'inappropriate', 'personal_info', 'scam', 'other') then
    raise exception 'Lý do báo cáo không hợp lệ.';
  end if;
  if not exists (
    select 1
    from public.message_bottle_readers as reader
    join public.message_bottle_messages as bottle on bottle.id = reader.message_id
    where reader.message_id = p_message_id
      and reader.player_id = reporter_id
      and bottle.sender_id <> reporter_id
      and bottle.expires_at > now()
  ) then
    raise exception 'Chỉ có thể báo cáo thông điệp bạn đã đọc.';
  end if;

  insert into public.message_bottle_reports (message_id, reporter_id, reason)
  values (p_message_id, reporter_id, p_reason)
  on conflict (message_id, reporter_id) do nothing;

  select count(*) into report_count
  from public.message_bottle_reports
  where message_id = p_message_id;
  if report_count >= 3 then
    update public.message_bottle_messages
    set moderation_status = 'hidden'
    where id = p_message_id;
  end if;
end;
$$;

revoke all on function public.send_message_bottle(text) from public, anon;
revoke all on function public.read_message_bottle() from public, anon;
revoke all on function public.report_message_bottle(bigint, text) from public, anon;
grant execute on function public.send_message_bottle(text) to authenticated;
grant execute on function public.read_message_bottle() to authenticated;
grant execute on function public.report_message_bottle(bigint, text) to authenticated;
