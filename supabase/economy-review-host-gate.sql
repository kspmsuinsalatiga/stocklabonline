-- StockLab v30: host-controlled transition after public economy reveal.
-- Apply to Supabase project euzilxlmhuxftycgaqwh.
create or replace function public.advance_economy_review(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_game public.games%rowtype;
  v_room public.rooms%rowtype;
  v_state jsonb;
  v_status text;
  v_seconds integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='28000';
  end if;

  select * into v_game from public.games where room_id=p_room_id for update;
  if not found then
    raise exception 'Game not found' using errcode='P0002';
  end if;

  select * into v_room from public.rooms where id=p_room_id;
  if not found or v_room.host_id is distinct from v_user_id then
    raise exception 'Hanya host yang dapat melanjutkan hasil ekonomi.' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.room_members where room_id=p_room_id and user_id=v_user_id
  ) then
    raise exception 'Not a room member' using errcode='42501';
  end if;

  if v_game.phase <> 'bidding'
     or v_game.state->>'phase_status' not in ('awaiting_debt_decisions','awaiting_bids') then
    raise exception 'Tahap hasil ekonomi sudah tidak aktif.' using errcode='55000';
  end if;

  v_state := v_game.state;
  if coalesce((v_state->>'economy_review_done_round')::integer,0)=v_game.current_round then
    return jsonb_build_object('ok',true,'already_advanced',true,'round',v_game.current_round);
  end if;

  v_status := v_state->>'phase_status';
  v_seconds := case
    when v_status='awaiting_debt_decisions' then coalesce(v_room.turn_seconds,45)
    else coalesce(v_room.bidding_seconds,90)
  end;
  v_state := jsonb_set(v_state,'{economy_review_done_round}',to_jsonb(v_game.current_round),true);

  update public.games set state=v_state,
    phase_deadline=now()+make_interval(secs=>v_seconds),
    version=version+1,updated_at=now()
  where id=v_game.id;

  insert into public.game_events(game_id,actor_id,event_type,payload)
  values(v_game.id,v_user_id,'economy_review_advanced',
    jsonb_build_object('round',v_game.current_round,'next_phase',v_status));

  return jsonb_build_object('ok',true,'round',v_game.current_round,'phase_status',v_status);
end;
$$;

grant execute on function public.advance_economy_review(uuid) to authenticated;
