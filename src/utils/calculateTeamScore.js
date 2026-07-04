const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value * 10) / 10;
const average = (team, stat) => team.reduce((total, player) => total + player.stats[stat], 0) / team.length;
const hasTag = (player, tag) => Array.isArray(player.tags) && player.tags.includes(tag);
const countTag = (team, tag) => team.filter((player) => hasTag(player, tag)).length;

const getMostCommonSeasonCount = (team) => {
  const seasons = team.reduce((map, player) => {
    map.set(player.season, (map.get(player.season) || 0) + 1);
    return map;
  }, new Map());

  return Math.max(...seasons.values());
};

export const getRecordInfo = (totalScore) => {
  if (totalScore >= 95) {
    return {
      record: '18-0',
      title: 'Temporada perfecta',
      description: 'Tu quinteto no dejó ni una rendija. Talento, equilibrio y ADN Banquiller a nivel leyenda.',
    };
  }

  if (totalScore >= 90) {
    return {
      record: '17-1',
      title: 'Casi invencibles',
      description: 'Estuviste a un partido de la temporada perfecta. Mucho talento, buena química y finales muy serios.',
    };
  }

  if (totalScore >= 84) {
    return {
      record: '16-2',
      title: 'Temporadón',
      description: 'Equipo de parte alta, con recursos para casi cualquier noche de liga municipal.',
    };
  }

  if (totalScore >= 78) {
    return {
      record: '15-3',
      title: 'Aspirantes serios',
      description: 'Hay madera de contender. Algún detalle de química o roles separó al equipo del récord perfecto.',
    };
  }

  if (totalScore >= 70) {
    return {
      record: '13-5',
      title: 'Buen equipo',
      description: 'Quinteto competitivo, aunque todavía con huecos que los rivales pueden castigar.',
    };
  }

  if (totalScore >= 60) {
    return {
      record: '10-8',
      title: 'Temporada irregular',
      description: 'Hay talento, pero el equipo alternó noches brillantes con partidos de supervivencia.',
    };
  }

  return {
    record: 'Temporada complicada',
    title: 'Proyecto en construcción',
    description: 'La idea tiene encanto, pero hace falta ajustar roles, defensa y química para pelear la liga.',
  };
};

export const calculateTeamScore = ({
  team,
  selectedEvents = [],
  randomFactor = 0,
  playerChemistryLinks = [],
}) => {
  let attackScore = average(team, 'attack') * 0.55 + average(team, 'threePoint') * 0.25 + average(team, 'playmaking') * 0.2;
  let defenseScore = average(team, 'defense');
  let reboundPhysicalScore = average(team, 'rebound') * 0.55 + average(team, 'physical') * 0.45;
  let chemistryScore = 58 + average(team, 'leadership') * 0.28;
  let clutchScore = average(team, 'clutch');
  const chemistryNotes = [];

  const eventSectionByStat = {
    attack: 'attack',
    threePoint: 'attack',
    playmaking: 'attack',
    defense: 'defense',
    rebound: 'reboundPhysical',
    physical: 'reboundPhysical',
    leadership: 'chemistry',
    clutch: 'clutch',
  };
  const eventSectionLabels = {
    attack: 'Ataque',
    defense: 'Defensa',
    reboundPhysical: 'Rebote/Físico',
    chemistry: 'Química',
    clutch: 'Clutch',
  };

  if (countTag(team, 'Fundador') >= 2) {
    chemistryScore += 5;
    chemistryNotes.push('+5 química por tener al menos 2 Fundador.');
  }

  if (getMostCommonSeasonCount(team) >= 3) {
    chemistryScore += 6;
    chemistryNotes.push('+6 química por juntar 3 jugadores de la misma temporada.');
  }

  if (countTag(team, 'ADN Banquiller') >= 2) {
    chemistryScore += 5;
    chemistryNotes.push('+5 química por ADN Banquiller compartido.');
  }

  if (countTag(team, 'Playmaker') >= 1 && countTag(team, 'Interior') >= 1) {
    attackScore += 4;
    chemistryNotes.push('+4 ataque por conectar Playmaker + Interior.');
  }

  if (countTag(team, 'Tirador') >= 1 && countTag(team, 'Interior') >= 2) {
    attackScore += 4;
    chemistryNotes.push('+4 ataque por tiro exterior con interiores.');
  }

  if (countTag(team, 'Capitán') >= 1 && countTag(team, 'Rookie') >= 1) {
    chemistryScore += 3;
    clutchScore += 1;
    chemistryNotes.push('+3 química por Capitán guiando a Rookie.');
  }

  if (countTag(team, 'Defensor') >= 2) {
    defenseScore += 5;
    chemistryNotes.push('+5 defensa por pareja defensiva.');
  }

  if (countTag(team, 'Clutch') >= 2) {
    clutchScore += 4;
    chemistryNotes.push('+4 clutch por tener dos jugadores de finales calientes.');
  }

  if (countTag(team, 'Playmaker') === 0) {
    chemistryScore -= 8;
    chemistryNotes.push('-8 química por no tener Playmaker.');
  }

  if (countTag(team, 'Interior') === 0) {
    reboundPhysicalScore -= 7;
    chemistryNotes.push('-7 rebote/físico por no tener Interior.');
  }

  if (countTag(team, 'Defensor') === 0) {
    defenseScore -= 6;
    chemistryNotes.push('-6 defensa por no tener Defensor.');
  }

  if (countTag(team, 'Anotador') >= 4) {
    chemistryScore -= 5;
    chemistryNotes.push('-5 química por exceso de anotadores y poco pegamento.');
  }

  if (!team.some((player) => player.stats.leadership >= 80)) {
    chemistryScore -= 5;
    chemistryNotes.push('-5 química por falta de liderazgo alto.');
  }

  const selectedIds = new Set(team.flatMap((player) => [player.id, player.personId || player.id]));
  const playerChemistryResults = (Array.isArray(playerChemistryLinks) ? playerChemistryLinks : [])
    .filter(
      (link) =>
        Array.isArray(link.playerIds) &&
        link.playerIds.length >= 2 &&
        link.playerIds.every((playerId) => selectedIds.has(playerId)),
    )
    .map((link) => ({
      id: link.id,
      name: link.name,
      description: link.description,
      playerIds: link.playerIds,
      modifier: Math.max(1, Math.min(4, link.playerIds.length - 1)),
    }));
  const playerChemistryModifier = playerChemistryResults.reduce(
    (total, link) => total + link.modifier,
    0,
  );

  if (playerChemistryModifier) {
    playerChemistryResults.forEach((link) => {
      chemistryNotes.push(
        `+${link.modifier} conexión especial: ${link.name}.`,
      );
    });
  }

  const eventResults = selectedEvents.map((event) => {
    const outcome = event.effect(team);
    const affectedSections = Array.from(new Set(
      (Array.isArray(event.stats) ? event.stats : []).map((stat) => eventSectionByStat[stat]).filter(Boolean),
    ));
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      stats: event.stats,
      affectedSections,
      affectedSectionLabels: affectedSections.map((section) => eventSectionLabels[section]),
      guaranteedByCoach: event.guaranteedByCoach === true,
      modifier: outcome.modifier,
      result: outcome.result,
    };
  });
  const eventSectionModifiers = eventResults.reduce((modifiers, event) => {
    event.affectedSections.forEach((section) => {
      modifiers[section] += event.modifier;
    });
    return modifiers;
  }, { attack: 0, defense: 0, reboundPhysical: 0, chemistry: 0, clutch: 0 });

  attackScore += eventSectionModifiers.attack;
  defenseScore += eventSectionModifiers.defense;
  reboundPhysicalScore += eventSectionModifiers.reboundPhysical;
  chemistryScore += eventSectionModifiers.chemistry;
  clutchScore += eventSectionModifiers.clutch;

  attackScore = clamp(attackScore);
  defenseScore = clamp(defenseScore);
  reboundPhysicalScore = clamp(reboundPhysicalScore);
  chemistryScore = clamp(chemistryScore);
  clutchScore = clamp(clutchScore);
  const clutchEventScore = clamp(clutchScore + randomFactor);

  const totalBeforeLuck =
    attackScore * 0.25 +
    defenseScore * 0.25 +
    reboundPhysicalScore * 0.2 +
    chemistryScore * 0.2 +
    clutchEventScore * 0.1;
  const totalScore = clamp(totalBeforeLuck + randomFactor + playerChemistryModifier);
  const sortedForMvp = [...team].sort((first, second) => {
    const firstScore =
      first.stats.attack + first.stats.defense + first.stats.rebound + first.stats.playmaking + first.stats.clutch;
    const secondScore =
      second.stats.attack + second.stats.defense + second.stats.rebound + second.stats.playmaking + second.stats.clutch;
    return secondScore - firstScore;
  });
  const sortedForKey = [...team].sort((first, second) => {
    const firstScore = first.stats.leadership + first.stats.playmaking + first.stats.defense + (hasTag(first, 'ADN Banquiller') ? 10 : 0);
    const secondScore =
      second.stats.leadership + second.stats.playmaking + second.stats.defense + (hasTag(second, 'ADN Banquiller') ? 10 : 0);
    return secondScore - firstScore;
  });

  return {
    scores: {
      attackScore: round(attackScore),
      defenseScore: round(defenseScore),
      reboundPhysicalScore: round(reboundPhysicalScore),
      playmakingScore: round(average(team, 'playmaking')),
      chemistryScore: round(chemistryScore),
      clutchScore: round(clutchScore),
      clutchEventScore: round(clutchEventScore),
      totalScore: round(totalScore),
      adnScore: round(clamp(chemistryScore + countTag(team, 'ADN Banquiller') * 2)),
    },
    recordInfo: getRecordInfo(totalScore),
    eventResults,
    eventSectionModifiers,
    playerChemistryResults,
    chemistryNotes,
    mvp: sortedForMvp[0],
    keyPlayer: sortedForKey.find((player) => player.id !== sortedForMvp[0].id) || sortedForKey[0],
    randomFactor,
  };
};
