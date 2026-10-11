import { ARCHETYPES, CATEGORIES, DEFAULT_CAREER_CONFIG, DEFAULT_CAREER_SETTINGS, EFFECT_FIELDS, LAST_AGE, POSITIONS, RETIREMENT_AGE, ROUTINE_EVENT, START_AGE, STARTING_CLUB, STAGES, newCareerEvent } from '../data/careerData.js';
import { naturalDevelopment, rollDevelopment } from './careerDevelopment.js';
import { narrativeGender } from './careerNarrative.js';
import { resolvePresentation, sceneForEvent, validatePresentation } from './careerPresentation.js';
import { ATTRIBUTES, initialAttributes, attributesForCareer, overallFromAttributes, shiftAttributes, applyAttributeEffects, performanceRates, resolveSeasonHealth } from './careerAttributes.js';
import { clubsFor, minimumOverallForClub, transferClubFor, validateClubs } from '../data/careerClubs.js';
import { simulateMunicipalLeague } from './careerLeague.js';
import { simulateInterdistricts, validateInterdistrictsSettings } from './careerInterdistricts.js';
import { additionalIndividualAwards, isMvpSeason, seasonRoleFor } from './careerIndividualAwards.js';
import { seasonMinutesFor } from './careerMinutes.js';

export const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const draw = (rng) => clamp(rng(), 0, 0.999999999);
const sign = (value) => value > 0 ? '+' + value : String(value);
export const categoryForAge = (age) => age <= 14 ? 'infantil' : age <= 16 ? 'cadete' : age <= 18 ? 'junior' : 'senior';
export const effectsText = (effects) => Object.entries(effects).filter(([, value]) => value !== 0).map(([key, value]) => (EFFECT_FIELDS[key]?.label || key) + ' ' + sign(value) + (EFFECT_FIELDS[key]?.unit || '')).join(' · ') || 'Sin cambios adicionales';
export const chanceFor = (event, subject) => {
  const value = typeof subject === 'number' ? subject : event.influenceAttribute && event.influenceAttribute !== 'overall' ? attributesForCareer(subject)[event.influenceAttribute] : subject.overall;
  return event.chance === 0 || event.chance === 100 ? event.chance : Math.round(clamp(event.chance + ((value - 50) / 50) * event.influence));
};

export function validateConfig(config) {
  if (!config || config.version !== 2 || !config.settings || !Array.isArray(config.events)) return ['Formato de configuración no válido.'];
  const errors = [], ids = new Set();
  if (config.clubPackVersion !== undefined && !integer(config.clubPackVersion, 0, 12)) errors.push('Versión de incorporación de clubes no válida.');
  if (config.presentationPackVersion !== undefined && !integer(config.presentationPackVersion, 0, 1)) errors.push('Versión de presentaciones no válida.');
  const clubs = clubsFor(config);
  errors.push(...validateClubs(clubs));
  const clubIds = new Set(Array.isArray(clubs) ? clubs.map((club) => club?.id) : []);
  if (!integer(config.settings.gamesPerSeason, 10, 40)) errors.push('Partidos por temporada: entero entre 10 y 40.');
  if (!integer(config.settings.difficulty, 20, 80)) errors.push('Dificultad: entero entre 20 y 80.');
  errors.push(...validateInterdistrictsSettings(config.settings));
  if (config.events.length > 500) errors.push('El máximo es 500 eventos.');
  config.events.forEach((e, i) => {
    const prefix = 'Evento ' + (i + 1) + ': ';
    if (!e || typeof e !== 'object') { errors.push(prefix + 'no válido.'); return; }
    if (typeof e.id !== 'string' || !e.id || ids.has(e.id)) errors.push(prefix + 'identificador vacío o repetido.');
    ids.add(e.id);
    errors.push(...validatePresentation(e.presentation).map((error) => prefix + error));
    if (e.clubId !== undefined && e.clubId !== 'all' && !clubIds.has(e.clubId)) errors.push(prefix + 'el club de origen no existe.');
    if (e.category === 'transfer') {
      if (!clubIds.has(e.targetClubId)) errors.push(prefix + 'selecciona un club de destino existente.');
      if (e.clubId === e.targetClubId) errors.push(prefix + 'el origen y el destino del fichaje deben ser distintos.');
      if (e.minAge < 18) errors.push(prefix + 'los fichajes empiezan desde los 18 años.');
    }
    for (const [key, max] of [['title', 100], ['description', 1000], ['acceptLabel', 140], ['declineLabel', 140], ['successText', 500], ['failureText', 500], ['declineText', 500]]) {
      if (typeof e[key] !== 'string' || !e[key].trim() || e[key].length > max) errors.push(prefix + 'completa ' + key + ' (máximo ' + max + ' caracteres).');
    }
    for (const key of ['successAward', 'failureAward']) if (typeof e[key] !== 'string' || e[key].length > 100) errors.push(prefix + 'premio no válido.');
    if (!CATEGORIES[e.category] || !['all', ...Object.keys(STAGES)].includes(e.stage) || !['all', 'masculino', 'femenino'].includes(e.team) || !['all', ...POSITIONS].includes(e.position) || typeof e.enabled !== 'boolean') errors.push(prefix + 'revisa tipo y condiciones.');
    // Retain v2 catalogue bounds for older editor data; new careers always start
    // at START_AGE, so earlier ages/categories cannot consume a season.
    for (const [key, min, max] of [['weight', 1, 100], ['minAge', 13, 40], ['maxAge', 13, 40], ['minInjuries', 0, 100], ['cooldown', 0, 27], ['maxOccurrences', 1, 28], ['chance', 0, 100], ['influence', 0, 30]]) {
      if (!integer(e[key], min, max)) errors.push(prefix + key + ' debe estar entre ' + min + ' y ' + max + '.');
    }
    if (e.minAge > e.maxAge) errors.push(prefix + 'la edad inicial supera a la final.');
    if (e.influenceAttribute !== undefined && !['overall', ...Object.keys(ATTRIBUTES)].includes(e.influenceAttribute)) errors.push(prefix + 'atributo de probabilidad no válido.');
    if (e.category === 'retirement' && (e.minAge < RETIREMENT_AGE || !['all', 'senior'].includes(e.stage))) errors.push(prefix + 'la retirada solo es posible en senior desde los 30 años.');
    for (const effects of [e.success, e.failure]) {
      if (!effects || typeof effects !== 'object' || Array.isArray(effects) || Object.entries(effects).some(([key, value]) => !EFFECT_FIELDS[key] || !integer(value, EFFECT_FIELDS[key].min, EFFECT_FIELDS[key].max))) errors.push(prefix + 'revisa los efectos y sus límites.');
    }
  });
  return errors;
}

// Read-only adaptation for an older published catalogue. Nothing is overwritten
// until an administrator reviews and explicitly publishes the v2 configuration.
export function upgradeConfig(config) {
  if (config?.version !== 1) return config;
  if (!Array.isArray(config.events)) return config;
  const convertEffects = (effects = {}) => ({
    overall: Math.round(['shooting', 'defense', 'playmaking', 'fitness'].reduce((sum, key) => sum + (Number(effects[key]) || 0), 0) / 4),
  });
  return {
    version: 2,
    settings: { ...DEFAULT_CAREER_SETTINGS, difficulty: config.settings?.difficulty ?? 50 },
    events: config.events.map((event) => {
      const choice = event.choices?.[0] || {};
      return {
        ...newCareerEvent(event.id), title: event.title, description: event.description,
        enabled: event.enabled, weight: event.weight, team: event.team, position: event.position,
        category: event.category === 'court' ? 'court' : event.category === 'training' ? 'development' : 'community',
        chance: choice.chance ?? 65, acceptLabel: choice.label || 'Aceptar el reto',
        successText: choice.successText || 'El reto sale bien.', failureText: choice.failureText || 'El reto no sale bien.',
        success: convertEffects(choice.success), failure: convertEffects(choice.failure),
      };
    }),
  };
}

export function eligibleEvents(events, career) {
  // One mixed team: historical event.team filters no longer affect eligibility.
  return events.filter((event) => {
    const seen = career.appearances[event.id];
    return event.enabled && event.weight > 0 && career.age >= event.minAge && career.age <= event.maxAge &&
      (event.category !== 'retirement' || career.age >= RETIREMENT_AGE) &&
      (!event.clubId || event.clubId === 'all' || event.clubId === career.currentClub?.id) &&
      (event.category !== 'transfer' || (career.age >= 18 && clubsFor(career).some((club) => club.id === event.targetClubId && career.overall >= minimumOverallForClub(club)) && event.targetClubId !== career.currentClub?.id)) &&
      (event.stage === 'all' || event.stage === categoryForAge(career.age)) &&
      (event.position === 'all' || event.position === career.profile.position) &&
      career.injuries >= event.minInjuries &&
      (!seen || (seen.count < event.maxOccurrences && career.age - seen.age > event.cooldown));
  });
}

export function selectEvent(events, career, rng = Math.random) {
  const eligible = eligibleEvents(events, career);
  let ticket = draw(rng) * eligible.reduce((sum, event) => sum + eventAppearanceWeight(event, career), 0);
  for (const event of eligible) {
    ticket -= eventAppearanceWeight(event, career);
    if (ticket < 0) return structuredClone(event);
  }
  return structuredClone(ROUTINE_EVENT);
}

export function eventAppearanceWeight(event, career) {
  // Only injury-related retirement offers gain weight. They still have to pass
  // the age, previous-injury, cooldown and occurrence filters above.
  const injuryRetirement = event.category === 'retirement' && event.minInjuries > 0 && career.age >= RETIREMENT_AGE;
  return event.weight * (injuryRetirement ? 1 + Math.min(2, Math.max(0, career.injuries - event.minInjuries) * 0.25) : 1);
}

function openSeason(career, events, rng) {
  const event = selectEvent(events, career, rng);
  if (event.category === 'transfer') event.transferClub = structuredClone(clubsFor(career).find((club) => club.id === event.targetClubId));
  event.scene = resolvePresentation(event, career);
  const seen = career.appearances[event.id];
  return {
    ...career, phase: 'event', pendingEvent: event, lastResult: null,
    appearances: { ...career.appearances, [event.id]: { count: (seen?.count || 0) + 1, age: career.age } },
  };
}

export function createCareer(profile, config = DEFAULT_CAREER_CONFIG, rng = Math.random) {
  const gender = narrativeGender(profile);
  if (!profile || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.trim().length > 30 || !integer(profile.number, 0, 99) || !POSITIONS.includes(profile.position) || !ARCHETYPES[profile.archetype] || !['masculino', 'femenino'].includes(gender)) throw new Error('Revisa nombre, dorsal, posición y género para los mensajes.');
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors[0]);
  return openSeason({
    version: 4, profile: { name: profile.name.trim(), number: profile.number, position: profile.position, archetype: profile.archetype, gender }, age: START_AGE,
    overall: 40, overallExact: 40, development: rollDevelopment(rng),
    attributes: initialAttributes(profile),
    peakOverall: 40, injuries: 0, currentClub: structuredClone(clubsFor(config).find((club) => club.id === STARTING_CLUB.id)),
    clubs: structuredClone(clubsFor(config)),
    settings: { ...DEFAULT_CAREER_SETTINGS, ...config.settings }, seasons: [], appearances: {},
    retirementAge: null, retirementReason: '',
  }, config.events, rng);
}

const totalFields = ['points', 'rebounds', 'assists', 'steals', 'blocks'];
const perGame = (total, games) => games ? Math.round(total / games * 10) / 10 : 0;

function simulateStats(career, overall, attributes, effects, rng, retiring) {
  const scheduled = career.settings.gamesPerSeason;
  const availableGames = retiring ? 0 : Math.max(0, scheduled - (effects.gamesMissed || 0));
  const minutesPerGame = availableGames ? seasonMinutesFor(career.age, overall, career.currentClub, draw(rng)) : 0;
  const games = minutesPerGame > 0 ? availableGames : 0;
  const rates = performanceRates(attributes, career.profile.position, draw(rng));
  const totals = Object.fromEntries(totalFields.map((key) => [key, games ? Math.max(0, Math.round(rates[key] * games * minutesPerGame / 24) + (effects[key] || 0)) : 0]));
  const winningShots = Math.min(effects.winningShots || 0, games);
  const league = retiring ? { wins: 0, losses: 0, leagueChance: null, leagueTier: null, leagueChampion: false }
    : simulateMunicipalLeague(career.currentClub, overall, scheduled, career.settings.difficulty, winningShots, rng);
  return {
    games, scheduled: retiring ? 0 : scheduled, gamesMissed: retiring ? 0 : scheduled - availableGames,
    gamesBenched: availableGames - games,
    minutesPerGame, totals, averages: Object.fromEntries(totalFields.map((key) => [key, perGame(totals[key], games)])),
    ...league, winningShots, role: seasonRoleFor(games, minutesPerGame),
  };
}

function seasonAwards(stats, overall, attributes, age, eventAward, rng) {
  const collectiveAwards = stats.leagueChampion ? ['Campeonato de liga municipal'] : [];
  if (!stats.games) return { individualAwards: [], collectiveAwards };
  const division = STAGES[categoryForAge(age)];
  const individualAwards = eventAward ? [eventAward] : [];
  if (isMvpSeason(stats, overall) && draw(rng) < .35) individualAwards.push('MVP de la temporada · ' + division);
  if (stats.averages.points >= 20 && draw(rng) < .4) individualAwards.push('Máximo anotador · ' + division);
  if (overall >= 65 && draw(rng) < .45) individualAwards.push('Quinteto ideal · ' + division);
  if (stats.averages.assists >= 6 && draw(rng) < .4) individualAwards.push('Líder en asistencias · ' + division);
  individualAwards.push(...additionalIndividualAwards(stats, overall, attributes, rng).map((award) => award + ' · ' + division));
  return { individualAwards: [...new Set(individualAwards)], collectiveAwards };
}

export function resolveSeason(career, accepted, rng = Math.random) {
  if (career.phase !== 'event' || !career.pendingEvent || typeof accepted !== 'boolean') throw new Error('Esta temporada ya está resuelta.');
  const event = career.pendingEvent;
  const destination = event.category === 'transfer' ? transferClubFor(event, career) : null;
  if (event.category === 'transfer' && (!destination || destination.id === career.currentClub.id || career.age < 18 || career.overall < minimumOverallForClub(destination))) throw new Error('La oferta de fichaje no es válida para tu club, edad o media actual.');
  const chance = chanceFor(event, career);
  const success = accepted ? draw(rng) * 100 < chance : null;
  const effects = accepted ? { ...(success ? event.success : event.failure) } : {};
  const retiring = accepted && success && event.category === 'retirement' && career.age >= RETIREMENT_AGE;
  const transfer = accepted && success && destination
    ? { from: structuredClone(career.currentClub), to: structuredClone(destination) } : null;
  // A successful offer is signed before this year's games. Older rows are snapshots.
  const currentClub = transfer ? structuredClone(transfer.to) : career.currentClub;
  // An already-open local v2 game can adopt the new model once without losing
  // its history. New games draw these traits only during createCareer.
  const development = career.development ?? rollDevelopment(rng);
  const startingAttributes = attributesForCareer(career);
  const startingOverallExact = overallFromAttributes(startingAttributes, career.profile.position);
  const health = resolveSeasonHealth(career, effects, rng, retiring);
  const seasonalEffects = { ...effects, gamesMissed: health.gamesMissed };
  const evolution = retiring ? { overallExact: startingOverallExact, changeExact: 0, healthAffected: false }
    : naturalDevelopment({ ...career, overallExact: startingOverallExact }, development, health.gamesMissed, rng, effects.evolutionPct || 0);
  const evolvedAttributes = shiftAttributes(startingAttributes, evolution.changeExact);
  const evolvedExact = overallFromAttributes(evolvedAttributes, career.profile.position);
  const evolved = Math.round(evolvedExact);
  const attributes = retiring ? { ...startingAttributes } : applyAttributeEffects(evolvedAttributes, effects);
  const overallExact = overallFromAttributes(attributes, career.profile.position);
  const overall = Math.round(overallExact);
  const stats = simulateStats({ ...career, currentClub }, overall, attributes, retiring ? {} : seasonalEffects, rng, retiring);
  const eventAward = accepted ? (success ? event.successAward : event.failureAward) : '';
  const awards = retiring ? { individualAwards: [], collectiveAwards: [] } : seasonAwards(stats, overall, attributes, career.age, eventAward, rng);
  const cup = simulateInterdistricts(!retiring && stats.leagueChampion, overall, career.settings, rng);
  if (cup.interdistrictsChampion) awards.collectiveAwards.push('Copa Interdistritos');
  const summary = {
    age: career.age, season: career.age - START_AGE + 1, category: categoryForAge(career.age),
    club: structuredClone(currentClub), overall, startingOverall: career.overall,
    naturalChange: evolved - career.overall, eventOverallChange: overall - evolved,
    startingOverallExact, overallExact, naturalChangeExact: Math.round((evolvedExact - startingOverallExact) * 100) / 100,
    eventOverallChangeExact: Math.round((overallExact - evolvedExact) * 100) / 100,
    startingAttributes: { ...startingAttributes }, attributes: { ...attributes },
    evolutionPct: retiring ? 0 : effects.evolutionPct || 0,
    injuryChance: health.injuryChance, randomInjury: health.randomInjury, injuryCheckSkipped: health.injuryCheckSkipped,
    healthAffected: evolution.healthAffected,
    ...stats, ...awards, ...cup,
    injuries: health.injuries,
    event: { id: event.id, title: event.title, scene: structuredClone(sceneForEvent(event, career)), accepted, success, chance, effects: retiring ? {} : effects, text: accepted ? (success ? event.successText : event.failureText) : event.declineText },
    retired: retiring, ...(event.category === 'transfer' ? { transfer, transferOffer: structuredClone(destination) } : {}),
  };
  return {
    ...career, version: 4, currentClub, development, attributes, overall, overallExact, peakOverall: Math.max(career.peakOverall, overall),
    injuries: career.injuries + summary.injuries,
    seasons: [...career.seasons, summary], pendingEvent: null, lastResult: summary,
    phase: retiring ? 'retired' : 'result',
    retirementAge: retiring ? career.age : null, retirementReason: retiring ? event.title : '',
  };
}

export function advanceCareer(career, events, rng = Math.random) {
  if (career.phase !== 'result') throw new Error('Termina primero la temporada actual.');
  if (career.age === LAST_AGE) return { ...career, phase: 'retired', retirementAge: LAST_AGE, retirementReason: 'Despedida a los 40 años' };
  return openSeason({ ...career, age: career.age + 1 }, events, rng);
}

export function careerSummary(career) {
  const played = career.seasons.filter((season) => season.games > 0);
  const games = played.reduce((sum, season) => sum + season.games, 0);
  const totals = Object.fromEntries(totalFields.map((key) => [key, played.reduce((sum, season) => sum + season.totals[key], 0)]));
  const clubs = [];
  for (const season of career.seasons) {
    const previous = clubs.at(-1);
    if (previous?.id === season.club.id) { previous.toAge = season.age; previous.seasons += season.games > 0 ? 1 : 0; }
    else clubs.push({ ...season.club, fromAge: season.age, toAge: season.age, seasons: season.games > 0 ? 1 : 0 });
  }
  return {
    games, totals, seasonsPlayed: played.length, clubs, peakOverall: career.peakOverall,
    averages: Object.fromEntries(totalFields.map((key) => [key, perGame(totals[key], games)])),
    individualAwards: career.seasons.flatMap((season) => season.individualAwards.map((title) => ({ title, age: season.age, club: season.club.name }))),
    collectiveAwards: career.seasons.flatMap((season) => season.collectiveAwards.map((title) => ({ title, age: season.age, club: season.club.name }))),
    winningShots: career.seasons.reduce((sum, season) => sum + season.winningShots, 0),
  };
}
