create or replace function public.save_player_game_state(
  p_player_id uuid,
  p_expected_revision bigint,
  p_state jsonb
)
returns table (
  player_id uuid,
  schema_version smallint,
  revision bigint,
  state jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_state) <> 'object' then
    raise exception 'Invalid game state payload';
  end if;

  return query
  update public.player_game_states as saved
  set state = p_state,
      revision = saved.revision + 1,
      updated_at = now()
  where saved.player_id = p_player_id
    and saved.revision = p_expected_revision
  returning saved.player_id, saved.schema_version, saved.revision, saved.state;

  if not found then
    raise exception 'Game state revision conflict';
  end if;
end;
$$;

revoke all on function public.save_player_game_state(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_player_game_state(uuid, bigint, jsonb) to service_role;
