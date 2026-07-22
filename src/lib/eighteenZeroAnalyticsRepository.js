import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const round = (value) => Math.round(value * 10) / 10;

const increment = (map, key, extra = {}) => {
  if (!key) return;
  const current = map.get(key) || { id: key, name: key, count: 0, ...extra };
  map.set(key, { ...current, ...extra, count: current.count + 1 });
};

const sortByCount = (map, limit = 5) =>
  Array.from(map.values())
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))
    .slice(0, limit);

const normalizeGame = (game) => ({
  id: game.id,
  userId: game.user_id,
  displayName: game.display_name || 'Usuario',
  score: asNumber(game.score),
  record: game.record || 'Temporada complicada',
  lineup: Array.isArray(game.lineup) ? game.lineup : [],
  coach: game.coach || null,
  usedReroll: game.used_reroll === true,
  createdAt: game.created_at,
});

const buildAnalytics = (games) => {
  const normalizedGames = games.map(normalizeGame);
  const playerMap = new Map();
  const coachMap = new Map();
  const recordMap = new Map();
  const users = new Set(normalizedGames.map((game) => game.userId).filter(Boolean));
  const totalScore = normalizedGames.reduce((total, game) => total + game.score, 0);
  const bestGame = [...normalizedGames].sort(
    (first, second) => second.score - first.score || new Date(first.createdAt) - new Date(second.createdAt),
  )[0] || null;

  normalizedGames.forEach((game) => {
    increment(recordMap, game.record);
    if (game.coach?.name) increment(coachMap, game.coach.id || game.coach.name, { name: game.coach.name });
    game.lineup.forEach((player) => {
      increment(playerMap, player.personId || player.id || player.name, {
        name: player.name,
        position: player.draftPosition || player.position || '',
      });
    });
  });

  return {
    totalGames: normalizedGames.length,
    uniqueUsers: users.size,
    averageScore: normalizedGames.length ? round(totalScore / normalizedGames.length) : 0,
    perfectSeasons: normalizedGames.filter((game) => game.record === '18-0').length,
    rerollUsageRate: normalizedGames.length
      ? round((normalizedGames.filter((game) => game.usedReroll).length / normalizedGames.length) * 100)
      : 0,
    bestGame,
    topPlayers: sortByCount(playerMap),
    topCoaches: sortByCount(coachMap, 3),
    recordBreakdown: sortByCount(recordMap, 8),
    latestGames: normalizedGames.slice(0, 6),
  };
};

export const loadEighteenZeroAnalytics = async () => {
  if (!isSupabaseConfigured) return buildAnalytics([]);

  const { data, error } = await supabase
    .from('eighteen_zero_games')
    .select('id,user_id,display_name,score,record,lineup,coach,used_reroll,created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return buildAnalytics(data || []);
};
