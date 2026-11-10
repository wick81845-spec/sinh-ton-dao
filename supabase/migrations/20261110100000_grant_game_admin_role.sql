alter table public.player_profiles
  add column if not exists is_admin boolean not null default false;

revoke update on table public.player_profiles from authenticated;
grant update (display_name, island_name) on table public.player_profiles to authenticated;

do $$
begin
  update public.player_profiles
  set is_admin = true
  where id = '9fb61632-9e1f-4380-9a64-05553612b353';

  if not found then
    raise exception 'Cannot grant game admin: player profile 9fb61632-9e1f-4380-9a64-05553612b353 does not exist.';
  end if;
end
$$;
