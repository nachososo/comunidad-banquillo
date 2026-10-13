export const BANQUIGER_POSITIONS = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
export const DEFAULT_SECONDARY_POSITION = {
  Base: 'Escolta', Escolta: 'Base', Alero: 'Escolta', 'Ala-Pívot': 'Pívot', 'Pívot': 'Ala-Pívot',
};
export const getBanquigerPositions = (player) => {
  const primary = BANQUIGER_POSITIONS.includes(player.position) ? player.position : 'Alero';
  const secondary = player.positionsVersion === 2 || Array.isArray(player.secondaryPositions)
    ? player.secondaryPositions || [] : [DEFAULT_SECONDARY_POSITION[primary]];
  return [primary, ...secondary.filter(position => BANQUIGER_POSITIONS.includes(position) && position !== primary).slice(0, 1)];
};
export const formatBanquigerPositions = player => getBanquigerPositions(player).join(' / ');

// Search a maximum matching, rather than greedily reserving a versatile player.
// Prefer primary positions, then earlier selections in each slot. JS and SQL use
// the same comparison, so starters, scoring and power eligibility agree.
export const buildBanquigerLineup = (players) => {
  let best = { filled: -1, secondary: Infinity, choices: [], slots: [] };
  const visit = (slot, used, slots, choices, filled, secondary) => {
    if (slot === BANQUIGER_POSITIONS.length) {
      const earlier = choices.some((choice, index) => choice !== best.choices[index] && choices.slice(0, index).every((value, i) => value === best.choices[i]) && choice < best.choices[index]);
      if (filled > best.filled || (filled === best.filled && (secondary < best.secondary || (secondary === best.secondary && earlier)))) best = { filled, secondary, choices, slots };
      return;
    }
    const position = BANQUIGER_POSITIONS[slot];
    players.forEach((player, index) => {
      if (used.has(index) || !getBanquigerPositions(player).includes(position)) return;
      visit(slot + 1, new Set([...used, index]), [...slots, index], [...choices, index], filled + 1, secondary + (player.position === position ? 0 : 1));
    });
    visit(slot + 1, used, [...slots, -1], [...choices, 999], filled, secondary);
  };
  visit(0, new Set(), [], [], 0, 0);
  const starterIndexes = new Set(best.slots.filter(index => index >= 0));
  const startersByPosition = Object.fromEntries(BANQUIGER_POSITIONS.map((position, slot) => [position, best.slots[slot] >= 0 ? { ...players[best.slots[slot]], lineupPosition: position } : null]));
  return {
    startersByPosition,
    starterPlayers: BANQUIGER_POSITIONS.map(position => startersByPosition[position]).filter(Boolean),
    benchPlayers: players.filter((_, index) => !starterIndexes.has(index)),
  };
};
export const canAddBanquigerPlayer = (players, player) => {
  const before = buildBanquigerLineup(players).starterPlayers.length;
  return before === 5 || buildBanquigerLineup([...players, player]).starterPlayers.length > before;
};
