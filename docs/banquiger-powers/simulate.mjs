import fs from 'node:fs';
import { menRoster, matches, playerGameStats, playerAdvancedStats } from '../../src/data/data.js';
import { parseMadeAttempt, getValuation } from '../../src/utils/statCalculations.js';
import { applyBanquigerPricing } from '../../src/utils/banquigerPricing.js';

let seed = 20261012;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (list) => list[Math.floor(random() * list.length)];
const shuffle = (list) => { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
const positions = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const games = new Map(playerGameStats.map((s) => [`${s.matchId}-${s.playerId}`, s]));
const advanced = new Map(playerAdvancedStats.map((s) => [`${s.matchId}-${s.playerId}`, s]));
const complete = matches.filter((m) => m.season === '2025-2026' && m.result && playerAdvancedStats.some((s) => s.matchId === m.id));
const training = complete.filter((m) => m.id <= 11);
const validation = complete.filter((m) => m.id > 11);
const raw = (matchId, id, starter) => {
  const game = games.get(`${matchId}-${id}`);
  const stat = advanced.get(`${matchId}-${id}`);
  if (!game) return { f: 0, played: false, points: 0, assists: 0, rebounds: 0, threes: 0, defence: 0, misses: 0, bonus: 0 };
  const points = game.points || 0;
  const fg = parseMadeAttempt(stat?.fg), ft = parseMadeAttempt(stat?.ft);
  const nonPoints = stat ? getValuation(stat, points) - points : 0;
  return {
    f: points + nonPoints * (starter ? 2 : 1), played: game.minutes !== '00:00', points,
    assists: stat?.assists || 0, rebounds: (stat?.oreb || 0) + (stat?.dreb || 0),
    threes: parseMadeAttempt(stat?.threePt).made,
    defence: (stat?.steals || 0) + (stat?.blocks || 0),
    misses: fg.attempted - fg.made + ft.attempted - ft.made,
    bonus: starter ? nonPoints : 0,
  };
};
const forecastCache = new Map();
const forecast = (id, starter, metric = 'f') => { const key = `${id}-${starter}-${metric}`; if (!forecastCache.has(key)) forecastCache.set(key, training.reduce((sum, m) => sum + raw(m.id, id, starter)[metric], 0) / training.length); return forecastCache.get(key); };
const players = applyBanquigerPricing(menRoster.map((p) => {
  const recorded = training.map((m) => ({ g: games.get(`${m.id}-${p.id}`), a: advanced.get(`${m.id}-${p.id}`) })).filter((s) => s.g);
  return { ...p, avgValuation: recorded.reduce((sum, s) => sum + (getValuation(s.a, s.g.points) ?? s.g.points), 0) / (recorded.length || 1) };
}));
const lineup = () => {
  for (let tries = 0; tries < 10000; tries++) {
    const starters = positions.map((position) => pick(players.filter((p) => p.position === position)));
    const bench = shuffle(players.filter((p) => !starters.includes(p))).slice(0, 2);
    const all = [...starters, ...bench];
    if (all.reduce((sum, p) => sum + p.price, 0) <= 5 + 1e-9) return all.map((p, index) => ({ id: p.id, starter: index < 5 }));
  }
  throw new Error('Cannot generate a legal team');
};
const best = (team, count = 1, metric = 'f', benchOnly = false) => team
  .filter((p) => !benchOnly || !p.starter)
  .sort((a, b) => forecast(b.id, b.starter, metric) - forecast(a.id, a.starter, metric)).slice(0, count);
const pos = (n) => Math.max(0, n);

// All deltas are calculated from the original score, before any other card.
export const cards = [
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

const teamForecast = (team) => team.reduce((sum, p) => sum + forecast(p.id, p.starter), 0);
const score = (team, matchId) => team.reduce((sum, p) => sum + raw(matchId, p.id, p.starter).f, 0);
const ranking = (scores, ties) => scores.map((points, i) => ({ i, points, tie: ties[i] })).sort((a, b) => b.points - a.points || a.tie - b.tie).map((s) => s.i);
const applyCard = (card, owner, teams, previousRanking, matchId) => {
  const eligibleRivals = previousRanking.slice(0, previousRanking.indexOf(owner))
    .sort((a, b) => Math.abs(teamForecast(teams[a]) - teamForecast(teams[owner])) - Math.abs(teamForecast(teams[b]) - teamForecast(teams[owner])));
  const targets = card.sign === '+' ? [owner] : eligibleRivals.slice(0, card.rivalCount);
  const changes = [];
  let remaining = card.cap;
  for (const target of targets) {
    let selected = best(teams[target], card.count, card.metric, card.bench);
    if (['c2', 'l4'].includes(card.id)) selected = teams[target].filter((p) => p.starter).sort((a, b) => forecast(a.id, a.starter) - forecast(b.id, b.starter)).slice(0, 1);
    if (card.id === 'e8') selected = best(teams[target].filter((p) => p.starter), 1);
    const playerChanges = selected.map((p) => {
      const row = raw(matchId, p.id, p.starter);
      const effect = pos(card.effect(row, p));
      return { player: p.id, amount: card.sign === '-' ? Math.min(effect, pos(row.f) * 0.6) : effect };
    });
    const value = Math.min(remaining, playerChanges.reduce((sum, p) => sum + p.amount, 0));
    const factor = value / (playerChanges.reduce((sum, p) => sum + p.amount, 0) || 1);
    changes.push({ team: target, delta: card.sign === '+' ? value : -value, players: playerChanges.map((p) => ({ player: p.player, amount: p.amount * factor })) });
    remaining -= value;
  }
  return { changes, impact: card.cap - remaining };
};

const tiers = ['common', 'rare', 'epic', 'legendary'];
const probabilities = { 8: [64, 26, 8, 2], 9: [56, 30, 11, 3], 10: [48, 32, 15, 5] };
const drawCard = (position, history = []) => {
  let r = random() * 100;
  let tier = tiers.at(-1);
  probabilities[position].some((weight, i) => { r -= weight; if (r < 0) { tier = tiers[i]; return true; } return false; });
  const sign = random() < 0.6 ? '+' : '-';
  return pick(cards.filter((card) => card.tier === tier && card.sign === sign && !history.slice(-3).includes(card.id)));
};
const trials = 5000;
const results = Object.fromEntries(cards.map((card) => [card.id, { impacts: [], improved: 0, places: 0 }]));
const mixed = { positiveGain: 0, damage: 0, improved: 0, places: 0, draws: {}, eligible: trials * 3, topRankedAttacked: 0 };
const baseline = [];
let example = null;
for (let trial = 0; trial < trials; trial++) {
  const teams = Array.from({ length: 10 }, lineup);
  const ties = teams.map(() => random());
  const previous = pick(training), next = pick(validation);
  const previousRanking = ranking(teams.map((team) => score(team, previous.id)), ties);
  const scores = teams.map((team) => score(team, next.id));
  const baseRanking = ranking(scores, ties);
  baseline.push(...scores);
  const recipients = previousRanking.slice(-3);
  for (const owner of recipients) {
    for (const card of cards) {
      const applied = applyCard(card, owner, teams, previousRanking, next.id);
      const altered = scores.slice();
      applied.changes.forEach((change) => altered[change.team] += change.delta);
      const places = baseRanking.indexOf(owner) - ranking(altered, ties).indexOf(owner);
      const result = results[card.id];
      result.impacts.push(applied.impact);
      result.improved += places > 0 ? 1 : 0;
      result.places += places;
    }
  }
  const jointScores = scores.slice(), damageByTeam = new Map(), damageByPlayer = new Map();
  const appliedCards = [];
  for (const owner of recipients) {
    const position = previousRanking.indexOf(owner) + 1;
    const card = drawCard(position);
    mixed.draws[card.tier] = (mixed.draws[card.tier] || 0) + 1;
    const applied = applyCard(card, owner, teams, previousRanking, next.id);
    for (const change of applied.changes) {
      if (change.delta >= 0) { jointScores[change.team] += change.delta; mixed.positiveGain += change.delta; }
      else {
        let loss = 0;
        for (const p of change.players) {
          const key = `${change.team}-${p.player}`;
          const row = teams[change.team].find((item) => item.id === p.player);
          const room = pos(raw(next.id, p.player, row.starter).f) * 0.6 - (damageByPlayer.get(key) || 0);
          const allowed = Math.max(0, Math.min(p.amount, room, 24 - (damageByTeam.get(change.team) || 0)));
          damageByPlayer.set(key, (damageByPlayer.get(key) || 0) + allowed);
          damageByTeam.set(change.team, (damageByTeam.get(change.team) || 0) + allowed);
          loss += allowed;
        }
        jointScores[change.team] -= loss; mixed.damage += loss; change.delta = -loss;
        if (change.team === previousRanking[0] && loss > 0) mixed.topRankedAttacked++;
      }
    }
    appliedCards.push({ owner, previousPosition: position, card: card.name, sign: card.sign, changes: applied.changes.map((c) => ({ team: c.team, delta: c.delta })) });
  }
  const after = ranking(jointScores, ties);
  recipients.forEach((owner) => { const places = baseRanking.indexOf(owner) - after.indexOf(owner); mixed.places += places; mixed.improved += places > 0 ? 1 : 0; });
  if (!example && appliedCards.some((c) => c.sign === '+') && appliedCards.some((c) => c.sign === '-' && c.changes.some((change) => change.delta < -1)) && recipients.some((owner) => baseRanking.indexOf(owner) - after.indexOf(owner) >= 2)) {
    example = { historicalMatchId: next.id, rival: next.rival, cards: appliedCards, teams: scores.map((points, team) => ({ team: team + 1, previousPosition: previousRanking.indexOf(team) + 1, baseline: points, after: jointScores[team], baselinePosition: baseRanking.indexOf(team) + 1, afterPosition: after.indexOf(team) + 1 })) };
  }
}
const quantile = (values, q) => { const ordered = [...values].sort((a, b) => a - b); return ordered[Math.floor((ordered.length - 1) * q)]; };
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const diversity = [];
for (let simulation = 0; simulation < 10000; simulation++) {
  const history = [];
  for (let award = 0; award < 10; award++) history.push(drawCard(10, history).id);
  diversity.push(new Set(history).size);
}
const report = {
  seed: 20261012, leagues: trials, managers: 10, individualEvaluations: trials * 3 * cards.length,
  trainingMatches: training.map((m) => m.id), validationMatches: validation.map((m) => m.id),
  baseline: { mean: mean(baseline), median: quantile(baseline, 0.5), p95: quantile(baseline, 0.95) },
  cards: cards.map((card) => { const r = results[card.id]; return { id: card.id, name: card.name, tier: card.tier, sign: card.sign, cap: card.cap, description: card.description, meanImpact: mean(r.impacts), p95: quantile(r.impacts, 0.95), zeroPercent: r.impacts.filter((n) => n === 0).length / r.impacts.length * 100, improvePercent: r.improved / r.impacts.length * 100, meanPlaces: r.places / r.impacts.length }; }),
  mixed: { ...mixed, improvePercent: mixed.improved / mixed.eligible * 100, meanPlaces: mixed.places / mixed.eligible, meanGain: mixed.positiveGain / mixed.eligible, meanDamage: mixed.damage / mixed.eligible },
  probabilities, positiveProbability: 60, diversity: { deliveries: 10, sequences: 10000, meanDistinct: mean(diversity), minimum: Math.min(...diversity), maximum: Math.max(...diversity) }, example,
};
fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
