import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const ANALYTICS_SESSION_KEY = 'cdb:analytics-session-id';
const MAX_ANALYTICS_ROWS = 5000;

const isBrowser = () => typeof window !== 'undefined';

const createFallbackUuid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => {
  const randomByte = window.crypto?.getRandomValues?.(new Uint8Array(1))[0] || Math.floor(Math.random() * 256);
  return (Number(char) ^ (randomByte & (15 >> (Number(char) / 4)))).toString(16);
});

const getSessionId = () => {
  if (!isBrowser()) return null;
  const stored = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
  if (stored) return stored;

  const nextSessionId = window.crypto?.randomUUID?.() || createFallbackUuid();
  window.localStorage.setItem(ANALYTICS_SESSION_KEY, nextSessionId);
  return nextSessionId;
};

const getDeviceType = () => {
  if (!isBrowser()) return 'unknown';
  const width = window.innerWidth || window.screen?.width || 0;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const shouldSkipTracking = () => {
  if (!isBrowser()) return true;
  const doNotTrack = window.navigator.doNotTrack || window.doNotTrack || window.navigator.msDoNotTrack;
  return doNotTrack === '1' || doNotTrack === 'yes';
};

export const trackPageView = async ({ path, title }) => {
  if (!isSupabaseConfigured || shouldSkipTracking()) return { tracked: false };

  const payload = {
    p_session_id: getSessionId(),
    p_path: path || window.location.pathname,
    p_title: title || document.title || '',
    p_referrer: document.referrer || '',
    p_language: window.navigator.language || '',
    p_screen_width: Number(window.innerWidth || window.screen?.width || 0),
    p_device: getDeviceType(),
  };

  const { error } = await supabase.rpc('track_web_visit', payload);
  return { tracked: !error, error };
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getReferrerLabel = (referrer) => {
  if (!referrer) return 'Directo';
  try {
    const url = new URL(referrer);
    if (isBrowser() && url.hostname === window.location.hostname) return 'Navegación interna';
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Otro';
  }
};

const formatPathTitle = (row) => {
  if (row.title) return row.title.replace(' - La Comunidad del Banquillo', '').trim();
  return row.path || '/';
};

const increment = (map, key, extra = {}) => {
  const safeKey = key || 'Sin dato';
  const current = map.get(safeKey) || { key: safeKey, count: 0, ...extra };
  map.set(safeKey, { ...current, ...extra, count: current.count + 1 });
};

export const summarizeWebAnalytics = (rows = [], days = 30) => {
  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const pageMap = new Map();
  const referrerMap = new Map();
  const deviceMap = new Map();
  const dayMap = new Map();
  const sessions = new Set();

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    dayMap.set(toDateKey(day), { key: toDateKey(day), count: 0 });
  }

  rows.forEach((row) => {
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    const dateKey = toDateKey(createdAt);

    if (row.session_id) sessions.add(row.session_id);
    increment(pageMap, row.path || '/', { title: formatPathTitle(row), path: row.path || '/' });
    increment(referrerMap, getReferrerLabel(row.referrer));
    increment(deviceMap, row.device || 'unknown');

    if (!dayMap.has(dateKey)) dayMap.set(dateKey, { key: dateKey, count: 0 });
    dayMap.set(dateKey, { ...dayMap.get(dateKey), count: dayMap.get(dateKey).count + 1 });
  });

  const todayVisits = rows.filter((row) => row.created_at?.startsWith(todayKey)).length;
  const yesterdayVisits = rows.filter((row) => row.created_at?.startsWith(yesterdayKey)).length;

  return {
    totalVisits: rows.length,
    uniqueSessions: sessions.size,
    todayVisits,
    yesterdayVisits,
    topPages: Array.from(pageMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
    topReferrers: Array.from(referrerMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
    devices: Array.from(deviceMap.values()).sort((a, b) => b.count - a.count),
    visitsByDay: Array.from(dayMap.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-days),
    recentVisits: rows.slice(0, 20),
  };
};

export const loadWebAnalytics = async ({ days = 30 } = {}) => {
  if (!isSupabaseConfigured) {
    return {
      rows: [],
      summary: summarizeWebAnalytics([], days),
      remote: false,
    };
  }

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('web_analytics_events')
    .select('session_id,path,title,referrer,device,language,screen_width,created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_ANALYTICS_ROWS);

  if (error) throw error;

  const rows = data || [];
  return {
    rows,
    summary: summarizeWebAnalytics(rows, days),
    remote: true,
  };
};
