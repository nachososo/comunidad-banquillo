import { masculineCalendar2026 } from '../data/masculineCalendar2026.js';

export const BANQUIGER_SEASON = '2026-2027';

// Convert Madrid wall time to an explicit offset, independent of the manager's timezone.
export const madridKickoff = (date, time) => {
  const wallTime = `${date}T${time.slice(0, 5)}:00`;
  const utc = new Date(`${wallTime}Z`);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(utc);
  const offset = (Number(parts.find((part) => part.type === 'hour').value) - utc.getUTCHours() + 24) % 24;
  return `${wallTime}+${String(offset).padStart(2, '0')}:00`;
};

export const buildBanquigerCalendarRounds = (fixtures = masculineCalendar2026) => fixtures
  .filter((match) => match.team === 'masculine' && match.season === BANQUIGER_SEASON)
  .map((match) => ({
    id: `masculine-${match.season}-${match.round}`,
    name: `Jornada ${match.round} · ${match.season.replace('-', '/')}`,
    season: match.season, round: match.round, matchId: match.id,
    rival: match.rival, venue: match.venue,
    deadline: madridKickoff(match.date, match.time),
    automatic: true, status: 'scheduled', scored: false,
  }))
  .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));

export const mergeBanquigerCalendarRounds = (stored = [], fixtures = masculineCalendar2026) => {
  const saved = new Map(stored.map((round) => [round.id, round]));
  const calendar = buildBanquigerCalendarRounds(fixtures).map((round) => ({
    ...round, ...saved.get(round.id), scored: saved.get(round.id)?.scored === true,
  }));
  const calendarIds = new Set(calendar.map((round) => round.id));
  return [...calendar, ...stored.filter((round) => !calendarIds.has(round.id) && !round.automatic)];
};

export const resolveBanquigerSchedule = (settings, rounds, now = Date.now()) => {
  if (settings.automaticSchedule === false) return { settings, rounds, currentRound: null };
  const calendar = rounds.filter((round) => round.automatic && round.season === BANQUIGER_SEASON)
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  // Keep a started match locked until its points are published by the administrator.
  const current = calendar.find((round) => !round.scored) || calendar.at(-1);
  if (!current) return { settings, rounds, currentRound: null };
  const marketStatus = !current.scored && now < Date.parse(current.deadline) ? 'open' : 'closed';
  return {
    settings: { ...settings, season: BANQUIGER_SEASON, currentRound: current.name, marketStatus },
    currentRound: current,
    rounds: rounds.map((round) => ({
      ...round,
      status: round.automatic
        ? round.id === current.id ? marketStatus : round.scored || now >= Date.parse(round.deadline) ? 'closed' : 'scheduled'
        : 'closed',
    })),
  };
};
