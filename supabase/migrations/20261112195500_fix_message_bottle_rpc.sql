create or replace function public.send_message_bottle(p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
  v_sender_name text;
  v_sender_island text;
  v_clean_message text;
  v_active_message_count bigint;
begin
  v_sender_id := auth.uid();
  v_clean_message := btrim(p_message);
  if v_sender_id is null then
    raise exception 'Cần đăng nhập để gửi chai thông điệp.';
  end if;
  if v_clean_message is null or char_length(v_clean_message) = 0 or char_length(v_clean_message) > 280 then
    raise exception 'Thông điệp cần có từ 1 đến 280 ký tự.';
  end if;
  if v_clean_message ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|[[:alnum:]_-]+\.(com|net|org|io|vn|edu|gov)([^[:alpha:]]|$))' then
    raise exception 'Không được gửi liên kết hoặc địa chỉ email trong chai thông điệp.';
  end if;
  if char_length(pg_catalog.regexp_replace(v_clean_message, '[^0-9]', '', 'g')) >= 9 then
    raise exception 'Không được gửi số điện thoại hoặc dãy số có thể nhận dạng cá nhân.';
  end if;
  if v_clean_message ~* '(^|[^[:alnum:]])(fuck|shit|bitch|nigger|cặc|địt|đụ|lồn|đĩ)([^[:alnum:]]|$)' then
    raise exception 'Thông điệp có nội dung không phù hợp.';
  end if;

  select profile.display_name into v_sender_name
  from public.player_profiles as profile
  where profile.id = v_sender_id;
  if v_sender_name is null then
    raise exception 'Không tìm thấy hồ sơ người chơi.';
  end if;

  select game_state.state #>> '{character,currentLocationId}'
  into v_sender_island
  from public.player_game_states as game_state
  where game_state.player_id = v_sender_id;
  if v_sender_island is null or char_length(v_sender_island) = 0 then
    raise exception 'Không thể xác định hòn đảo hiện tại của bạn.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_sender_id::text || ':message-bottle', 0));
  if exists (
    select 1
    from public.message_bottle_messages as recent_message
    where recent_message.sender_id = v_sender_id
      and recent_message.created_at >= date_trunc('day', now())
  ) then
    raise exception 'Bạn đã gửi chai thông điệp hôm nay. Hãy quay lại vào ngày mai.';
  end if;

  delete from public.message_bottle_messages
  where expires_at <= now();

  select count(*) into v_active_message_count
  from public.message_bottle_messages as active_message
  where active_message.expires_at > now();
  if v_active_message_count >= 50000 then
    raise exception 'Kho thông điệp đang đầy. Hãy thử lại sau.';
  end if;

  insert into public.message_bottle_messages (
    sender_id, sender_display_name, sender_island_id, message
  ) values (v_sender_id, v_sender_name, v_sender_island, v_clean_message);
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
  v_reader_id uuid;
  v_reader_island text;
  v_selected_message public.message_bottle_messages%rowtype;
begin
  v_reader_id := auth.uid();
  if v_reader_id is null then
    raise exception 'Cần đăng nhập để đọc chai thông điệp.';
  end if;

  select game_state.state #>> '{character,currentLocationId}'
  into v_reader_island
  from public.player_game_states as game_state
  where game_state.player_id = v_reader_id;
  if v_reader_island is null or char_length(v_reader_island) = 0 then
    raise exception 'Không thể xác định hòn đảo hiện tại của bạn.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_reader_id::text || ':message-bottle', 0));
  select candidate.* into v_selected_message
  from public.message_bottle_messages as candidate
  where candidate.sender_id <> v_reader_id
    and candidate.sender_island_id <> v_reader_island
    and candidate.moderation_status = 'visible'
    and candidate.expires_at > now()
    and not exists (
      select 1
      from public.message_bottle_readers as reader
      where reader.message_id = candidate.id
        and reader.player_id = v_reader_id
    )
  order by random()
  limit 1;

  if not found then
    return;
  end if;

  insert into public.message_bottle_readers (message_id, player_id)
  values (v_selected_message.id, v_reader_id)
  on conflict (message_id, player_id) do nothing;

  return query select
    v_selected_message.id,
    v_selected_message.sender_display_name,
    v_selected_message.sender_island_id,
    v_selected_message.message,
    v_selected_message.created_at;
end;
$$;

create or replace function public.report_message_bottle(p_message_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid;
  v_report_count bigint;
begin
  v_reporter_id := auth.uid();
  if v_reporter_id is null then
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
      and reader.player_id = v_reporter_id
      and bottle.sender_id <> v_reporter_id
      and bottle.expires_at > now()
  ) then
    raise exception 'Chỉ có thể báo cáo thông điệp bạn đã đọc.';
  end if;

  insert into public.message_bottle_reports (message_id, reporter_id, reason)
  values (p_message_id, v_reporter_id, p_reason)
  on conflict (message_id, reporter_id) do nothing;

  select count(*) into v_report_count
  from public.message_bottle_reports as report
  where report.message_id = p_message_id;
  if v_report_count >= 3 then
    update public.message_bottle_messages as bottle
    set moderation_status = 'hidden'
    where bottle.id = p_message_id;
  end if;
end;
$$;

revoke all on function public.send_message_bottle(text) from public, anon;
revoke all on function public.read_message_bottle() from public, anon;
revoke all on function public.report_message_bottle(bigint, text) from public, anon;
grant execute on function public.send_message_bottle(text) to authenticated;
grant execute on function public.read_message_bottle() to authenticated;
grant execute on function public.report_message_bottle(bigint, text) to authenticated;
