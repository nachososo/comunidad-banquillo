import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

export const DEFAULT_STATS_SEASON = '2025-2026';
const STATS_SETTINGS_STORAGE_KEY = 'cdb:stats-capture-settings';

const getLocalStatsSettings = () => {
  if (typeof window === 'undefined') return { activeSeason: DEFAULT_STATS_SEASON };
  try {
    const stored = JSON.parse(window.localStorage.getItem(STATS_SETTINGS_STORAGE_KEY) || '{}');
    return { activeSeason: stored.activeSeason || DEFAULT_STATS_SEASON };
  } catch {
    return { activeSeason: DEFAULT_STATS_SEASON };
  }
};

const saveLocalStatsSettings = (settings) => {
  const normalized = { activeSeason: settings.activeSeason || DEFAULT_STATS_SEASON };
  if (typeof window !== 'undefined') window.localStorage.setItem(STATS_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const loadStatsCaptureSettings = async () => {
  const fallback = getLocalStatsSettings();
  if (!isSupabaseConfigured) return { ...fallback, remote: false };

  const { data, error } = await supabase
    .from('stats_settings')
    .select('active_season')
    .eq('id', 'global')
    .maybeSingle();

  if (error || !data) return { ...fallback, remote: false, error };
  const settings = saveLocalStatsSettings({ activeSeason: data.active_season });
  return { ...settings, remote: true };
};

export const saveStatsCaptureSettings = async ({ activeSeason, userId = null }) => {
  const settings = saveLocalStatsSettings({ activeSeason });
  if (!isSupabaseConfigured) return { ...settings, remote: false };

  const { data, error } = await supabase
    .from('stats_settings')
    .upsert({
      id: 'global',
      active_season: settings.activeSeason,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('active_season')
    .single();

  if (error) throw new Error(error.message);
  return { activeSeason: data.active_season, remote: true };
};

const normalizeStatsSeason = (season) => String(season || '').trim().replace('/', '-');

export const loadStatsSeasons = async (fallbackSeasons = []) => {
  const fallback = Array.from(new Set([DEFAULT_STATS_SEASON, ...fallbackSeasons].map(normalizeStatsSeason).filter(Boolean))).sort();
  if (!isSupabaseConfigured) return fallback;

  const { data, error } = await supabase
    .from('stats_seasons')
    .select('id')
    .order('id', { ascending: true });

  if (error) return fallback;
  return Array.from(new Set([...fallback, ...(data || []).map((season) => season.id)])).sort();
};

export const createStatsSeason = async ({ season, userId = null }) => {
  const normalizedSeason = normalizeStatsSeason(season);
  if (!isSupabaseConfigured) return normalizedSeason;

  const { data, error } = await supabase
    .from('stats_seasons')
    .insert({ id: normalizedSeason, created_by: userId })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
};

export const deleteStatsSeason = async (season) => {
  const normalizedSeason = normalizeStatsSeason(season);
  if (!isSupabaseConfigured) return normalizedSeason;

  const { error } = await supabase.from('stats_seasons').delete().eq('id', normalizedSeason);
  if (error) throw new Error(error.message);
  return normalizedSeason;
};

export const hasStatsCaptureAccess = async (user, isAdmin = false) => {
  if (isAdmin) return true;
  if (!isSupabaseConfigured || !user?.id) return false;

  const { data, error } = await supabase
    .from('stats_permissions')
    .select('can_capture')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo comprobar el permiso de estadísticas:', error.message);
    return false;
  }

  return data?.can_capture === true;
};

export const loadStatsPermissions = async () => {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('stats_permissions')
    .select('user_id,can_capture,notes,updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const saveStatsPermission = async ({ userId, canCapture, notes = '' }) => {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('stats_permissions')
    .upsert(
      {
        user_id: userId,
        can_capture: canCapture,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('user_id,can_capture,notes,updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const loadStatsSessions = async () => {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('stats_sessions')
    .select('id,created_by,mode,team,opponent,match_id,status,summary,payload,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const saveStatsSession = async ({ userId, mode, team, opponent, matchId = null, status = 'draft', summary, payload, events }) => {
  if (!isSupabaseConfigured || !userId) return { remote: false };

  const now = new Date().toISOString();
  const normalizedStatus = status === 'finished' ? 'captured' : status === 'published' ? 'synced' : status;
  const { data: session, error: sessionError } = await supabase
    .from('stats_sessions')
    .insert({
      created_by: userId,
      mode,
      team,
      opponent,
      match_id: matchId,
      status: normalizedStatus,
      summary,
      payload,
      created_at: now,
      updated_at: now,
    })
    .select('id,created_by,mode,team,opponent,match_id,status,summary,payload,created_at,updated_at')
    .single();

  if (sessionError) throw new Error(sessionError.message);

  const eventRows = events.map((event, index) => ({
    session_id: session.id,
    player_id: event.playerId ? Number(event.playerId) : null,
    player_name: event.playerName || null,
    action: event.action,
    value: event.value ?? 0,
    period: event.period || '1Q',
    happened_at: event.happenedAt || now,
    sort_order: index + 1,
    x: event.x ?? null,
    y: event.y ?? null,
    payload: event,
  }));

  if (eventRows.length) {
    const { error: eventsError } = await supabase.from('stats_events').insert(eventRows);
    if (eventsError) throw new Error(eventsError.message);
  }

  return { remote: true, session };
};

export const publishOfficialStatsSession = async ({ sessionId, matchId, ownScore, rivalScore, stats }) => {
  if (!isSupabaseConfigured || !sessionId || !matchId) return { remote: false };

  const { error } = await supabase.rpc('publish_official_stats_session', {
    p_session_id: sessionId,
    p_match_id: Number(matchId),
    p_our_score: Number(ownScore) || 0,
    p_rival_score: Number(rivalScore) || 0,
    p_stats: stats,
  });

  if (error) throw new Error(error.message);
  return { remote: true };
};
