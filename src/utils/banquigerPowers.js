import { buildBanquigerLineup } from './banquigerPositions.js';
import { getValuation, parseMadeAttempt } from './statCalculations.js';
const pos = (n) => Math.max(0, Number(n) || 0);
const definitions = [
  ['c1', 'Grito de la grada', 'common', '+', 6, 'Un jugador propio que dispute minutos recibe +4 puntos.', 'f', 1, false, (r) => r.played ? 4 : 0],
  ['c2', 'Red de seguridad', 'common', '+', 6, 'Eleva hacia 4 la puntuación de un titular propio que juegue, con un máximo de +6.', 'f', 1, false, (r) => r.played ? 4 - r.f : 0],
  ['c3', 'Pase extra', 'common', '+', 6, '+2 puntos por asistencia de un jugador propio; máximo +6.', 'assists', 1, false, (r) => r.assists * 2],
  ['c4', 'Dueño del rebote', 'common', '+', 6, '+0,5 puntos por rebote de un jugador propio; máximo +6.', 'rebounds', 1, false, (r) => r.rebounds * 0.5],
  ['c5', 'Mano encima', 'common', '-', 6, 'Un jugador rival pierde el 10% de su puntuación positiva; máximo 6.', 'f', 1, false, (r) => r.f * 0.1],
  ['c6', 'Línea vigilada', 'common', '-', 6, 'Si juega, un jugador rival pierde 2 puntos y 1 por triple anotado; máximo 6.', 'threes', 1, false, (r) => r.played ? 2 + r.threes : 0],
  ['c7', 'Cortar el pase', 'common', '-', 6, 'Un jugador rival pierde 1 punto por asistencia; máximo 6.', 'assists', 1, false, (r) => r.assists],
  ['c8', 'Banquillo frío', 'common', '-', 6, 'Un suplente rival pierde el 20% de su puntuación positiva; máximo 6.', 'f', 1, true, (r) => r.f * 0.2],
  ['r1', 'Turbo', 'rare', '+', 10, 'Un jugador propio suma el 25% de su puntuación positiva; máximo +10.', 'f', 1, false, (r) => r.f * 0.25],
  ['r2', 'Sexto hombre', 'rare', '+', 10, 'Un suplente que juegue recibe +2 y el bonus positivo de titular sin puntos; máximo +10.', 'f', 1, true, (r) => r.played ? 2 + pos(r.f - r.points) : 0],
  ['r3', 'Segunda oportunidad', 'rare', '+', 10, 'Devuelve la mitad de las penalizaciones por tiros fallados de un jugador propio; máximo +10.', 'misses', 1, false, (r, p) => r.misses * (p.starter ? 1 : 0.5)],
  ['r4', 'Pareja conectada', 'rare', '+', 10, 'Dos jugadores propios suman el 15% de sus puntuaciones positivas; máximo +10 conjunto.', 'f', 2, false, (r) => r.f * 0.15],
  ['r5', 'Defensa pegajosa', 'rare', '-', 10, 'Un jugador rival pierde el 25% de su puntuación positiva; máximo 10.', 'f', 1, false, (r) => r.f * 0.25],
  ['r6', 'Dos contra uno', 'rare', '-', 10, 'Dos jugadores de un rival pierden el 15% de sus puntuaciones positivas; máximo 10 conjunto.', 'f', 2, false, (r) => r.f * 0.15],
  ['r7', 'Sin manos rápidas', 'rare', '-', 10, 'Un jugador rival pierde los puntos por robos y tapones, incluido x2 de titular; máximo 10.', 'defence', 1, false, (r, p) => r.defence * (p.starter ? 2 : 1)],
  ['r8', 'Fuego cruzado', 'rare', '-', 10, 'Un jugador de cada uno de dos rivales pierde el 10%; máximo 10 entre ambos.', 'f', 1, false, (r) => r.f * 0.1, 2],
  ['e1', 'Modo héroe', 'epic', '+', 16, 'Un jugador propio suma el 50% de su puntuación positiva; máximo +16.', 'f', 1, false, (r) => r.f * 0.5],
  ['e2', 'Dúo eléctrico', 'epic', '+', 16, 'Dos jugadores propios suman el 30% de sus puntuaciones positivas; máximo +16 conjunto.', 'f', 2, false, (r) => r.f * 0.3],
  ['e3', 'Juego colectivo', 'epic', '+', 16, 'Suma un 50% extra de los puntos por rebotes y asistencias de un jugador propio, incluido x2; máximo +16.', 'rebounds', 1, false, (r, p) => (r.rebounds + r.assists) * (p.starter ? 1 : 0.5)],
  ['e4', 'Revulsivo', 'epic', '+', 16, 'Un suplente propio duplica su puntuación positiva; máximo +16.', 'f', 1, true, (r) => r.f],
  ['e5', 'Marcaje especial', 'epic', '-', 16, 'Un jugador rival pierde la mitad de su puntuación positiva; máximo 16.', 'f', 1, false, (r) => r.f * 0.5],
  ['e6', 'Triángulo defensivo', 'epic', '-', 16, 'Tres jugadores de un rival pierden el 20%; máximo 16 conjunto.', 'f', 3, false, (r) => r.f * 0.2],
  ['e7', 'Doble presión', 'epic', '-', 16, 'Un jugador de cada uno de dos rivales pierde el 20%; máximo 16 conjunto.', 'f', 1, false, (r) => r.f * 0.2, 2],
  ['e8', 'Sin galones', 'epic', '-', 16, 'Un titular rival pierde solo su bonus x2 de valoración sin puntos; máximo 16.', 'f', 1, false, (r) => r.bonus],
  ['l1', 'Capitán de remontada', 'legendary', '+', 24, 'Un jugador propio duplica su puntuación positiva; máximo +24.', 'f', 1, false, (r) => r.f],
  ['l2', 'Todos a una', 'legendary', '+', 24, 'La plantilla propia suma el 30% de las puntuaciones positivas; máximo +24 total.', 'f', 7, false, (r) => r.f * 0.3],
  ['l3', 'Socios imparables', 'legendary', '+', 24, 'Dos jugadores propios suman el 75% de sus puntuaciones positivas; máximo +24 conjunto.', 'f', 2, false, (r) => r.f * 0.75],
  ['l4', 'Rescate del titular', 'legendary', '+', 24, 'Eleva hacia 15 la puntuación de un titular propio que juegue, con un máximo de +24.', 'f', 1, false, (r) => r.played ? 15 - r.f : 0],
  ['l5', 'Candado', 'legendary', '-', 24, 'Un jugador rival pierde el 60% de su puntuación positiva; máximo 24.', 'f', 1, false, (r) => r.f * 0.6],
  ['l6', 'Zona asfixiante', 'legendary', '-', 24, 'La plantilla de un rival pierde el 20% de las puntuaciones positivas; máximo 24 total.', 'f', 7, false, (r) => r.f * 0.2],
  ['l7', 'Presión en tres pistas', 'legendary', '-', 24, 'Un jugador de cada uno de tres rivales pierde el 20%; máximo 24 entre todos.', 'f', 1, false, (r) => r.f * 0.2, 3],
  ['l8', 'Pareja desconectada', 'legendary', '-', 24, 'Dos jugadores de un rival pierden la mitad de sus puntuaciones positivas; máximo 24 conjunto.', 'f', 2, false, (r) => r.f * 0.5],
].map(([id, name, tier, sign, cap, description, metric, count, bench, effect, rivalCount = 1]) => ({ id, name, tier, sign, cap, description, metric, count, bench, effect, rivalCount }));

export const POWER_RARITIES = { common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' };
export const POWER_ODDS = [[64, 26, 8, 2], [56, 30, 11, 3], [48, 32, 15, 5]];
export const defaultPowerCatalog = definitions.map(({ effect, ...card }) => ({
  ...card, effect: card.id, rarity: card.tier, type: card.sign === '+' ? 'positive' : 'negative',
  active: true, starterOnly: ['c2', 'e8', 'l4'].includes(card.id),
}));
export const mergePowerCatalog = (stored = []) => {
  const overrides = new Map(stored.filter(p => defaultPowerCatalog.some(c => c.id === p.id)).map(p => [p.id, p]));
  return defaultPowerCatalog.map(p => { const saved = overrides.get(p.id); return { ...p, name: saved?.name || p.name, description: saved?.description || p.description, active: saved?.active !== false }; });
};
export const powerDefinition = (power) => definitions.find(p => p.id === (power?.effect || power?.id));
export const buildPowerLineup = (ids, players) => {
  const selected = ids.map(String).map(id => players.find(p => String(p.id) === id)).filter(Boolean);
  const { starterPlayers } = buildBanquigerLineup(selected);
  const starterIds = new Set(starterPlayers.map(p => String(p.id)));
  return selected.map(player => ({ ...player, id: String(player.id), starter: starterIds.has(String(player.id)) }));
};
export const powerPlayerRow = (game, stat, starter, multiplier = 2) => {
  const played = Boolean(game && !['00:00', '0:00', '-', ''].includes(String(game.minutes ?? '')));
  if (!played) return { f: 0, played: false, points: 0, assists: 0, rebounds: 0, threes: 0, defence: 0, misses: 0, bonus: 0 };
  const points = Number(game.points) || 0, nonPoints = (getValuation(stat, points) ?? points) - points;
  const fg = parseMadeAttempt(stat?.fg), ft = parseMadeAttempt(stat?.ft);
  return { f: points + nonPoints * (starter ? multiplier : 1), played, points,
    assists: stat?.assists || 0, rebounds: (stat?.oreb || 0) + (stat?.dreb || 0),
    threes: parseMadeAttempt(stat?.threePt).made, defence: (stat?.steals || 0) + (stat?.blocks || 0),
    misses: Math.max(0, fg.attempted - fg.made) + Math.max(0, ft.attempted - ft.made),
    bonus: starter ? nonPoints * (multiplier - 1) : 0,
  };
};
// Original scores are immutable: bonuses never multiply previous bonuses or attacks.
export const scorePowerRound = ({ teams, players, gameStats, advancedStats, matchId, uses = [], multiplier = 2 }) => {
  const games = new Map(gameStats.filter(s => s.matchId === matchId).map(s => [String(s.playerId), s]));
  const advanced = new Map(advancedStats.filter(s => s.matchId === matchId).map(s => [String(s.playerId), s]));
  const lineups = new Map(teams.map(t => [String(t.id), buildPowerLineup(t.selectedIds || [], players).map(p => ({ ...p, row: powerPlayerRow(games.get(p.id), advanced.get(p.id), p.starter, multiplier) }))]));
  const changes = [];
  for (const use of uses) {
    const card = powerDefinition(use.power || { id: use.powerId });
    if (!card) continue;
    const candidateChanges = [];
    for (const target of use.targets || []) {
      const lineup = lineups.get(String(target.teamId)) || [];
      const selected = card.count === 7 ? lineup : lineup.filter(p => (target.playerIds || []).map(String).includes(p.id));
      for (const player of selected) {
        if ((card.bench && player.starter) || (['c2', 'e8', 'l4'].includes(card.id) && !player.starter)) continue;
        const amount = pos(card.effect(player.row, player));
        candidateChanges.push({ teamId: String(target.teamId), playerId: player.id, positive: card.sign === '+', amount: card.sign === '-' ? Math.min(amount, pos(player.row.f) * 0.6) : amount });
      }
    }
    const total = candidateChanges.reduce((sum, c) => sum + c.amount, 0);
    const scale = Math.min(1, card.cap / (total || 1));
    changes.push(...candidateChanges.map(c => ({ ...c, amount: c.amount * scale })));
  }
  // Combined attacks share each player's 60% ceiling, then the team's 24-point ceiling.
  const losses = new Map();
  changes.filter(c => !c.positive).forEach(c => { const key = `${c.teamId}:${c.playerId}`; losses.set(key, (losses.get(key) || 0) + c.amount); });
  return teams.map(team => {
    const id = String(team.id), lineup = lineups.get(id) || [];
    const basePoints = lineup.reduce((sum, p) => sum + p.row.f, 0);
    const bonus = changes.filter(c => c.teamId === id && c.positive).reduce((sum, c) => sum + c.amount, 0);
    const damage = Math.min(24, lineup.reduce((sum, p) => sum + Math.min(losses.get(`${id}:${p.id}`) || 0, pos(p.row.f) * 0.6), 0));
    return { ...team, basePoints, powerDelta: bonus - damage, points: Math.round((basePoints + bonus - damage) * 100) / 100 };
  }).sort((a, b) => b.points - a.points || String(a.id).localeCompare(String(b.id)));
};
export const validatePowerTargets = (power, targets, teams, sourceTeamId, eligibleTeamIds) => {
  const card = powerDefinition(power);
  if (!card || !Array.isArray(targets) || targets.length !== card.rivalCount) return 'Completa todos los objetivos de la carta.';
  if (new Set(targets.map(t => String(t.teamId))).size !== targets.length) return 'Elige equipos distintos.';
  for (const target of targets) {
    if (card.sign === '+' ? String(target.teamId) !== String(sourceTeamId) : !eligibleTeamIds.includes(String(target.teamId))) return 'Elige un rival que acabó por delante de ti en la jornada anterior.';
    const team = teams.find(t => String(t.id) === String(target.teamId));
    const ids = target.playerIds || [];
    if (!team || (card.count !== 7 && (ids.length !== card.count || new Set(ids).size !== ids.length)) || ids.some(id => !team.selectedIds.map(String).includes(String(id)))) return 'Elige los jugadores indicados de la plantilla del objetivo.';
  }
  return '';
};
