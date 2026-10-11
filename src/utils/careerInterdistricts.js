export const DEFAULT_INTERDISTRICTS_SETTINGS = Object.freeze({ interdistrictsBaseChance: 1, interdistrictsMaxChance: 12 });

export function interdistrictsRange(settings = {}) {
  return {
    base: settings.interdistrictsBaseChance ?? DEFAULT_INTERDISTRICTS_SETTINGS.interdistrictsBaseChance,
    max: settings.interdistrictsMaxChance ?? DEFAULT_INTERDISTRICTS_SETTINGS.interdistrictsMaxChance,
  };
}

export function validateInterdistrictsSettings(settings) {
  const { base, max } = interdistrictsRange(settings);
  if ([base, max].some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 25)) {
    return ['Copa Interdistritos: los porcentajes deben estar entre 0,01 y 25.'];
  }
  return max <= base ? ['Copa Interdistritos: la probabilidad con media 100 debe superar a la de media 0.'] : [];
}

export function interdistrictsChanceFor(overall, settings = {}) {
  const { base, max } = interdistrictsRange(settings);
  const rating = Math.max(0, Math.min(100, Number(overall) || 0));
  return Math.round((base + (max - base) * rating / 100) * 10000) / 10000;
}

// An end-of-season team competition: no extra age, event, or invented match stats.
// Qualification is determined by this season's league title, not by past honours.
export function simulateInterdistricts(leagueChampion, overall, settings = {}, rng = Math.random) {
  if (!leagueChampion) return { interdistrictsQualified: false, interdistrictsChance: null, interdistrictsChampion: false };
  const interdistrictsChance = interdistrictsChanceFor(overall, settings);
  const roll = Math.max(0, Math.min(0.999999999, Number(rng()) || 0));
  return { interdistrictsQualified: true, interdistrictsChance, interdistrictsChampion: roll * 100 < interdistrictsChance };
}

export function interdistrictsResultText(season) {
  if (!season.interdistrictsQualified) return '';
  return season.interdistrictsChampion
    ? 'Copa Interdistritos: ¡doblete! Liga y Copa para el equipo.'
    : 'Copa Interdistritos: participamos como campeones de liga, pero esta vez no levantamos la copa.';
}
