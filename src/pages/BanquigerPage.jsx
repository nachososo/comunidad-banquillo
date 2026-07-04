import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  BarChart3,
  CalendarClock,
  Coins,
  Eye,
  ListOrdered,
  LogIn,
  RotateCcw,
  Save,
  Shirt,
  Store,
  Trophy,
  UsersRound,
  Zap,
  X,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { allPlayers, matches, playerAdvancedStats, playerGameStats } from '@/data/data.js';
import { getRebounds, getValuation, parseMadeAttempt } from '@/utils/statCalculations.js';
import { applyBanquigerPricing } from '@/utils/banquigerPricing.js';
import {
  getStoredBanquigerPlayers,
  getStoredBanquigerMarketState,
  getStoredBanquigerPowers,
  getStoredBanquigerPowerState,
  getStoredBanquigerSettings,
  getStoredBanquigerRounds,
  saveStoredBanquigerSettings,
  saveStoredBanquigerPlayers,
  saveStoredBanquigerPowers,
  saveStoredBanquigerPowerState,
  saveStoredBanquigerMarketState,
} from '@/utils/banquigerStorage.js';
import {
  GAME_DATA_KEYS,
  loadBanquigerBundle,
  loadBanquigerTeam,
  loadUserGameDocument,
  saveBanquigerTeam,
  saveUserGameDocument,
} from '@/lib/gameDataRepository.js';

const STORAGE_KEY = 'banquiger-team-v2';
const BUDGET = 5;
const TEAM_SIZE = 7;
const STARTER_POSITIONS = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const JERSEY_NAMES_BY_NUMBER = {
  0: 'TRECE A.M.',
  1: 'ALEN',
  5: 'DIEGO',
  7: 'ALBERTO',
  8: 'GIMLI',
  9: 'MARKEL',
  11: 'RODRI',
  14: 'TORRES',
  15: 'MACHIN',
  17: 'SARUUS',
  18: 'UTRILLA',
  21: 'GONZA',
  27: 'MARIEX',
  33: 'UNAI',
  35: 'AVE CAESAR',
  41: 'MEVIL',
  71: 'IKER',
  77: 'TORRES',
};
const JERSEY_IMAGES_BY_NUMBER = {
  0: '/img/banquiger-jerseys/TRECE_AM_0_transparente.png',
  1: '/img/banquiger-jerseys/ALEN_1_transparente.png',
  5: '/img/banquiger-jerseys/diego_5_transparente.png',
  7: '/img/banquiger-jerseys/ALBERTO_7_transparente.png',
  8: '/img/banquiger-jerseys/GIMLI_8_transparente.png',
  9: '/img/banquiger-jerseys/MARKEL_9_transparente.png',
  11: '/img/banquiger-jerseys/RODRI_11transparente.png',
  14: '/img/banquiger-jerseys/torres_14_transparente.png',
  15: '/img/banquiger-jerseys/MACHIN_15_transparente.png',
  17: '/img/banquiger-jerseys/SARUUS_17_transparente.png',
  18: '/img/banquiger-jerseys/utrilla_18_transparente.png',
  21: '/img/banquiger-jerseys/GONZA_21_transparente.png',
  27: '/img/banquiger-jerseys/MARIEX_27transparente.png',
  33: '/img/banquiger-jerseys/UNAI_33_transparente.png',
  35: '/img/banquiger-jerseys/AVE_CAESAR_35transparente.png',
  41: '/img/banquiger-jerseys/MEVIL_41_transparente.png',
  71: '/img/banquiger-jerseys/IKER_71_transparente.png',
  77: '/img/banquiger-jerseys/TORRES_77_transparente.png',
};
const JERSEY_ASSET_VERSION = 'v13';
const JERSEY_IMAGE_SCALE_BY_NUMBER = {
  17: 1.3,
  41: 1.3,
};
const POSITION_LABELS = {
  Base: 'B',
  Escolta: 'E',
  Alero: 'A',
  'Ala-Pívot': 'AP',
  Pívot: 'P',
};

const formatMoney = (value) => `${value.toFixed(1)}M`;

const parseMinutes = (value) => {
  if (!value || value === '-') return 0;

  const [minutes, seconds] = String(value).split(':').map(Number);
  return (Number.isFinite(minutes) ? minutes : 0) + (Number.isFinite(seconds) ? seconds / 60 : 0);
};

const getShortName = (name) => {
  const [firstName, lastName] = name.split(' ');
  return lastName ? `${firstName} ${lastName}` : firstName;
};

const getJerseyName = (player) =>
  JERSEY_NAMES_BY_NUMBER[player.number] ?? player.name.split(' ').at(-1)?.toUpperCase() ?? player.name.toUpperCase();

const getJerseyImage = (player) => {
  const imagePath = JERSEY_IMAGES_BY_NUMBER[player.number];
  return imagePath ? `${imagePath}?${JERSEY_ASSET_VERSION}` : null;
};

const getBaseValuation = (gameStat, advancedStat) => {
  if (!gameStat && !advancedStat) return null;

  return getValuation(advancedStat, gameStat?.points ?? advancedStat?.points ?? 0) ?? gameStat?.points ?? 0;
};

const getFantasyValuation = (gameStat, advancedStat, starter = false, starterMultiplier = 2) => {
  const points = gameStat?.points ?? advancedStat?.points ?? 0;

  if (!advancedStat) return points;

  const fg = parseMadeAttempt(advancedStat.fg);
  const ft = parseMadeAttempt(advancedStat.ft);
  const missedFieldGoals = fg.attempted - fg.made;
  const missedFreeThrows = ft.attempted - ft.made;
  const nonPointValuation =
    getRebounds(advancedStat) +
    (advancedStat.assists || 0) +
    (advancedStat.steals || 0) +
    (advancedStat.blocks || 0) -
    missedFieldGoals -
    missedFreeThrows -
    (advancedStat.turnovers || 0);

  return points + nonPointValuation * (starter ? starterMultiplier : 1);
};

const buildLineup = (selectedPlayers) => {
  const startersByPosition = STARTER_POSITIONS.reduce((lineup, position) => {
    lineup[position] = null;
    return lineup;
  }, {});
  const benchPlayers = [];

  selectedPlayers.forEach((player) => {
    if (STARTER_POSITIONS.includes(player.position) && !startersByPosition[player.position]) {
      startersByPosition[player.position] = player;
      return;
    }

    benchPlayers.push(player);
  });

  return {
    startersByPosition,
    starterPlayers: STARTER_POSITIONS.map((position) => startersByPosition[position]).filter(Boolean),
    benchPlayers,
  };
};

export const buildPlayerMarket = () => {
  const advancedByGame = new Map(playerAdvancedStats.map((stat) => [`${stat.matchId}-${stat.playerId}`, stat]));
  const gameStatsByGame = new Map(playerGameStats.map((stat) => [`${stat.matchId}-${stat.playerId}`, stat]));
  const publishedMatches = matches
    .filter((match) => match.team === 'masculine' && match.season === '2025-2026' && match.result)
    .sort((first, second) => String(first.date).localeCompare(String(second.date)));

  const players = allPlayers.map((player) => {
    const playerGames = playerGameStats.filter((stat) => stat.playerId === player.id);
    const valuations = playerGames.map((gameStat) =>
      getBaseValuation(gameStat, advancedByGame.get(`${gameStat.matchId}-${player.id}`)),
    );
    const validValuations = valuations.filter((value) => value !== null);
    const avgValuation = validValuations.length
      ? validValuations.reduce((total, value) => total + value, 0) / validValuations.length
      : 0;
    const avgMinutes = playerGames.length
      ? playerGames.reduce((total, stat) => total + parseMinutes(stat.minutes), 0) / playerGames.length
      : 0;
    return {
      ...player,
      games: playerGames.length,
      avgMinutes,
      avgValuation,
    };
  });

  const pricedPlayers = applyBanquigerPricing(players);
  let marketState = getStoredBanquigerMarketState();

  const processMatch = (state, match) => {
    const prices = { ...state.prices };
    const previousPrices = {};
    const changes = {};
    pricedPlayers.forEach((player) => {
      const id = String(player.id);
      const previousPrice = Number(prices[id] ?? player.price);
      const gameStat = gameStatsByGame.get(`${match.id}-${player.id}`);
      const advancedStat = advancedByGame.get(`${match.id}-${player.id}`);
      const valuation = gameStat ? getBaseValuation(gameStat, advancedStat) : 0;
      const difference = valuation - player.avgValuation;
      const change = !gameStat ? -0.1 : difference >= 2 ? 0.1 : difference <= -2 ? -0.1 : 0;
      const nextPrice = Math.max(0.4, Number((previousPrice + change).toFixed(1)));
      previousPrices[id] = previousPrice;
      prices[id] = nextPrice;
      changes[id] = Number((nextPrice - previousPrice).toFixed(1));
    });
    return {
      lastProcessedMatchId: match.id,
      prices,
      previousPrices,
      changes,
      history: [...state.history, { matchId: match.id, date: match.date, prices, changes }].slice(-40),
    };
  };

  if (!marketState) {
    marketState = { lastProcessedMatchId: null, prices: {}, previousPrices: {}, changes: {}, history: [] };
    const latestMatch = publishedMatches.at(-1);
    if (latestMatch) marketState = processMatch(marketState, latestMatch);
    saveStoredBanquigerMarketState(marketState);
  } else {
    pricedPlayers.forEach((player) => {
      const id = String(player.id);
      if (marketState.prices[id] === undefined) marketState.prices[id] = player.price;
    });
    const lastIndex = publishedMatches.findIndex((match) => match.id === marketState.lastProcessedMatchId);
    const unprocessedMatches = lastIndex >= 0
      ? publishedMatches.slice(lastIndex + 1)
      : publishedMatches.slice(-1);
    unprocessedMatches.forEach((match) => {
      marketState = processMatch(marketState, match);
    });
    if (unprocessedMatches.length) saveStoredBanquigerMarketState(marketState);
  }

  return pricedPlayers.map((player) => {
    const id = String(player.id);
    return {
      ...player,
      price: Number(marketState.prices[id] ?? player.price),
      previousPrice: Number(marketState.previousPrices[id] ?? marketState.prices[id] ?? player.price),
      lastPriceChange: Number(marketState.changes[id] ?? 0),
      lastMatchId: marketState.lastProcessedMatchId,
    };
  });
};

const getMatchPlayerRows = (matchId, marketPlayers) => {
  const advancedByPlayer = new Map(
    playerAdvancedStats.filter((stat) => stat.matchId === matchId).map((stat) => [stat.playerId, stat]),
  );
  const gameByPlayer = new Map(
    playerGameStats.filter((stat) => stat.matchId === matchId).map((stat) => [stat.playerId, stat]),
  );

  return marketPlayers.map((player) => {
    const numericPlayerId = Number(player.id);
    const gameStat = gameByPlayer.get(numericPlayerId);
    const advancedStat = advancedByPlayer.get(numericPlayerId);
    const played = Boolean(gameStat);
    const valuation = played ? getBaseValuation(gameStat, advancedStat) : 0;

    return {
      player,
      gameStat,
      advancedStat,
      played,
      minutes: gameStat?.minutes ?? '-',
      points: gameStat?.points ?? advancedStat?.points ?? 0,
      valuation,
      price: player.previousPrice ?? player.price,
      nextPrice: player.price,
      priceChange: player.lastPriceChange ?? 0,
    };
  });
};

const rules = [
  {
    icon: Coins,
    title: 'Presupuesto inicial',
    text: `Cada manager empieza con ${formatMoney(BUDGET)} para fichar su plantilla.`,
  },
  {
    icon: UsersRound,
    title: 'Equipo de 7',
    text: 'El equipo se compone de 5 titulares por posición y 2 suplentes libres.',
  },
  {
    icon: BarChart3,
    title: 'Puntuación semanal',
    text: 'Los titulares duplican la valoración de todo lo que no sean puntos.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Mercado',
    text: 'Tras cada jornada podrás vender, fichar y ajustar el equipo al presupuesto.',
  },
];

const dashboardMenu = [
  { id: 'team', label: 'Tu equipo', icon: Shirt },
  { id: 'market', label: 'Mercado', icon: Store },
  { id: 'powers', label: 'Poderes', icon: Zap },
  { id: 'ranking', label: 'Clasificación general', icon: ListOrdered },
];

const JerseyVisual = ({ player, starter = false, size = 'md' }) => {
  const compact = size === 'sm';
  const market = size === 'market';
  const dimensions = compact ? 'h-[96px] w-[72px]' : market ? 'h-[112px] w-[84px]' : 'h-[128px] w-[94px]';
  const nameClass = compact ? 'top-[16px] text-[6px]' : 'top-[25px] text-[9px]';
  const numberClass = compact ? 'top-[28px] text-2xl' : 'top-[42px] text-5xl';
  const badgeClass = compact ? 'bottom-[6px] text-[6px]' : 'bottom-[12px] text-[8px]';
  const imageSrc = getJerseyImage(player);
  const imageScale = JERSEY_IMAGE_SCALE_BY_NUMBER[player.number] ?? 1;

  return (
    <div className={`relative shrink-0 ${dimensions} drop-shadow-[0_10px_12px_rgba(0,0,0,0.45)]`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`Camiseta de ${player.name}`}
          className="h-full w-full object-contain"
          style={{ transform: `scale(${imageScale})` }}
          draggable="false"
        />
      ) : (
        <div
          className="absolute inset-0 overflow-hidden border border-[#b2893f]/45 bg-gradient-to-b from-white via-[#fbfaf6] to-[#ebe5d8]"
          style={{
            clipPath:
              'polygon(18% 0, 36% 7%, 64% 7%, 82% 0, 100% 18%, 88% 30%, 88% 100%, 12% 100%, 12% 30%, 0 18%)',
          }}
        >
          <div className="absolute left-1/2 top-0 h-[15%] w-[46%] -translate-x-1/2 rounded-b-full bg-[#b2893f]" />
          <div className="absolute left-[8%] top-[9%] h-[24%] w-[6%] rotate-[-17deg] rounded-full bg-[#b2893f]" />
          <div className="absolute right-[8%] top-[9%] h-[24%] w-[6%] rotate-[17deg] rounded-full bg-[#b2893f]" />
          <div className="absolute inset-x-[12%] bottom-0 h-[8%] bg-[#b2893f]" />
          <div className="absolute -right-[18%] bottom-[9%] h-[46%] w-[48%] rounded-full border-[10px] border-gray-200/55" />
          <p
            className={`absolute left-[18%] right-[18%] ${nameClass} truncate text-center font-black uppercase tracking-[0.08em] text-black`}
          >
            {getJerseyName(player)}
          </p>
          <p
            className={`absolute left-[14%] right-[14%] ${numberClass} text-center font-black leading-none text-black [-webkit-text-stroke:1px_#b2893f]`}
          >
            {player.number}
          </p>
          <p
            className={`absolute left-1/2 ${badgeClass} -translate-x-1/2 whitespace-nowrap text-center font-black uppercase leading-none text-black`}
          >
            CDB
          </p>
        </div>
      )}
      {starter && (
        <span className="absolute -right-1 -top-1 rounded bg-[hsl(43_65%_52%)] px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow">
          x2
        </span>
      )}
    </div>
  );
};

const PlayerToken = ({ player, row, compact = false, starter = false, slotLabel = 'Libre' }) => {
  if (!player) {
    return (
      <div className="flex min-h-[132px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/25 px-2 py-3 text-center">
        <Shirt size={22} className="text-white/25" />
        <span className="mt-2 text-[10px] font-black uppercase text-gray-500">{slotLabel}</span>
      </div>
    );
  }

  const valuation = row?.played ? getFantasyValuation(row.gameStat, row.advancedStat, starter) : 0;

  return (
    <div className="relative flex min-h-[132px] flex-col items-center justify-between rounded-lg border border-[hsl(43_65%_52%_/_0.32)] bg-gradient-to-b from-[#17120a] to-[#050505] px-2 py-2 text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <JerseyVisual player={player} starter={starter} size={compact ? 'sm' : 'md'} />
        <p
          className={`${compact ? 'text-[11px]' : 'text-xs'} mt-1 max-w-full truncate text-center font-black leading-tight text-white`}
        >
          {getShortName(player.name)}
        </p>
        <p className="mt-0.5 max-w-full truncate text-center text-[10px] font-bold uppercase text-gray-500">
          {player.position}
        </p>
      </div>
      <div className="mt-2 grid w-full grid-cols-2 gap-1 text-[10px] font-black">
        <span className="rounded bg-black/45 px-1 py-1 text-[hsl(43_65%_52%)]">{formatMoney(player.price)}</span>
        <span className="rounded bg-black/45 px-1 py-1 text-white">VAL {valuation.toFixed(1)}</span>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-3 text-center">
    <Icon className="mx-auto text-[hsl(43_65%_52%)]" size={18} />
    <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">{label}</p>
    <p className="text-lg font-black text-white">{value}</p>
  </div>
);

const BanquigerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const isDashboard = location.pathname.includes('/panel');
  const teamStorageKey = `${STORAGE_KEY}:${user?.id || 'guest'}`;
  const [settings, setSettings] = useState(() => getStoredBanquigerSettings());
  const [marketPlayers, setMarketPlayers] = useState(() => getStoredBanquigerPlayers(buildPlayerMarket()));
  const budget = settings.budget;
  const teamSize = settings.teamSize;
  const seasonMatches = useMemo(
    () => matches
      .filter((match) => match.team === 'masculine' && match.season === '2025-2026' && match.result)
      .sort((first, second) => String(first.date).localeCompare(String(second.date))),
    [],
  );
  const latestPublishedMatch = seasonMatches.at(-1) || null;
  const [managerName, setManagerName] = useState('');
  const [teamName, setTeamName] = useState('Mi Banquiger');
  const [selectedIds, setSelectedIds] = useState([]);
  const [positionFilter, setPositionFilter] = useState('all');
  const [priceSort, setPriceSort] = useState('all');
  const [valuationSort, setValuationSort] = useState('all');
  const [activeSection, setActiveSection] = useState('team');
  const [viewedRankingTeam, setViewedRankingTeam] = useState(null);
  const [saved, setSaved] = useState(false);
  const [powers, setPowers] = useState(() => getStoredBanquigerPowers());
  const [powerState, setPowerState] = useState(() => getStoredBanquigerPowerState());
  const [powerTargetTeamId, setPowerTargetTeamId] = useState('');
  const [powerTargetPlayerId, setPowerTargetPlayerId] = useState('');
  const [powerNotice, setPowerNotice] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let active = true;
    const fallbacks = {
      settings: getStoredBanquigerSettings(),
      players: getStoredBanquigerPlayers(buildPlayerMarket(), { includeInactive: true }),
      rounds: getStoredBanquigerRounds(),
      powers: getStoredBanquigerPowers({ includeInactive: true }),
      powerState: getStoredBanquigerPowerState(),
      marketState: getStoredBanquigerMarketState(),
    };
    Promise.all([
      loadBanquigerBundle(fallbacks),
      loadUserGameDocument(GAME_DATA_KEYS.banquigerPowerState, fallbacks.powerState),
    ]).then(([bundle, userPowerState]) => {
      if (!active) return;
      setSettings(saveStoredBanquigerSettings(bundle.settings));
      saveStoredBanquigerPlayers(bundle.players);
      setPowers(saveStoredBanquigerPowers(bundle.powers));
      setPowerState(saveStoredBanquigerPowerState(userPowerState.data));
      if (bundle.marketState) saveStoredBanquigerMarketState(bundle.marketState);
      setMarketPlayers(getStoredBanquigerPlayers(buildPlayerMarket()));
    });
    return () => { active = false; };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const savedTeam = window.localStorage.getItem(teamStorageKey) || window.localStorage.getItem(STORAGE_KEY);
    if (savedTeam) {
      try {
        const parsed = JSON.parse(savedTeam);
        setManagerName(user.name || parsed.managerName || 'Manager');
        setTeamName(parsed.teamName || 'Mi Banquiger');
        setSelectedIds(Array.isArray(parsed.selectedIds) ? parsed.selectedIds.map(String) : []);
      } catch {
        window.localStorage.removeItem(teamStorageKey);
      }
    }
    loadBanquigerTeam(user.id).then((team) => {
      if (!team) return;
      setManagerName(team.manager_name || user.name || 'Manager');
      setTeamName(team.name || 'Mi Banquiger');
      setSelectedIds(Array.isArray(team.selected_ids) ? team.selected_ids.map(String) : []);
    });
  }, [isAuthenticated, seasonMatches, teamStorageKey, user]);

  useEffect(() => {
    if (user?.name) setManagerName(user.name);
  }, [user]);

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => marketPlayers.find((player) => player.id === id)).filter(Boolean),
    [marketPlayers, selectedIds],
  );
  const matchRows = useMemo(
    () => getMatchPlayerRows(latestPublishedMatch?.id, marketPlayers),
    [latestPublishedMatch?.id, marketPlayers],
  );
  const rowsByPlayer = useMemo(() => new Map(matchRows.map((row) => [row.player.id, row])), [matchRows]);
  const { startersByPosition, starterPlayers, benchPlayers } = useMemo(
    () => buildLineup(selectedPlayers),
    [selectedPlayers],
  );
  const selectedCost = selectedPlayers.reduce((total, player) => total + player.price, 0);
  const remainingBudget = budget - selectedCost;
  const baseSelectedScore = selectedPlayers.reduce((total, player) => {
    const row = rowsByPlayer.get(player.id);
    if (!row?.played) return total;

    const starter = starterPlayers.some((starterPlayer) => starterPlayer.id === player.id);
    return total + getFantasyValuation(
      row.gameStat,
      row.advancedStat,
      starter,
      settings.starterNonPointMultiplier,
    );
  }, 0);
  const currentPowerUses = powerState.uses.filter((use) => use.round === settings.currentRound);
  const ownPowerBonus = currentPowerUses
    .filter((use) => use.targetTeamId === 'local-team')
    .reduce((total, use) => {
      const player = selectedPlayers.find((candidate) => candidate.id === use.targetPlayerId);
      const row = rowsByPlayer.get(player?.id);
      if (!player || !row?.played) return total;
      const isStarter = starterPlayers.some((starter) => starter.id === player.id);
      if (use.effect === 'own_double') {
        return total + getFantasyValuation(row.gameStat, row.advancedStat, isStarter, settings.starterNonPointMultiplier);
      }
      if (use.effect === 'bench_as_starter' && !isStarter) {
        return total
          + getFantasyValuation(row.gameStat, row.advancedStat, true, settings.starterNonPointMultiplier)
          - getFantasyValuation(row.gameStat, row.advancedStat, false, settings.starterNonPointMultiplier);
      }
      return total;
    }, 0);
  const selectedScore = baseSelectedScore + ownPowerBonus;
  const selectedPlayed = selectedPlayers.filter((player) => rowsByPlayer.get(player.id)?.played).length;
  const sortedMarket = [...marketPlayers]
    .filter((player) => positionFilter === 'all' || player.position === positionFilter)
    .sort((first, second) => {
      if (priceSort === 'desc') return second.price - first.price || second.avgValuation - first.avgValuation;
      if (priceSort === 'asc') return first.price - second.price || second.avgValuation - first.avgValuation;
      if (valuationSort === 'desc') return second.avgValuation - first.avgValuation;
      if (valuationSort === 'asc') return first.avgValuation - second.avgValuation;
      if (positionFilter === 'all') {
        const positionOrder = STARTER_POSITIONS.indexOf(first.position) - STARTER_POSITIONS.indexOf(second.position);
        if (positionOrder !== 0) return positionOrder;
      }
      return second.avgValuation - first.avgValuation;
    });
  const missingStarterPositions = STARTER_POSITIONS.filter((position) => !startersByPosition[position]);
  const startersComplete = missingStarterPositions.length === 0;
  const canSave = selectedIds.length === teamSize && startersComplete && remainingBudget >= 0;
  const baseLeaderboard = [
    {
      id: 'local-team',
      manager: managerName || 'Manager invitado',
      team: teamName || 'Mi Banquiger',
      points: selectedScore,
      selectedIds,
      current: true,
    },
    { id: 'demo-1', manager: 'Nacho', team: 'Pizarra y Triple', points: 42.5, selectedIds: [114, 104, 110, 107, 108, 102, 117] },
    { id: 'demo-2', manager: 'Briseida', team: 'Social Basket Club', points: 38.8, selectedIds: [101, 106, 103, 112, 109, 113, 115] },
    { id: 'demo-3', manager: 'Irene', team: 'Delegación Fantasy', points: 35.2, selectedIds: [116, 104, 111, 107, 108, 105, 117] },
  ];
  const leaderboard = baseLeaderboard.map((entry) => {
    const teamUses = currentPowerUses.filter((use) => use.targetTeamId === entry.id);
    const forcedPlayerIds = new Set(teamUses.filter((use) => use.effect === 'force_sale').map((use) => use.targetPlayerId));
    const adjustedIds = entry.selectedIds.filter((id) => !forcedPlayerIds.has(String(id)));
    const penalty = teamUses
      .filter((use) => use.effect === 'rival_half')
      .reduce((total, use) => {
        const row = rowsByPlayer.get(String(use.targetPlayerId));
        if (!row?.played) return total;
        return total + getFantasyValuation(row.gameStat, row.advancedStat, false) / 2;
      }, 0);
    return { ...entry, selectedIds: adjustedIds, points: Math.max(0, entry.points - penalty) };
  }).sort((a, b) => b.points - a.points);

  useEffect(() => {
    if (!isAuthenticated) return;
    const alreadyAssigned = powerState.inventory.some((item) => item.round === settings.currentRound);
    const alreadyUsed = powerState.uses.some((item) => item.round === settings.currentRound && item.sourceTeamId === 'local-team');
    if (!powers.length || alreadyAssigned || alreadyUsed) return;
    const position = leaderboard.findIndex((entry) => entry.id === 'local-team');
    if (position < Math.max(1, leaderboard.length - 3)) return;
    const power = powers[position % powers.length];
    const nextState = {
      ...powerState,
      inventory: [...powerState.inventory, {
        instanceId: `power-card-${Date.now()}`,
        powerId: power.id,
        round: settings.currentRound,
        status: 'available',
        awardedPosition: position + 1,
      }],
    };
    setPowerState(saveStoredBanquigerPowerState(nextState));
    void saveUserGameDocument(GAME_DATA_KEYS.banquigerPowerState, 'banquiger', nextState);
  }, [isAuthenticated, leaderboard, powerState, powers, settings.currentRound]);

  const persistTeam = (nextSelectedIds = selectedIds) => {
    window.localStorage.setItem(
      teamStorageKey,
      JSON.stringify({
        managerName,
        teamName,
        selectedIds: nextSelectedIds,
      }),
    );
    void saveBanquigerTeam({
      userId: user?.id,
      managerName: managerName || user?.name,
      teamName,
      budget,
      selectedIds: nextSelectedIds,
      selectedMatchId: latestPublishedMatch?.id,
    });
  };

  const togglePlayer = (player) => {
    setSaved(false);
    setSelectedIds((currentIds) => {
      let nextIds;

      if (currentIds.includes(player.id)) {
        nextIds = currentIds.filter((id) => id !== player.id);
      } else {
        const currentCost = currentIds.reduce((total, id) => {
          const currentPlayer = marketPlayers.find((candidate) => candidate.id === id);
          return total + (currentPlayer?.price ?? 0);
        }, 0);

        const currentPlayers = currentIds.map((id) => marketPlayers.find((candidate) => candidate.id === id)).filter(Boolean);
        const { startersByPosition: currentStarters, starterPlayers: currentStarterPlayers } = buildLineup(currentPlayers);
        const starterSlotFilled = Boolean(currentStarters[player.position]);
        const canUseBench = currentStarterPlayers.length === STARTER_POSITIONS.length;

        if (
          currentIds.length >= teamSize ||
          currentCost + player.price > budget ||
          (starterSlotFilled && !canUseBench)
        ) {
          nextIds = currentIds;
        } else {
          nextIds = [...currentIds, player.id];
        }
      }

      persistTeam(nextIds);

      return nextIds;
    });
  };

  const saveTeam = () => {
    persistTeam();
    setSaved(true);
  };

  const resetTeam = () => {
    setSelectedIds([]);
    setSaved(false);
    window.localStorage.removeItem(teamStorageKey);
    persistTeam([]);
  };

  const availablePowerCards = powerState.inventory
    .filter((item) => item.round === settings.currentRound && item.status === 'available')
    .map((item) => ({ ...item, power: powers.find((power) => power.id === item.powerId) }))
    .filter((item) => item.power);

  const usePower = (card) => {
    const power = card.power;
    const targetTeamId = power.type === 'positive' ? 'local-team' : powerTargetTeamId;
    if (!targetTeamId || !powerTargetPlayerId) {
      setPowerNotice('Elige el equipo y el jugador objetivo antes de activar la carta.');
      return;
    }
    const targetTeam = leaderboard.find((entry) => entry.id === targetTeamId);
    const targetPlayer = marketPlayers.find((player) => player.id === powerTargetPlayerId);
    const nextUse = {
      id: `power-use-${Date.now()}`,
      round: settings.currentRound,
      powerId: power.id,
      powerName: power.name,
      effect: power.effect,
      sourceTeamId: 'local-team',
      sourceTeamName: teamName,
      targetTeamId,
      targetTeamName: targetTeam?.team || teamName,
      targetPlayerId: powerTargetPlayerId,
      targetPlayerName: targetPlayer?.name || 'Jugador',
      usedAt: new Date().toISOString(),
    };
    const nextState = {
      inventory: powerState.inventory.map((item) =>
        item.instanceId === card.instanceId ? { ...item, status: 'used' } : item,
      ),
      uses: [...powerState.uses, nextUse],
    };
    setPowerState(saveStoredBanquigerPowerState(nextState));
    void saveUserGameDocument(GAME_DATA_KEYS.banquigerPowerState, 'banquiger', nextState);
    setPowerTargetTeamId('');
    setPowerTargetPlayerId('');
    setPowerNotice(`${power.name} activado sobre ${nextUse.targetPlayerName}.`);
  };

  const renderLineupPreview = () => (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-3">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
          <div className="absolute left-5 right-5 top-5 h-28 rounded-b-[4rem] border-x-2 border-b-2 border-white/35" />
          <div className="absolute left-1/2 top-5 h-28 w-px -translate-x-1/2 bg-white/30" />
          <div className="absolute inset-x-0 bottom-12 h-px bg-white/20" />
        </div>
        <div className="relative grid min-h-[360px] grid-rows-[1fr_1fr_1fr] gap-3">
          <div className="grid grid-cols-3 items-start gap-3">
            <div />
            <PlayerToken
              player={startersByPosition['Pívot']}
              row={rowsByPlayer.get(startersByPosition['Pívot']?.id)}
              compact
              starter
              slotLabel="Pívot"
            />
            <div />
          </div>
          <div className="grid grid-cols-2 items-center gap-3">
            <PlayerToken
              player={startersByPosition['Alero']}
              row={rowsByPlayer.get(startersByPosition['Alero']?.id)}
              compact
              starter
              slotLabel="Alero"
            />
            <PlayerToken
              player={startersByPosition['Ala-Pívot']}
              row={rowsByPlayer.get(startersByPosition['Ala-Pívot']?.id)}
              compact
              starter
              slotLabel="Ala-Pívot"
            />
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <PlayerToken
              player={startersByPosition.Base}
              row={rowsByPlayer.get(startersByPosition.Base?.id)}
              compact
              starter
              slotLabel="Base"
            />
            <PlayerToken
              player={startersByPosition.Escolta}
              row={rowsByPlayer.get(startersByPosition.Escolta?.id)}
              compact
              starter
              slotLabel="Escolta"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-center text-xs font-bold uppercase text-gray-500">Banquillo</p>
        <div className="grid grid-cols-2 gap-3">
          <PlayerToken player={benchPlayers[0]} row={rowsByPlayer.get(benchPlayers[0]?.id)} compact slotLabel="Suplente" />
          <PlayerToken player={benchPlayers[1]} row={rowsByPlayer.get(benchPlayers[1]?.id)} compact slotLabel="Suplente" />
        </div>
      </div>
    </div>
  );

  const renderRankingTeamModal = () => {
    if (!viewedRankingTeam) return null;

    const viewedPlayers = viewedRankingTeam.selectedIds
      .map((id) => marketPlayers.find((player) => player.id === String(id)))
      .filter(Boolean);
    const {
      startersByPosition: viewedStartersByPosition,
      benchPlayers: viewedBenchPlayers,
    } = buildLineup(viewedPlayers);
    const viewedCost = viewedPlayers.reduce((total, player) => total + player.price, 0);

    const modalToken = (player, slotLabel, starter = false) => (
      <PlayerToken player={player} row={rowsByPlayer.get(player?.id)} compact starter={starter} slotLabel={slotLabel} />
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[hsl(43_65%_52%_/_0.3)] bg-[#0c0c0c] p-4 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">{viewedRankingTeam.manager}</p>
              <h2 className="text-2xl font-black text-white">{viewedRankingTeam.team}</h2>
              <p className="mt-1 text-xs text-gray-500">
                {viewedRankingTeam.points.toFixed(1)} pts · Coste {formatMoney(viewedCost)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewedRankingTeam(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:border-[hsl(43_65%_52%)] hover:text-[hsl(43_65%_52%)]"
              aria-label="Cerrar equipo"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-3">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
                <div className="absolute left-5 right-5 top-5 h-28 rounded-b-[4rem] border-x-2 border-b-2 border-white/35" />
                <div className="absolute left-1/2 top-5 h-28 w-px -translate-x-1/2 bg-white/30" />
                <div className="absolute inset-x-0 bottom-12 h-px bg-white/20" />
              </div>
              <div className="relative grid min-h-[360px] grid-rows-[1fr_1fr_1fr] gap-3">
                <div className="grid grid-cols-3 items-start gap-3">
                  <div />
                  {modalToken(viewedStartersByPosition['Pívot'], 'Pívot', true)}
                  <div />
                </div>
                <div className="grid grid-cols-2 items-center gap-3">
                  {modalToken(viewedStartersByPosition.Alero, 'Alero', true)}
                  {modalToken(viewedStartersByPosition['Ala-Pívot'], 'Ala-Pívot', true)}
                </div>
                <div className="grid grid-cols-2 items-end gap-3">
                  {modalToken(viewedStartersByPosition.Base, 'Base', true)}
                  {modalToken(viewedStartersByPosition.Escolta, 'Escolta', true)}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-center text-xs font-bold uppercase text-gray-500">Banquillo</p>
              <div className="grid gap-3">
                {modalToken(viewedBenchPlayers[0], 'Suplente')}
                {modalToken(viewedBenchPlayers[1], 'Suplente')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard icon={Coins} label="Saldo" value={formatMoney(remainingBudget)} />
        <SummaryCard icon={UsersRound} label="Plantilla" value={`${selectedIds.length}/${teamSize}`} />
        <SummaryCard icon={Trophy} label="Valoración Banquiger" value={selectedScore.toFixed(1)} />
        <SummaryCard icon={CalendarClock} label="Juegan" value={`${selectedPlayed}/${selectedIds.length || teamSize}`} />
      </div>

      <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">{teamName}</p>
            <h2 className="text-xl font-black text-white">Mi plantilla</h2>
            <p className="mt-1 text-xs text-gray-500">
              Quinteto: Base, Escolta, Alero, Ala-Pívot y Pívot. Banquillo: posición libre.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveTeam}
              disabled={!canSave}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-3 text-xs font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={15} />
              Guardar
            </button>
            <button
              type="button"
              onClick={resetTeam}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:border-[hsl(43_65%_52%)] hover:text-[hsl(43_65%_52%)]"
              aria-label="Reiniciar equipo"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {!startersComplete && (
          <p className="mb-3 rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] px-3 py-2 text-xs font-bold text-[hsl(43_65%_68%)]">
            Faltan titulares: {missingStarterPositions.join(', ')}.
          </p>
        )}

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#c9a66b] p-3">
          <div className="absolute inset-0 opacity-45">
            <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/65" />
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/65" />
            <div className="absolute left-5 right-5 top-5 bottom-5 rounded-[2rem] border-2 border-white/60" />
          </div>
          <div className="relative grid min-h-[360px] grid-rows-[1fr_1fr_1fr] gap-3">
            <div className="grid grid-cols-3 items-start gap-3">
              <div />
              <PlayerToken
                player={startersByPosition['Pívot']}
                row={rowsByPlayer.get(startersByPosition['Pívot']?.id)}
                compact
                starter
                slotLabel="Pívot"
              />
              <div />
            </div>
            <div className="grid grid-cols-2 items-center gap-3">
              <PlayerToken
                player={startersByPosition['Alero']}
                row={rowsByPlayer.get(startersByPosition['Alero']?.id)}
                compact
                starter
                slotLabel="Alero"
              />
              <PlayerToken
                player={startersByPosition['Ala-Pívot']}
                row={rowsByPlayer.get(startersByPosition['Ala-Pívot']?.id)}
                compact
                starter
                slotLabel="Ala-Pívot"
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <PlayerToken
                player={startersByPosition.Base}
                row={rowsByPlayer.get(startersByPosition.Base?.id)}
                compact
                starter
                slotLabel="Base"
              />
              <PlayerToken
                player={startersByPosition.Escolta}
                row={rowsByPlayer.get(startersByPosition.Escolta?.id)}
                compact
                starter
                slotLabel="Escolta"
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-center text-xs font-bold uppercase text-gray-500">Banquillo</p>
          <div className="grid grid-cols-2 gap-3">
            <PlayerToken player={benchPlayers[0]} row={rowsByPlayer.get(benchPlayers[0]?.id)} compact slotLabel="Suplente" />
            <PlayerToken player={benchPlayers[1]} row={rowsByPlayer.get(benchPlayers[1]?.id)} compact slotLabel="Suplente" />
          </div>
        </div>

        {saved && (
          <p className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-center text-xs font-bold text-green-200">
            Equipo guardado en este dispositivo.
          </p>
        )}
      </div>
    </section>
  );

  const renderMarket = () => (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Mercado</p>
            <h2 className="text-xl font-black text-white">Jugadores</h2>
            <p className="mt-1 text-xs text-gray-500">{latestPublishedMatch ? `Precios actualizados tras CDB vs ${latestPublishedMatch.rival} · ${latestPublishedMatch.date}` : 'Pendiente del primer partido publicado'}</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[620px]">
            <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Posición</span><select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"><option value="all">Todas</option>{STARTER_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Precio</span><select value={priceSort} onChange={(event) => { setPriceSort(event.target.value); if (event.target.value !== 'all') setValuationSort('all'); }} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"><option value="all">Todos</option><option value="desc">Más alto a más bajo</option><option value="asc">Más bajo a más alto</option></select></label>
            <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Valoración media</span><select value={valuationSort} onChange={(event) => { setValuationSort(event.target.value); if (event.target.value !== 'all') setPriceSort('all'); }} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"><option value="all">Todas</option><option value="desc">Más alta a más baja</option><option value="asc">Más baja a más alta</option></select></label>
          </div>
        </div>

        <div className="space-y-2">
          {sortedMarket.map((player) => {
            const selected = selectedIds.includes(player.id);
            const row = rowsByPlayer.get(player.id);
            const starterPositionFilled = Boolean(startersByPosition[player.position]);
            const blockedByLineup = starterPositionFilled && !startersComplete;
            const canBuy =
              selected ||
              (settings.marketStatus === 'open' &&
                selectedIds.length < teamSize &&
                remainingBudget >= player.price &&
                !blockedByLineup);

            return (
              <article
                key={player.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 ${
                  selected
                    ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.08)]'
                    : 'border-white/5 bg-black/30'
                }`}
              >
                <JerseyVisual player={player} size="market" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white">{player.name}</h3>
                      <p className="truncate text-xs text-gray-500">
                        #{player.number} · {player.position} · {player.team === 'feminine' ? 'Femenino' : 'Masculino'}
                      </p>
                      {!selected && blockedByLineup && (
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase text-[hsl(43_65%_62%)]">
                          Completa el quinteto primero
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-center text-[10px] font-black sm:grid-cols-4">
                    <span className="rounded bg-black/35 px-1 py-1 text-white">MED {player.avgValuation.toFixed(1)}</span>
                    <span className="rounded bg-black/35 px-1 py-1 text-white">JOR {row.valuation.toFixed(1)}</span>
                    <span className="rounded bg-black/35 px-1 py-1 text-white">{formatMoney(player.price)}</span>
                    <span
                      className={`flex items-center justify-center gap-0.5 rounded bg-black/35 px-1 py-1 ${
                        row.priceChange >= 0 ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {row.priceChange >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                      {row.priceChange >= 0 ? '+' : ''}
                      {row.priceChange.toFixed(1)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlayer(player)}
                  disabled={!canBuy}
                  className={`h-9 w-20 rounded-lg text-[11px] font-black uppercase transition ${
                    selected
                      ? 'border border-red-400/30 text-red-200 hover:bg-red-500/10'
                      : 'bg-[hsl(43_65%_52%)] text-black hover:bg-[hsl(43_65%_60%)] disabled:cursor-not-allowed disabled:opacity-40'
                  }`}
                >
                  {selected ? 'Vender' : 'Fichar'}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4 xl:sticky xl:top-24 xl:self-start">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">{teamName}</p>
            <h2 className="text-xl font-black text-white">Tu equipo</h2>
          </div>
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-gray-300">
            {selectedIds.length}/{teamSize}
          </p>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black/35 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Saldo</p>
            <p className="text-lg font-black text-white">{formatMoney(remainingBudget)}</p>
          </div>
          <div className="rounded-lg bg-black/35 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Coste</p>
            <p className="text-lg font-black text-white">{formatMoney(selectedCost)}</p>
          </div>
          <div className="rounded-lg bg-black/35 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Puntos</p>
            <p className="text-lg font-black text-white">{selectedScore.toFixed(1)}</p>
          </div>
        </div>

        {!startersComplete && (
          <p className="mb-3 rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] px-3 py-2 text-xs font-bold text-[hsl(43_65%_68%)]">
            Faltan titulares: {missingStarterPositions.join(', ')}.
          </p>
        )}

        {renderLineupPreview()}
      </aside>
    </section>
  );

  const renderPowers = () => {
    const rivalTeams = leaderboard.filter((entry) => entry.id !== 'local-team');
    const selectedRival = rivalTeams.find((entry) => entry.id === powerTargetTeamId);
    const selectedRivalPlayers = (selectedRival?.selectedIds || [])
      .map((id) => marketPlayers.find((player) => player.id === String(id)))
      .filter(Boolean);

    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.2)] bg-[#111]/90 p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="rounded-xl bg-[hsl(43_65%_52%_/_0.12)] p-3 text-[hsl(43_65%_62%)]"><Zap size={22} /></span>
            <div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Poderes del Banquillo</p><h2 className="text-xl font-black text-white">Cartas de remontada</h2><p className="mt-1 text-sm text-gray-500">Los tres últimos clasificados reciben una carta para utilizar en la siguiente jornada. Solo puede usarse una vez.</p></div>
          </div>

          {powerNotice && <p className="mb-4 rounded-lg border border-[hsl(43_65%_52%_/_0.3)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-sm font-bold text-[hsl(43_65%_70%)]">{powerNotice}</p>}

          {availablePowerCards.length ? <div className="grid gap-4 lg:grid-cols-2">
            {availablePowerCards.map((card) => {
              const power = card.power;
              const ownCandidates = power.effect === 'bench_as_starter' ? benchPlayers : selectedPlayers;
              const candidates = power.type === 'positive' ? ownCandidates : selectedRivalPlayers;
              return <article key={card.instanceId} className="rounded-xl border border-[hsl(43_65%_52%_/_0.3)] bg-gradient-to-br from-[#201a0c] to-black p-5">
                <div className="flex items-start justify-between gap-3"><div><span className={`text-[10px] font-black uppercase ${power.type === 'positive' ? 'text-green-300' : 'text-red-300'}`}>{power.type === 'positive' ? 'Poder propio' : 'Ataque rival'} · {power.rarity === 'rare' ? 'Raro' : 'Común'}</span><h3 className="mt-1 text-xl font-black text-white">{power.name}</h3></div><Zap className="shrink-0 text-[hsl(43_65%_52%)]" /></div>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{power.description}</p>
                <div className="mt-5 space-y-3">
                  {power.type === 'negative' && <label className="block"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Equipo rival</span><select value={powerTargetTeamId} onChange={(event) => { setPowerTargetTeamId(event.target.value); setPowerTargetPlayerId(''); }} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]"><option value="">Elegir rival</option>{rivalTeams.map((entry) => <option key={entry.id} value={entry.id}>{entry.team}</option>)}</select></label>}
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Jugador objetivo</span><select value={powerTargetPlayerId} onChange={(event) => setPowerTargetPlayerId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]"><option value="">Elegir jugador</option>{candidates.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
                  <button type="button" onClick={() => usePower(card)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-xs font-black uppercase text-black"><Zap size={15} /> Activar poder</button>
                </div>
              </article>;
            })}
          </div> : <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center"><Zap className="mx-auto text-white/20" /><p className="mt-3 font-black text-gray-300">No tienes cartas disponibles</p><p className="mt-1 text-sm text-gray-600">Si terminas entre los tres últimos, recibirás una para la siguiente jornada.</p></div>}
        </div>

        {currentPowerUses.length > 0 && <div className="rounded-xl border border-white/10 bg-[#111]/90 p-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Registro público</p><h2 className="text-xl font-black text-white">Poderes utilizados esta jornada</h2><div className="mt-4 space-y-2">{currentPowerUses.map((use) => <div key={use.id} className="rounded-lg border border-white/5 bg-black/25 px-4 py-3 text-sm"><strong className="text-white">{use.sourceTeamName}</strong><span className="text-gray-500"> usó </span><strong className="text-[hsl(43_65%_62%)]">{use.powerName}</strong><span className="text-gray-500"> sobre {use.targetPlayerName} ({use.targetTeamName})</span></div>)}</div></div>}
      </section>
    );
  };

  const renderRanking = () => (
    <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4">
      <div className="mb-4 flex items-center gap-3">
        <ListOrdered size={22} className="text-[hsl(43_65%_52%)]" />
        <div>
          <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Clasificación general</p>
          <h2 className="text-xl font-black text-white">Puntos acumulados</h2>
        </div>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <button
            type="button"
            key={`${entry.manager}-${entry.team}`}
            onClick={() => setViewedRankingTeam(entry)}
            className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border px-3 py-3 text-left transition hover:border-[hsl(43_65%_52%_/_0.65)] ${
              entry.current
                ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.08)]'
                : 'border-white/5 bg-black/30'
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/45 text-sm font-black text-[hsl(43_65%_52%)]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">{entry.team}</h3>
              <p className="truncate text-xs text-gray-500">{entry.manager}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-white">{entry.points.toFixed(1)}</p>
              <p className="text-[10px] font-bold uppercase text-gray-500">pts</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300">
              <Eye size={16} />
            </span>
          </button>
        ))}
      </div>

      {renderRankingTeamModal()}
    </section>
  );

  if (authLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white"><Header /><main className="p-16 text-center text-sm font-black uppercase text-gray-400">Comprobando sesión...</main></div>;
  }
  if (isAuthenticated && !isDashboard) return <Navigate to="/banquiger/panel" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Banquiger - La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Banquiger, el fantasy interno de La Comunidad del Banquillo con mercado, presupuesto y puntuación por valoración."
        />
      </Helmet>

      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!isAuthenticated ? (
            <>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="mb-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
              >
                <div>
                  <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Fantasy banquiller</span>
                  <h1 className="mt-2 text-white">Banquiger</h1>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
                    Crea tu equipo, ficha 7 jugadores y compite cada jornada con la valoración de la plantilla.
                  </p>
                  <div className="mt-5 rounded-xl border border-[hsl(43_65%_52%_/_0.28)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
                    <p className="text-sm font-black uppercase text-[hsl(43_65%_62%)]">
                      Para jugar necesitas una cuenta
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">
                      Puedes leer las instrucciones y ver cómo funciona el modo sin registrarte, pero para crear,
                      guardar y modificar tu equipo tienes que iniciar sesión o crear una cuenta Banquiller.
                    </p>
                  </div>
                </div>

                <div className="self-start rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <LogIn size={20} className="text-[hsl(43_65%_52%)]" />
                    <div>
                      <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Cuenta Banquiller</p>
                      <h2 className="text-xl font-black text-white">Accede a tu equipo</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { from: '/banquiger/panel' } })}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)]"
                  >
                    <LogIn size={17} />
                    Iniciar sesión
                  </button>
                  <button type="button" onClick={() => navigate('/registro', { state: { from: '/banquiger/panel' } })} className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-gray-300 transition hover:border-[hsl(43_65%_52%_/_0.6)] hover:text-white">Crear una cuenta</button>
                </div>
              </motion.section>

              <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {rules.map((rule) => {
                  const Icon = rule.icon;

                  return (
                    <article
                      key={rule.title}
                      className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4"
                    >
                      <div className="mb-3 inline-flex rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2">
                        <Icon size={19} className="text-[hsl(43_65%_52%)]" />
                      </div>
                      <h2 className="text-lg font-black text-white">{rule.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{rule.text}</p>
                    </article>
                  );
                })}
              </section>
            </>
          ) : (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">
                    {settings.currentRound} · {settings.marketStatus === 'open' ? 'Mercado abierto' : 'Mercado cerrado'}
                  </p>
                  <h1 className="mt-1 text-3xl font-black leading-none text-white md:text-5xl">{teamName}</h1>
                  <p className="mt-2 text-xs font-bold uppercase text-gray-500">{managerName || 'Manager invitado'}</p>
                </div>
              </div>

              <nav className="grid gap-2 md:grid-cols-4">
                {dashboardMenu.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black uppercase transition ${
                        active
                          ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%)] text-black'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:border-[hsl(43_65%_52%_/_0.5)] hover:text-white'
                      }`}
                    >
                      <Icon size={17} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {activeSection === 'team' && renderTeam()}
              {activeSection === 'market' && renderMarket()}
              {activeSection === 'powers' && renderPowers()}
              {activeSection === 'ranking' && renderRanking()}
            </motion.section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BanquigerPage;
