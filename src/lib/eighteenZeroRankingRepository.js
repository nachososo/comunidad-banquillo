import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const LOCAL_RANKING_KEY = 'cdb:eighteen-zero-ranking-v1';
const LOCAL_HISTORY_KEY = 'cdb:eighteen-zero-history-v1';

const normalizeEntry = (entry) => ({
  userId: entry.user_id || entry.userId,
  displayName: entry.display_name || entry.displayName || 'Usuario',
  bestScore: Number(entry.best_score ?? entry.bestScore) || 0,
  lastScore: Number(entry.last_score ?? entry.lastScore) || 0,
  bestRecord: entry.best_record || entry.bestRecord || 'Temporada complicada',
  gamesPlayed: Number(entry.games_played ?? entry.gamesPlayed) || 0,
  updatedAt: entry.updated_at || entry.updatedAt || new Date().toISOString(),
});

const sortRanking = (entries) => [...entries]
  .map(normalizeEntry)
  .sort((first, second) => second.bestScore - first.bestScore || first.updatedAt.localeCompare(second.updatedAt))
  .map((entry, index) => ({ ...entry, position: index + 1 }));

const readLocalRanking = () => {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_RANKING_KEY) || '[]');
  } catch {
    return [];
  }
};

const readLocalHistory = () => {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const normalizeGame = (entry) => ({
  id: entry.id || entry.created_at || entry.createdAt,
  userId: entry.user_id || entry.userId,
  displayName: entry.display_name || entry.displayName || 'Usuario',
  score: Number(entry.score) || 0,
  record: entry.record || 'Temporada complicada',
  lineup: entry.lineup || [],
  coach: entry.coach || null,
  events: entry.events || [],
  scores: entry.scores || {},
  mvp: entry.mvp || null,
  keyPlayer: entry.key_player || entry.keyPlayer || null,
  usedReroll: entry.used_reroll ?? entry.usedReroll ?? false,
  randomFactor: Number(entry.random_factor ?? entry.randomFactor) || 0,
  createdAt: entry.created_at || entry.createdAt || new Date().toISOString(),
});

const round = (value) => Math.round(value * 10) / 10;

const buildUserSummary = (games) => {
  const normalizedGames = games.map(normalizeGame);
  const totalGames = normalizedGames.length;
  const totalScore = normalizedGames.reduce((total, game) => total + game.score, 0);
  const bestGame = [...normalizedGames].sort(
    (first, second) => second.score - first.score || new Date(first.createdAt) - new Date(second.createdAt),
  )[0] || null;
  const playerCounts = new Map();

  normalizedGames.forEach((game) => {
    game.lineup.forEach((player) => {
      const key = player.personId || player.id || player.name;
      if (!key) return;
      const current = playerCounts.get(key) || { id: key, name: player.name, count: 0 };
      playerCounts.set(key, { ...current, name: player.name, count: current.count + 1 });
    });
  });

  return {
    totalGames,
    averageScore: totalGames ? round(totalScore / totalGames) : 0,
    bestGame,
    perfectSeasons: normalizedGames.filter((game) => game.record === '18-0').length,
    rerollsUsed: normalizedGames.filter((game) => game.usedReroll).length,
    favoritePlayer: Array.from(playerCounts.values()).sort(
      (first, second) => second.count - first.count || first.name.localeCompare(second.name),
    )[0] || null,
    latestGames: normalizedGames.slice(0, 3),
  };
};

const normalizePlayerSnapshot = (player) => ({
  id: player.id,
  personId: player.personId || player.id,
  name: player.name,
  season: player.season,
  position: player.position,
  draftPosition: player.draftPosition,
  tags: player.tags || [],
});

const normalizeEventSnapshot = (event) => ({
  id: event.id,
  name: event.name,
  modifier: event.modifier,
  result: event.result,
  affectedSectionLabels: event.affectedSectionLabels || [],
  guaranteedByCoach: event.guaranteedByCoach === true,
});

const buildGamePayload = ({ user, score, record, game }) => {
  const normalizedScore = Math.round(Number(score) * 10) / 10;

  return {
    user_id: user.id,
    display_name: user.name || user.email || 'Usuario',
    score: normalizedScore,
    record,
    lineup: (game?.team || []).map(normalizePlayerSnapshot),
    coach: game?.coach ? { id: game.coach.id, name: game.coach.name } : null,
    events: (game?.result?.eventResults || []).map(normalizeEventSnapshot),
    scores: game?.result?.scores || {},
    mvp: game?.result?.mvp ? normalizePlayerSnapshot(game.result.mvp) : null,
    key_player: game?.result?.keyPlayer ? normalizePlayerSnapshot(game.result.keyPlayer) : null,
    used_reroll: game?.usedReroll === true,
    random_factor: Number(game?.result?.randomFactor) || 0,
  };
};

export const loadEighteenZeroRanking = async ({ isAuthenticated }) => {
  if (!isAuthenticated) return [];
  if (!isSupabaseConfigured) return sortRanking(readLocalRanking());

  const { data, error } = await supabase
    .from('eighteen_zero_scores')
    .select('user_id,display_name,best_score,last_score,best_record,games_played,updated_at')
    .order('best_score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return sortRanking(data || []);
};

export const loadEighteenZeroGameHistory = async ({ isAuthenticated, userId, limit = 5 }) => {
  if (!isAuthenticated) return [];
  if (!isSupabaseConfigured) {
    return readLocalHistory()
      .filter((entry) => (entry.user_id || entry.userId) === userId)
      .map(normalizeGame)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from('eighteen_zero_games')
    .select('id,user_id,display_name,score,record,lineup,coach,events,scores,mvp,key_player,used_reroll,random_factor,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeGame);
};

export const loadEighteenZeroUserSummary = async ({ isAuthenticated, userId }) => {
  const games = await loadEighteenZeroGameHistory({ isAuthenticated, userId, limit: 100 });
  return buildUserSummary(games);
};

export const submitEighteenZeroScore = async ({ user, score, record, game }) => {
  const normalizedScore = Math.round(Number(score) * 10) / 10;
  if (!user?.id || !Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 100) {
    throw new Error('La puntuación del 18-0 no es válida.');
  }

  if (!isSupabaseConfigured) {
    const entries = readLocalRanking();
    const current = entries.find((entry) => (entry.user_id || entry.userId) === user.id);
    const nextEntry = {
      userId: user.id,
      displayName: user.name,
      bestScore: Math.max(normalizedScore, Number(current?.bestScore) || 0),
      lastScore: normalizedScore,
      bestRecord: !current || normalizedScore > Number(current.bestScore) ? record : current.bestRecord,
      gamesPlayed: (Number(current?.gamesPlayed) || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    const nextEntries = current
      ? entries.map((entry) => ((entry.user_id || entry.userId) === user.id ? nextEntry : entry))
      : [...entries, nextEntry];
    window.localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(nextEntries));

    if (game) {
      const localHistory = readLocalHistory();
      const gameEntry = normalizeGame({
        ...buildGamePayload({ user, score: normalizedScore, record, game }),
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
      });
      window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify([gameEntry, ...localHistory].slice(0, 50)));
    }

    return normalizeEntry(nextEntry);
  }

  const { error } = await supabase.rpc('submit_eighteen_zero_score', { p_score: normalizedScore });
  if (error) throw new Error(error.message);

  if (game) {
    const { error: gameError } = await supabase
      .from('eighteen_zero_games')
      .insert(buildGamePayload({ user, score: normalizedScore, record, game }));
    if (gameError) throw new Error(gameError.message);
  }

  return { bestScore: normalizedScore };
};
