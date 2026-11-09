create table if not exists public.global_world_chat_messages (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  display_name text not null,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists global_world_chat_messages_created_at_idx
  on public.global_world_chat_messages (created_at desc);

alter table public.global_world_chat_messages enable row level security;
revoke all on public.global_world_chat_messages from anon, authenticated;
grant select on public.global_world_chat_messages to authenticated;

drop policy if exists "Authenticated players can read world chat" on public.global_world_chat_messages;
create policy "Authenticated players can read world chat"
  on public.global_world_chat_messages for select to authenticated
  using (true);

create or replace function public.send_global_world_chat_message(p_message text)
returns table (
  id bigint,
  player_id uuid,
  display_name text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_id uuid;
  sender_name text;
  clean_message text;
begin
  sender_id := auth.uid();
  clean_message := btrim(p_message);
  if sender_id is null then
    raise exception 'Cần đăng nhập để gửi tin nhắn.';
  end if;
  if clean_message is null or char_length(clean_message) = 0 or char_length(clean_message) > 300 then
    raise exception 'Tin nhắn cần có từ 1 đến 300 ký tự.';
  end if;

  select profile.display_name into sender_name
  from public.player_profiles as profile
  where profile.id = sender_id;
  if sender_name is null then
    raise exception 'Không tìm thấy hồ sơ người chơi.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(sender_id::text, 0));
  if exists (
    select 1
    from public.global_world_chat_messages as recent_message
    where recent_message.player_id = sender_id
      and recent_message.created_at > now() - interval '1 second'
  ) then
    raise exception 'Vui lòng đợi một chút trước khi gửi tin nhắn tiếp theo.';
  end if;

  return query
  insert into public.global_world_chat_messages (player_id, display_name, message)
  values (sender_id, sender_name, clean_message)
  returning global_world_chat_messages.id,
    global_world_chat_messages.player_id,
    global_world_chat_messages.display_name,
    global_world_chat_messages.message,
    global_world_chat_messages.created_at;
end;
$$;

revoke all on function public.send_global_world_chat_message(text) from public, anon;
grant execute on function public.send_global_world_chat_message(text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_world_chat_messages'
  ) then
    alter publication supabase_realtime add table public.global_world_chat_messages;
  end if;
end;
$$;
