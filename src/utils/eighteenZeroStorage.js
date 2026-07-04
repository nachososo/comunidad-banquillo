import { cdbPlayers } from '@/data/cdbPlayers.js';
import { baseCdbEvents, buildEventEffect } from '@/data/cdbEvents.js';
import { defaultCdbCoaches } from '@/data/cdbCoaches.js';

export const EIGHTEEN_ZERO_PLAYERS_STORAGE_KEY = 'cdb:eighteen-zero-players';
export const EIGHTEEN_ZERO_SKILLS_STORAGE_KEY = 'cdb:eighteen-zero-skills';
export const EIGHTEEN_ZERO_EVENTS_STORAGE_KEY = 'cdb:eighteen-zero-events';
export const EIGHTEEN_ZERO_CHEMISTRY_STORAGE_KEY = 'cdb:eighteen-zero-chemistry';
export const EIGHTEEN_ZERO_COACHES_STORAGE_KEY = 'cdb:eighteen-zero-coaches';

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.localStorage);
const isPlayerEntry = (player) => String(player?.position || '').trim().toLowerCase() !== 'entrenador';

export const baseEighteenZeroSkills = Array.from(
  new Set(cdbPlayers.flatMap((player) => (Array.isArray(player.tags) ? player.tags : []))),
).sort((first, second) => first.localeCompare(second));

export const basePlayerChemistryLinks = [
  {
    id: 'hermanos-torres',
    name: 'Los hermanos Torres',
    playerIds: ['carlos-torres', 'javier-torres'],
    description: 'Carlos y Javier se entienden de memoria.',
  },
];

const normalizePlayers = (players) => {
  if (!Array.isArray(players)) return cdbPlayers;
  return players
    .filter((player) => player && player.id && player.name && isPlayerEntry(player))
    .map((player) => {
      const { cost: legacyCost, ...playerWithoutCost } = player;
      return {
        ...playerWithoutCost,
        personId: String(player.personId || player.id),
        number: Number(player.number) || 0,
        secondaryPositions: Array.isArray(player.secondaryPositions) ? player.secondaryPositions : [],
        tags: Array.isArray(player.tags) ? player.tags : [],
        stats: {
          attack: Number(player.stats?.attack) || 0,
          defense: Number(player.stats?.defense) || 0,
          rebound: Number(player.stats?.rebound) || 0,
          playmaking: Number(player.stats?.playmaking) || 0,
          threePoint: Number(player.stats?.threePoint) || 0,
          physical: Number(player.stats?.physical) || 0,
          leadership: Number(player.stats?.leadership) || 0,
          clutch: Number(player.stats?.clutch) || 0,
        },
      };
    });
};

export const getStoredEighteenZeroPlayers = () => {
  if (!isBrowser()) return normalizePlayers(cdbPlayers);

  try {
    const stored = window.localStorage.getItem(EIGHTEEN_ZERO_PLAYERS_STORAGE_KEY);
    if (!stored) return normalizePlayers(cdbPlayers);
    const storedPlayers = normalizePlayers(JSON.parse(stored));
    const storedById = new Map(storedPlayers.map((player) => [player.id, player]));
    const basePlayers = normalizePlayers(cdbPlayers);
    const baseIds = new Set(basePlayers.map((player) => player.id));
    return [
      ...basePlayers.map((player) => storedById.get(player.id) || player),
      ...storedPlayers.filter((player) => !baseIds.has(player.id)),
    ];
  } catch {
    return normalizePlayers(cdbPlayers);
  }
};

export const saveEighteenZeroPlayers = (players) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    EIGHTEEN_ZERO_PLAYERS_STORAGE_KEY,
    JSON.stringify(normalizePlayers(players)),
  );
};

export const resetEighteenZeroPlayers = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EIGHTEEN_ZERO_PLAYERS_STORAGE_KEY);
};

const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return baseEighteenZeroSkills;
  return Array.from(
    new Set(skills.map((skill) => String(skill).trim()).filter(Boolean)),
  ).sort((first, second) => first.localeCompare(second));
};

const makeId = (value, fallback = 'item') => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `${fallback}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeEvent = (event) => ({
  id: event.id || makeId(event.name, 'evento'),
  name: event.name?.trim() || 'Evento de temporada',
  description: event.description?.trim() || 'Evento editable de liga municipal.',
  stats: Array.isArray(event.stats) && event.stats.length ? event.stats : ['leadership'],
  target: Number(event.target) || 75,
  divisor: Number(event.divisor) || 6,
  positiveResult: event.positiveResult?.trim() || 'por responder bien al contexto.',
  negativeResult: event.negativeResult?.trim() || 'porque el contexto castigó al quinteto.',
  requiredPlayerIds: Array.isArray(event.requiredPlayerIds)
    ? Array.from(new Set(event.requiredPlayerIds.filter(Boolean)))
    : [],
  requirementMode: event.requirementMode === 'any' ? 'any' : 'all',
  playerRequirementScope: event.playerRequirementScope === 'version' ? 'version' : 'person',
  chance: Math.max(
    0,
    Math.min(100, Number.isFinite(Number(event.chance)) ? Number(event.chance) : 100),
  ),
});

const normalizeEvents = (events) => {
  if (!Array.isArray(events)) return baseCdbEvents;
  return events.filter(Boolean).map(normalizeEvent);
};

const hydrateEvent = (event) => ({
  ...event,
  effect: buildEventEffect(event),
});

const normalizeChemistryLinks = (links) => {
  if (!Array.isArray(links)) return basePlayerChemistryLinks;
  return links
    .filter((link) => link && link.name && Array.isArray(link.playerIds))
    .map((link) => ({
      id: link.id || makeId(link.name, 'quimica'),
      name: link.name.trim(),
      playerIds: Array.from(new Set(link.playerIds.filter(Boolean))).slice(0, 5),
      description: link.description?.trim() || '',
    }))
    .filter((link) => link.playerIds.length >= 2)
    .map((link) => ({
      ...link,
      modifier: link.playerIds.length - 1,
    }));
};

export const getStoredEighteenZeroSkills = () => {
  if (!isBrowser()) return baseEighteenZeroSkills;

  try {
    const stored = window.localStorage.getItem(EIGHTEEN_ZERO_SKILLS_STORAGE_KEY);
    if (!stored) return baseEighteenZeroSkills;
    return normalizeSkills([...baseEighteenZeroSkills, ...normalizeSkills(JSON.parse(stored))]);
  } catch {
    return baseEighteenZeroSkills;
  }
};

export const saveEighteenZeroSkills = (skills) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    EIGHTEEN_ZERO_SKILLS_STORAGE_KEY,
    JSON.stringify(normalizeSkills(skills)),
  );
};

export const resetEighteenZeroSkills = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EIGHTEEN_ZERO_SKILLS_STORAGE_KEY);
};

export const getStoredEighteenZeroEvents = () => {
  if (!isBrowser()) return baseCdbEvents.map(hydrateEvent);

  try {
    const stored = window.localStorage.getItem(EIGHTEEN_ZERO_EVENTS_STORAGE_KEY);
    if (!stored) return baseCdbEvents.map(hydrateEvent);
    return normalizeEvents(JSON.parse(stored)).map(hydrateEvent);
  } catch {
    return baseCdbEvents.map(hydrateEvent);
  }
};

export const saveEighteenZeroEvents = (events) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    EIGHTEEN_ZERO_EVENTS_STORAGE_KEY,
    JSON.stringify(normalizeEvents(events)),
  );
};

export const resetEighteenZeroEvents = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EIGHTEEN_ZERO_EVENTS_STORAGE_KEY);
};

export const getStoredEighteenZeroChemistryLinks = () => {
  if (!isBrowser()) return basePlayerChemistryLinks;

  try {
    const stored = window.localStorage.getItem(EIGHTEEN_ZERO_CHEMISTRY_STORAGE_KEY);
    if (!stored) return basePlayerChemistryLinks;
    return normalizeChemistryLinks(JSON.parse(stored));
  } catch {
    return basePlayerChemistryLinks;
  }
};

export const saveEighteenZeroChemistryLinks = (links) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    EIGHTEEN_ZERO_CHEMISTRY_STORAGE_KEY,
    JSON.stringify(normalizeChemistryLinks(links)),
  );
};

export const resetEighteenZeroChemistryLinks = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EIGHTEEN_ZERO_CHEMISTRY_STORAGE_KEY);
};

const normalizeCoach = (coach = {}) => ({
  id: coach.id || makeId(coach.name, 'entrenador'),
  name: coach.name?.trim() || 'Entrenador',
  role: coach.role?.trim() || 'Entrenador',
  image: coach.image || '',
  event: normalizeEvent({
    ...coach.event,
    id: coach.event?.id || `coach-${coach.id || makeId(coach.name, 'entrenador')}`,
    chance: 100,
    requiredPlayerIds: [],
  }),
});

export const getStoredEighteenZeroCoaches = () => {
  if (!isBrowser()) return defaultCdbCoaches.map(normalizeCoach);
  try {
    const stored = window.localStorage.getItem(EIGHTEEN_ZERO_COACHES_STORAGE_KEY);
    if (!stored) return defaultCdbCoaches.map(normalizeCoach);
    return (Array.isArray(JSON.parse(stored)) ? JSON.parse(stored) : defaultCdbCoaches).map(normalizeCoach);
  } catch {
    return defaultCdbCoaches.map(normalizeCoach);
  }
};

export const saveEighteenZeroCoaches = (coaches = []) => {
  const normalized = coaches.map(normalizeCoach).filter((coach) => coach.id && coach.name);
  if (isBrowser()) window.localStorage.setItem(EIGHTEEN_ZERO_COACHES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const resetEighteenZeroCoaches = () => {
  if (isBrowser()) window.localStorage.removeItem(EIGHTEEN_ZERO_COACHES_STORAGE_KEY);
  return defaultCdbCoaches.map(normalizeCoach);
};
