import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { cdbPlayers } from '@/data/cdbPlayers.js';
import { matches, playerGameStats, playerAdvancedStats } from '@/data/data.js';
import { BANQUIGER_SEASON, mergeBanquigerCalendarRounds } from '@/utils/banquigerSchedule.js';

export const GAME_DATA_KEYS = {
  eighteenZeroPlayers: 'eighteen-zero:players',
  eighteenZeroEvents: 'eighteen-zero:events',
  eighteenZeroSkills: 'eighteen-zero:skills',
  eighteenZeroChemistry: 'eighteen-zero:chemistry',
  eighteenZeroCoaches: 'eighteen-zero:coaches',
  banquigerLeague: 'banquiger:league-v2',
  banquigerSettings: 'banquiger:settings',
  banquigerPlayers: 'banquiger:players',
  banquigerRounds: 'banquiger:rounds',
  banquigerPowers: 'banquiger:powers',
  banquigerPowerState: 'banquiger:power-state',
  banquigerMarketState: 'banquiger:market-state',
};

export const loadGameDocument = async (key, fallback) => {
  if (!isSupabaseConfigured) return { data: fallback, remote: false };
  const { data, error } = await supabase.from('game_data').select('payload').eq('key', key).maybeSingle();
  if (error || !data) return { data: fallback, remote: false, error };
  return { data: data.payload ?? fallback, remote: true };
};

export const saveGameDocument = async (key, game, payload) => {
  if (!isSupabaseConfigured) return { remote: false };
  const { error } = await supabase.from('game_data').upsert(
    { key, game, payload, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  return { remote: !error, error };
};

export const loadUserGameDocument = async (key, fallback) => {
  if (!isSupabaseConfigured) return { data: fallback, remote: false };
  const { data, error } = await supabase.from('user_game_data').select('payload').eq('key', key).maybeSingle();
  if (error || !data) return { data: fallback, remote: false, error };
  return { data: data.payload ?? fallback, remote: true };
};

export const saveUserGameDocument = async (key, game, payload) => {
  if (!isSupabaseConfigured) return { remote: false };
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { remote: false };
  const { error } = await supabase.from('user_game_data').upsert(
    { user_id: userId, key, game, payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' },
  );
  return { remote: !error, error };
};

export const loadEighteenZeroBundle = async (fallbacks) => {
  const [players, events, skills, chemistry, coaches] = await Promise.all([
    loadGameDocument(GAME_DATA_KEYS.eighteenZeroPlayers, fallbacks.players),
    loadGameDocument(GAME_DATA_KEYS.eighteenZeroEvents, fallbacks.events),
    loadGameDocument(GAME_DATA_KEYS.eighteenZeroSkills, fallbacks.skills),
    loadGameDocument(GAME_DATA_KEYS.eighteenZeroChemistry, fallbacks.chemistry),
    loadGameDocument(GAME_DATA_KEYS.eighteenZeroCoaches, fallbacks.coaches),
  ]);
  const stripLegacyCost = (player) => {
    const { cost: legacyCost, ...playerWithoutCost } = player;
    return playerWithoutCost;
  };
  const savedPlayers = (Array.isArray(players.data) ? players.data : fallbacks.players)
    .filter((player) => String(player?.position || '').trim().toLowerCase() !== 'entrenador')
    .map(stripLegacyCost);
  const savedPlayersById = new Map(savedPlayers.map((player) => [player.id, player]));
  const basePlayerIds = new Set(cdbPlayers.map((player) => player.id));
  const recoveredPlayers = [
    ...cdbPlayers.map((player) => savedPlayersById.get(player.id) || stripLegacyCost(player)),
    ...savedPlayers.filter((player) => !basePlayerIds.has(player.id)),
  ];

  return {
    players: recoveredPlayers,
    events: events.data,
    skills: skills.data,
    chemistry: chemistry.data,
    coaches: coaches.data,
    hasRemoteData: [players, events, skills, chemistry, coaches].some((item) => item.remote),
  };
};

export const loadBanquigerBundle = async (fallbacks) => {
  const [settings, players, rounds, powers, powerState, marketState] = await Promise.all([
    loadGameDocument(GAME_DATA_KEYS.banquigerSettings, fallbacks.settings),
    loadGameDocument(GAME_DATA_KEYS.banquigerPlayers, fallbacks.players),
    loadGameDocument(GAME_DATA_KEYS.banquigerRounds, fallbacks.rounds),
    loadGameDocument(GAME_DATA_KEYS.banquigerPowers, fallbacks.powers),
    loadGameDocument(GAME_DATA_KEYS.banquigerPowerState, fallbacks.powerState),
    loadGameDocument(GAME_DATA_KEYS.banquigerMarketState, fallbacks.marketState),
  ]);
  return {
    settings: settings.data,
    players: players.data,
    rounds: mergeBanquigerCalendarRounds(Array.isArray(rounds.data) ? rounds.data : fallbacks.rounds),
    powers: powers.data,
    powerState: powerState.data,
    marketState: marketState.data,
    hasRemoteData: [settings, players, rounds, powers, powerState, marketState].some((item) => item.remote),
  };
};

export const loadBanquigerMatchData = async () => {
  const fallback = { matches, gameStats: playerGameStats, advancedStats: playerAdvancedStats };
  if (!isSupabaseConfigured) return fallback;
  const { data, error } = await supabase.from('matches')
    .select('id,team,season,phase,match_date,match_time,rival,venue,court,our_score,rival_score,status')
    .eq('team', 'masculine').eq('season', BANQUIGER_SEASON).order('match_date');
  if (error || !data?.length) return fallback;
  const { data: stats, error: statsError } = await supabase.from('player_stats')
    .select('*').in('match_id', data.map((match) => match.id));
  if (statsError) return fallback;
  const otherMatches = matches.filter((match) => match.season !== BANQUIGER_SEASON);
  const localById = new Map(matches.map((match) => [match.id, match]));
  return {
    matches: [...otherMatches, ...data.map((match) => ({
      ...localById.get(match.id), id: match.id, team: match.team, season: match.season,
      date: match.match_date, time: match.match_time?.slice(0, 5) || '00:00',
      rival: match.rival, venue: match.court || match.venue, status: match.status,
      result: match.status === 'finished' && match.our_score !== null && match.rival_score !== null
        ? `${match.our_score}-${match.rival_score}` : null,
    }))],
    gameStats: [...playerGameStats, ...stats.map((stat) => ({
      matchId: stat.match_id, playerId: stat.player_id, minutes: stat.minutes, points: stat.points || 0,
    }))],
    advancedStats: [...playerAdvancedStats, ...stats.map((stat) => ({
      matchId: stat.match_id, playerId: stat.player_id, points: stat.points || 0,
      fg: stat.field_goals, threePt: stat.three_pointers, ft: stat.free_throws,
      oreb: stat.offensive_rebounds || 0, dreb: stat.defensive_rebounds || 0,
      assists: stat.assists || 0, steals: stat.steals || 0, blocks: stat.blocks || 0,
      turnovers: stat.turnovers || 0, fouls: stat.fouls || 0,
    }))],
  };
};

export const loadBanquigerTeam = async (userId, season = BANQUIGER_SEASON) => {
  if (!isSupabaseConfigured || !userId) return null;
  const { data, error } = await supabase
    .from('banquiger_teams')
    .select('id,name,manager_name,budget,total_points,selected_ids,lineup_slots,selected_match_id')
    .eq('user_id', userId)
    .eq('season', season)
    .maybeSingle();
  return error ? null : data;
};

export const saveBanquigerTeam = async ({ userId, managerName, teamName, budget, selectedIds, lineupSlots, selectedMatchId, season = BANQUIGER_SEASON }) => {
  if (!isSupabaseConfigured || !userId) return { remote: false };
  const { data, error } = await supabase.from('banquiger_teams').upsert({
    user_id: userId,
    season,
    name: teamName,
    manager_name: managerName,
    budget,
    selected_ids: selectedIds,
    ...(lineupSlots ? { lineup_slots: lineupSlots } : {}),
    selected_match_id: selectedMatchId || null,
  }, { onConflict: 'user_id,season' }).select().single();
  return { remote: !error, data, error };
};

export const loadBanquigerTeams = async (season = BANQUIGER_SEASON) => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('banquiger_teams')
    .select('id,user_id,name,manager_name,budget,total_points,selected_ids,lineup_slots,selected_match_id,created_at')
    .eq('season', season)
    .order('total_points', { ascending: false });
  return error ? [] : data || [];
};

export const emptyBanquigerLeague = { inventory: [], uses: [], results: [], snapshots: {} };
export const loadBanquigerLeague = async () => {
  if (!isSupabaseConfigured) return { data: emptyBanquigerLeague, remote: false };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { data: emptyBanquigerLeague, remote: false };
  const { data, error } = await supabase.rpc('banquiger_read_league');
  return { data: data || emptyBanquigerLeague, remote: !error, error };
};
export const useBanquigerCard = async (instanceId, targets) => {
  if (!isSupabaseConfigured) throw new Error('Conecta con la web para activar poderes.');
  const { data, error } = await supabase.rpc('banquiger_use_card', { p_instance: instanceId, p_targets: targets });
  if (error) throw new Error(error.message);
  return data;
};
export const finalizeBanquigerRound = async (round, ranking) => {
  if (!isSupabaseConfigured) throw new Error('Conecta con la web para publicar la jornada.');
  const { data, error } = await supabase.rpc('banquiger_finalize_round', { p_round: round, p_ranking: ranking });
  if (error) throw new Error(error.message);
  return data;
};
