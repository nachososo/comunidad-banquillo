import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { cdbPlayers } from '@/data/cdbPlayers.js';

export const GAME_DATA_KEYS = {
  eighteenZeroPlayers: 'eighteen-zero:players',
  eighteenZeroEvents: 'eighteen-zero:events',
  eighteenZeroSkills: 'eighteen-zero:skills',
  eighteenZeroChemistry: 'eighteen-zero:chemistry',
  eighteenZeroCoaches: 'eighteen-zero:coaches',
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
    rounds: rounds.data,
    powers: powers.data,
    powerState: powerState.data,
    marketState: marketState.data,
    hasRemoteData: [settings, players, rounds, powers, powerState, marketState].some((item) => item.remote),
  };
};

export const loadBanquigerTeam = async (userId, season = '2025-2026') => {
  if (!isSupabaseConfigured || !userId) return null;
  const { data, error } = await supabase
    .from('banquiger_teams')
    .select('id,name,manager_name,budget,total_points,selected_ids,selected_match_id')
    .eq('user_id', userId)
    .eq('season', season)
    .maybeSingle();
  return error ? null : data;
};

export const saveBanquigerTeam = async ({ userId, managerName, teamName, budget, selectedIds, selectedMatchId }) => {
  if (!isSupabaseConfigured || !userId) return { remote: false };
  const { data, error } = await supabase.from('banquiger_teams').upsert({
    user_id: userId,
    season: '2025-2026',
    name: teamName,
    manager_name: managerName,
    budget,
    selected_ids: selectedIds,
    selected_match_id: selectedMatchId || null,
  }, { onConflict: 'user_id,season' }).select().single();
  return { remote: !error, data, error };
};

export const loadBanquigerTeams = async (season = '2025-2026') => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('banquiger_teams')
    .select('id,user_id,name,manager_name,budget,total_points,selected_ids')
    .eq('season', season)
    .order('total_points', { ascending: false });
  return error ? [] : data || [];
};
