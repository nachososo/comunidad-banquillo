import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const LOCAL_RANKING_KEY = 'cdb:eighteen-zero-ranking-v1';

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

export const submitEighteenZeroScore = async ({ user, score, record }) => {
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
    return normalizeEntry(nextEntry);
  }

  const { error } = await supabase.rpc('submit_eighteen_zero_score', { p_score: normalizedScore });
  if (error) throw new Error(error.message);
  return { bestScore: normalizedScore };
};
