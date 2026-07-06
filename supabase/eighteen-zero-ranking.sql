create table if not exists public.eighteen_zero_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  best_score numeric(5,1) not null check (best_score between 0 and 100),
  last_score numeric(5,1) not null check (last_score between 0 and 100),
  best_record text not null,
  games_played integer not null default 1 check (games_played > 0),
  updated_at timestamptz not null default now()
);

alter table public.eighteen_zero_scores enable row level security;

drop policy if exists eighteen_zero_scores_authenticated_read on public.eighteen_zero_scores;
create policy eighteen_zero_scores_authenticated_read on public.eighteen_zero_scores
for select to authenticated
using (true);

revoke all on table public.eighteen_zero_scores from anon, authenticated;
grant select on table public.eighteen_zero_scores to authenticated;

create or replace function public.submit_eighteen_zero_score(p_score numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_display_name text;
  v_score numeric(5,1);
  v_record text;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para guardar tu puntuación.';
  end if;

  v_score := round(p_score, 1);
  if v_score is null or v_score < 0 or v_score > 100 then
    raise exception 'La puntuación no es válida.';
  end if;

  select name into v_display_name
  from public.profiles
  where id = v_user_id;

  if v_display_name is null then
    raise exception 'No se ha encontrado el perfil del usuario.';
  end if;

  v_record := case
    when v_score >= 95 then '18-0'
    when v_score >= 90 then '17-1'
    when v_score >= 84 then '16-2'
    when v_score >= 78 then '15-3'
    when v_score >= 70 then '13-5'
    when v_score >= 60 then '10-8'
    else 'Temporada complicada'
  end;

  insert into public.eighteen_zero_scores (
    user_id, display_name, best_score, last_score, best_record, games_played, updated_at
  ) values (
    v_user_id, v_display_name, v_score, v_score, v_record, 1, now()
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    best_score = greatest(public.eighteen_zero_scores.best_score, excluded.best_score),
    last_score = excluded.last_score,
    best_record = case
      when excluded.best_score > public.eighteen_zero_scores.best_score then excluded.best_record
      else public.eighteen_zero_scores.best_record
    end,
    games_played = public.eighteen_zero_scores.games_played + 1,
    updated_at = now();
end;
$$;

revoke execute on function public.submit_eighteen_zero_score(numeric) from public, anon;
grant execute on function public.submit_eighteen_zero_score(numeric) to authenticated;
