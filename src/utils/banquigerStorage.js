export const BANQUIGER_PLAYERS_STORAGE_KEY = 'banquiger-admin-players-v1';
export const BANQUIGER_SETTINGS_STORAGE_KEY = 'banquiger-admin-settings-v1';
export const BANQUIGER_ROUNDS_STORAGE_KEY = 'banquiger-admin-rounds-v1';
export const BANQUIGER_POWERS_STORAGE_KEY = 'banquiger-admin-powers-v1';
export const BANQUIGER_POWER_STATE_STORAGE_KEY = 'banquiger-power-state-v1';
export const BANQUIGER_MARKET_STATE_STORAGE_KEY = 'banquiger-market-state-v1';
const BANQUIGER_ECONOMY_VERSION_KEY = 'banquiger-economy-version';
const BANQUIGER_ECONOMY_VERSION = '6';

export const defaultBanquigerSettings = {
  economyVersion: 6,
  budget: 5,
  teamSize: 7,
  currentRound: 'Jornada de prueba',
  marketStatus: 'open',
  starterNonPointMultiplier: 2,
};

export const defaultBanquigerRounds = [
  { id: 'round-1', name: 'Jornada 1', deadline: '2026-06-21T18:00', status: 'open', scored: false },
  { id: 'round-0', name: 'Jornada de prueba', deadline: '2026-06-14T18:00', status: 'closed', scored: true },
];

export const defaultBanquigerPowers = [
  {
    id: 'captain-double',
    name: 'Capitán de remontada',
    description: 'Elige un jugador propio: su valoración final se multiplica por 2.',
    type: 'positive',
    effect: 'own_double',
    rarity: 'common',
    active: true,
  },
  {
    id: 'special-marking',
    name: 'Marcaje especial',
    description: 'Elige un jugador rival: su valoración final se divide entre 2.',
    type: 'negative',
    effect: 'rival_half',
    rarity: 'common',
    active: true,
  },
  {
    id: 'surprise-clause',
    name: 'Cláusula sorpresa',
    description: 'Obliga a un rival a vender al jugador que elijas antes de la siguiente jornada.',
    type: 'negative',
    effect: 'force_sale',
    rarity: 'rare',
    active: true,
  },
  {
    id: 'sixth-man',
    name: 'Sexto hombre',
    description: 'Elige un suplente propio para que puntúe como titular durante esta jornada.',
    type: 'positive',
    effect: 'bench_as_starter',
    rarity: 'common',
    active: true,
  },
];

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
};

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const normalizeBanquigerSettings = (settings = {}) => ({
  ...defaultBanquigerSettings,
  ...settings,
  budget: settings.economyVersion === 6
    ? clampNumber(settings.budget, defaultBanquigerSettings.budget, 1, 50)
    : defaultBanquigerSettings.budget,
  economyVersion: 6,
  teamSize: Math.round(clampNumber(settings.teamSize, defaultBanquigerSettings.teamSize, 5, 12)),
  starterNonPointMultiplier: clampNumber(
    settings.starterNonPointMultiplier,
    defaultBanquigerSettings.starterNonPointMultiplier,
    1,
    4,
  ),
  marketStatus: settings.marketStatus === 'closed' ? 'closed' : 'open',
  currentRound: settings.currentRound || defaultBanquigerSettings.currentRound,
});

export const getStoredBanquigerSettings = () =>
  normalizeBanquigerSettings(readJson(BANQUIGER_SETTINGS_STORAGE_KEY, defaultBanquigerSettings));

export const saveStoredBanquigerSettings = (settings) => {
  const normalized = normalizeBanquigerSettings(settings);
  if (storageAvailable()) {
    window.localStorage.setItem(BANQUIGER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
};

export const resetStoredBanquigerSettings = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_SETTINGS_STORAGE_KEY);
  return defaultBanquigerSettings;
};

export const normalizeBanquigerPlayer = (player = {}) => ({
  ...player,
  id: String(player.id || '').trim(),
  name: String(player.name || '').trim(),
  number: Math.round(clampNumber(player.number, 0, 0, 999)),
  position: player.position || 'Alero',
  team: player.team === 'feminine' ? 'feminine' : 'masculine',
  games: Math.round(clampNumber(player.games, 0, 0, 200)),
  avgMinutes: clampNumber(player.avgMinutes, 0, 0, 60),
  avgValuation: clampNumber(player.avgValuation, 0, -25, 60),
  lastValuation: clampNumber(player.lastValuation, player.avgValuation ?? 0, -25, 60),
  price: clampNumber(player.price, 0.4, 0.4, 30),
  active: player.active !== false,
  manualPrice: player.manualPrice === true,
});

export const getStoredBanquigerPlayers = (basePlayers = [], options = {}) => {
  const currentEconomy = !storageAvailable()
    || window.localStorage.getItem(BANQUIGER_ECONOMY_VERSION_KEY) === BANQUIGER_ECONOMY_VERSION;
  const storedPlayers = readJson(BANQUIGER_PLAYERS_STORAGE_KEY, []);
  const storedById = new Map(
    (Array.isArray(storedPlayers) ? storedPlayers : [])
      .map(normalizeBanquigerPlayer)
      .filter((player) => player.id)
      .map((player) => [player.id, player]),
  );

  const merged = basePlayers.map((basePlayer) => {
    const storedPlayer = storedById.get(String(basePlayer.id));
    return normalizeBanquigerPlayer({
      ...basePlayer,
      active: true,
      ...storedPlayer,
      price: currentEconomy && storedPlayer?.manualPrice ? storedPlayer.price : basePlayer.price,
      priceTier: currentEconomy && storedPlayer?.manualPrice ? storedPlayer.priceTier : basePlayer.priceTier,
    });
  });

  const baseIds = new Set(basePlayers.map((player) => String(player.id)));
  storedById.forEach((player) => {
    if (!baseIds.has(player.id)) merged.push(currentEconomy ? player : {
      ...player,
      price: Math.max(0.4, Number((player.price > 3
        ? player.price * 5 / 65
        : player.priceTier === 'elite' ? player.price : player.price - 0.1).toFixed(1))),
    });
  });

  if (storageAvailable() && !currentEconomy) {
    window.localStorage.setItem(
      BANQUIGER_PLAYERS_STORAGE_KEY,
      JSON.stringify(merged.map(normalizeBanquigerPlayer)),
    );
    window.localStorage.setItem(BANQUIGER_ECONOMY_VERSION_KEY, BANQUIGER_ECONOMY_VERSION);
  }

  return options.includeInactive ? merged : merged.filter((player) => player.active);
};

export const saveStoredBanquigerPlayers = (players = []) => {
  const normalized = players.map(normalizeBanquigerPlayer).filter((player) => player.id && player.name);
  if (storageAvailable()) {
    window.localStorage.setItem(BANQUIGER_PLAYERS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
};

export const resetStoredBanquigerPlayers = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_PLAYERS_STORAGE_KEY);
};

const normalizeRound = (round = {}) => ({
  id: String(round.id || `round-${Date.now()}`),
  name: String(round.name || 'Nueva jornada').trim(),
  deadline: String(round.deadline || ''),
  status: round.status === 'closed' ? 'closed' : 'open',
  scored: round.scored === true,
});

export const getStoredBanquigerRounds = () => {
  const stored = readJson(BANQUIGER_ROUNDS_STORAGE_KEY, defaultBanquigerRounds);
  return (Array.isArray(stored) ? stored : defaultBanquigerRounds).map(normalizeRound);
};

export const saveStoredBanquigerRounds = (rounds = []) => {
  const normalized = rounds.map(normalizeRound).filter((round) => round.id && round.name);
  if (storageAvailable()) {
    window.localStorage.setItem(BANQUIGER_ROUNDS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
};

export const resetStoredBanquigerRounds = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_ROUNDS_STORAGE_KEY);
  return defaultBanquigerRounds;
};

const normalizePower = (power = {}) => ({
  id: String(power.id || `power-${Date.now()}`).trim(),
  name: String(power.name || 'Nuevo poder').trim(),
  description: String(power.description || '').trim(),
  type: power.type === 'negative' ? 'negative' : 'positive',
  effect: ['own_double', 'rival_half', 'force_sale', 'bench_as_starter'].includes(power.effect)
    ? power.effect
    : 'own_double',
  rarity: power.rarity === 'rare' ? 'rare' : 'common',
  active: power.active !== false,
});

export const getStoredBanquigerPowers = (options = {}) => {
  const stored = readJson(BANQUIGER_POWERS_STORAGE_KEY, defaultBanquigerPowers);
  const powers = (Array.isArray(stored) ? stored : defaultBanquigerPowers).map(normalizePower);
  return options.includeInactive ? powers : powers.filter((power) => power.active);
};

export const saveStoredBanquigerPowers = (powers = []) => {
  const normalized = powers.map(normalizePower).filter((power) => power.id && power.name);
  if (storageAvailable()) {
    window.localStorage.setItem(BANQUIGER_POWERS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
};

export const resetStoredBanquigerPowers = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_POWERS_STORAGE_KEY);
  return defaultBanquigerPowers;
};

const normalizePowerState = (state = {}) => ({
  inventory: Array.isArray(state.inventory) ? state.inventory : [],
  uses: Array.isArray(state.uses) ? state.uses : [],
});

export const getStoredBanquigerPowerState = () =>
  normalizePowerState(readJson(BANQUIGER_POWER_STATE_STORAGE_KEY, { inventory: [], uses: [] }));

export const saveStoredBanquigerPowerState = (state = {}) => {
  const normalized = normalizePowerState(state);
  if (storageAvailable()) {
    window.localStorage.setItem(BANQUIGER_POWER_STATE_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
};

export const resetStoredBanquigerPowerState = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_POWER_STATE_STORAGE_KEY);
  return { inventory: [], uses: [] };
};

export const getStoredBanquigerMarketState = () => {
  const state = readJson(BANQUIGER_MARKET_STATE_STORAGE_KEY, null);
  if (!state || typeof state !== 'object') return null;
  return {
    lastProcessedMatchId: state.lastProcessedMatchId ?? null,
    prices: state.prices && typeof state.prices === 'object' ? state.prices : {},
    previousPrices: state.previousPrices && typeof state.previousPrices === 'object' ? state.previousPrices : {},
    changes: state.changes && typeof state.changes === 'object' ? state.changes : {},
    history: Array.isArray(state.history) ? state.history : [],
  };
};

export const saveStoredBanquigerMarketState = (state) => {
  if (storageAvailable()) window.localStorage.setItem(BANQUIGER_MARKET_STATE_STORAGE_KEY, JSON.stringify(state));
  return state;
};

export const resetStoredBanquigerMarketState = () => {
  if (storageAvailable()) window.localStorage.removeItem(BANQUIGER_MARKET_STATE_STORAGE_KEY);
};
