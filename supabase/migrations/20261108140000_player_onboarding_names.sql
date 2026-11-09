alter table public.player_profiles
  add column if not exists display_name text,
  add column if not exists island_name text;

update public.player_profiles
set display_name = left(coalesce(nullif(btrim(display_name), ''), username), 32),
    island_name = coalesce(nullif(btrim(island_name), ''), 'Đảo Mầm Xanh');

alter table public.player_profiles
  alter column display_name set not null,
  alter column display_name set default 'Người sống sót',
  alter column island_name set not null,
  alter column island_name set default 'Đảo Mầm Xanh';

alter table public.player_profiles
  drop constraint if exists player_profiles_display_name_length,
  drop constraint if exists player_profiles_island_name_length;

alter table public.player_profiles
  add constraint player_profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 32),
  add constraint player_profiles_island_name_length
    check (char_length(btrim(island_name)) between 1 and 40);

create or replace function public.create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_display_name text;
  requested_island_name text;
begin
  requested_username := new.raw_user_meta_data ->> 'username';
  if requested_username is null
    or char_length(requested_username) not between 3 and 24
    or requested_username !~ '^[A-Za-z0-9_-]+$' then
    requested_username := 'p-' || replace(new.id::text, '-', '');
  end if;

  requested_display_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  if requested_display_name is null or char_length(requested_display_name) > 32 then
    requested_display_name := 'Người sống sót';
  end if;

  requested_island_name := nullif(btrim(new.raw_user_meta_data ->> 'island_name'), '');
  if requested_island_name is null or char_length(requested_island_name) > 40 then
    requested_island_name := 'Đảo Mầm Xanh';
  end if;

  insert into public.player_profiles (id, username, display_name, island_name)
  values (new.id, requested_username, requested_display_name, requested_island_name);
  return new;
end;
$$;
