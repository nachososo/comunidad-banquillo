-- Version matches the applied remote migration (20260831004527).
-- Add the career game to the existing document stores. No rows or policies are
-- removed; Banquiger and 18-0 keep their current access and allowed game values.
alter table public.game_data drop constraint game_data_game_check;
alter table public.game_data add constraint game_data_game_check
  check (game in ('banquiger', 'eighteen-zero', 'adn-banquiller'));

alter table public.user_game_data drop constraint user_game_data_game_check;
alter table public.user_game_data add constraint user_game_data_game_check
  check (game in ('banquiger', 'eighteen-zero', 'adn-banquiller'));
