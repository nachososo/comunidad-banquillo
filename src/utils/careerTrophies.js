export const CAREER_TROPHIES = {
  league: { label: 'Liga municipal', image: '/img/trophies/league-v2.png' },
  interdistricts: { label: 'Copa Interdistritos', image: '/img/trophies/interdistricts-v1.png' },
  mvp: { label: 'MVP de la temporada', image: '/img/trophies/mvp-v2.png' },
  scorer: { label: 'Máximo anotador', image: '/img/trophies/scorer-v2.png' },
  five: { label: 'Quinteto ideal', image: '/img/trophies/five-v2.png' },
  assists: { label: 'Líder en asistencias', image: '/img/trophies/assists-v2.png' },
  rebounder: { label: 'Máximo reboteador', image: '/img/trophies/rebounder-v1.png' },
  defender: { label: 'Mejor defensor', image: '/img/trophies/defender-v1.png' },
  sixth: { label: 'Sexto hombre', image: '/img/trophies/sixth-v1.png' },
  special: { label: 'Premio especial', image: '/img/trophies/special-v2.png' },
};

export function trophyTypeFor(title, category) {
  if (category === 'collective' && (title === 'Campeonato de liga municipal' || title.startsWith('Campeonato de liga · '))) return 'league';
  if (category === 'collective' && title === 'Copa Interdistritos') return 'interdistricts';
  if (category === 'individual') {
    for (const type of ['mvp', 'scorer', 'five', 'assists', 'rebounder', 'defender', 'sixth']) {
      const label = CAREER_TROPHIES[type].label;
      if (title === label || title.startsWith(label + ' · ')) return type;
    }
  }
  return 'special';
}

// Presentation only: do not award trophies or mutate the career's history.
export function groupCareerTrophies(awards, category) {
  const groups = new Map();
  for (const award of awards) {
    const type = trophyTypeFor(award.title, category);
    const key = type === 'special' ? 'special:' + award.title : type;
    if (!groups.has(key)) groups.set(key, { key, type, ...CAREER_TROPHIES[type], label: type === 'special' ? award.title : CAREER_TROPHIES[type].label, records: [] });
    groups.get(key).records.push({ ...award });
  }
  return [...groups.values()].map((group) => ({ ...group, count: group.records.length }));
}
