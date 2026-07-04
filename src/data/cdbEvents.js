const average = (team, stat) => team.reduce((total, player) => total + player.stats[stat], 0) / team.length;
const clampEvent = (value) => Math.max(-3, Math.min(3, Math.round(value)));

export const eventStatOptions = [
  ['attack', 'Ataque'],
  ['defense', 'Defensa'],
  ['rebound', 'Rebote'],
  ['playmaking', 'Dirección'],
  ['threePoint', 'Triple'],
  ['physical', 'Físico'],
  ['leadership', 'Liderazgo'],
  ['clutch', 'Clutch'],
];

export const buildEventEffect = (event) => (team) => {
  const stats = Array.isArray(event.stats) && event.stats.length ? event.stats : ['leadership'];
  const total = stats.reduce((sum, stat) => sum + average(team, stat), 0);
  const target = Number(event.target) || stats.length * 75;
  const divisor = Number(event.divisor) || 6;
  const modifier = clampEvent((total - target) / divisor);

  return {
    modifier,
    result:
      modifier >= 0
        ? `+${modifier} ${event.positiveResult || 'por responder bien al contexto.'}`
        : `${modifier} ${event.negativeResult || 'porque el contexto castigó al quinteto.'}`,
  };
};

export const baseCdbEvents = [
  {
    id: 'unai-fuenlabrada-referee',
    name: 'Viejas cuentas en Fuenlabrada',
    description: 'El árbitro conoce a Unai de antes y el partido amenaza con calentarse.',
    stats: ['leadership', 'clutch'],
    target: 150,
    divisor: 6,
    positiveResult: 'porque Unai mantuvo la cabeza fría ante la provocación.',
    negativeResult: 'porque dos técnicas seguidas terminaron con Unai expulsado.',
    requiredPlayerIds: ['unai-suarez'],
    requirementMode: 'all',
    chance: 25,
  },
  {
    id: 'early-game',
    name: 'Partido a las 9:00 de la mañana',
    description: 'El equipo empieza dormido. Se valora físico y liderazgo.',
    stats: ['physical', 'leadership'],
    target: 160,
    divisor: 8,
    positiveResult: 'gracias al físico y liderazgo del equipo.',
    negativeResult: 'porque el quinteto tardó en despertarse.',
  },
  {
    id: 'zone-defense',
    name: 'El rival se encierra en zona',
    description: 'Necesitas tiro exterior para abrir la defensa.',
    stats: ['threePoint'],
    target: 72,
    divisor: 5,
    positiveResult: 'por castigar la zona desde fuera.',
    negativeResult: 'por falta de tiro exterior constante.',
  },
  {
    id: 'barajas-clutch',
    name: 'Final igualado en Barajas',
    description: 'La última posesión decide el partido.',
    stats: ['clutch'],
    target: 74,
    divisor: 5,
    positiveResult: 'por sangre fría en el cierre.',
    negativeResult: 'por sufrir en el final.',
  },
  {
    id: 'physical-game',
    name: 'Partido muy físico',
    description: 'Hoy gana quien cierre el rebote.',
    stats: ['rebound', 'physical'],
    target: 154,
    divisor: 8,
    positiveResult: 'por dominar el rebote y el contacto.',
    negativeResult: 'porque faltó presencia cerca del aro.',
  },
  {
    id: 'loose-referee',
    name: 'El árbitro permite mucho contacto',
    description: 'Se valora defensa, físico y cabeza fría.',
    stats: ['defense', 'physical', 'leadership'],
    target: 235,
    divisor: 10,
    positiveResult: 'por competir duro sin perder la cabeza.',
    negativeResult: 'porque el partido se volvió demasiado áspero.',
  },
  {
    id: 'hot-shooting',
    name: 'Día inspirado desde el triple',
    description: 'El equipo se calienta desde fuera.',
    stats: ['threePoint'],
    target: 70,
    divisor: 6,
    positiveResult: 'por racha exterior.',
    negativeResult: 'porque el aro se hizo pequeño.',
  },
  {
    id: 'third-quarter-slump',
    name: 'Pájara en el tercer cuarto',
    description: 'El equipo necesita liderazgo para sobrevivir al parcial rival.',
    stats: ['leadership'],
    target: 76,
    divisor: 5,
    positiveResult: 'por ordenar el caos.',
    negativeResult: 'por una desconexión peligrosa.',
  },
];

export const cdbEvents = baseCdbEvents.map((event) => ({
  ...event,
  effect: buildEventEffect(event),
}));

export const getRandomSeasonEvents = (events = cdbEvents, team = []) => {
  const count = 3;
  const teamVersionIds = new Set(team.map((player) => player.id));
  const teamPersonIds = new Set(team.map((player) => player.personId || player.id));
  return [...events]
    .filter((event) => {
      const requiredIds = Array.isArray(event.requiredPlayerIds) ? event.requiredPlayerIds : [];
      if (!requiredIds.length) return true;
      const selectedIds = event.playerRequirementScope === 'version' ? teamVersionIds : teamPersonIds;
      return event.requirementMode === 'any'
        ? requiredIds.some((id) => selectedIds.has(id))
        : requiredIds.every((id) => selectedIds.has(id));
    })
    .filter((event) => {
      const chance = Number.isFinite(Number(event.chance)) ? Number(event.chance) : 100;
      return Math.random() * 100 < Math.max(0, Math.min(100, chance));
    })
    .map((event) => ({
      ...event,
      effect: typeof event.effect === 'function' ? event.effect : buildEventEffect(event),
    }))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
};
