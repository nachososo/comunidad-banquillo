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
export const buildBanquigerLineup = (players, assignedSlots = null) => {
  if (Array.isArray(assignedSlots)) return lineupFromSlots(players, assignedSlots);
  let best = { filled: -1, offPosition: Infinity, secondary: Infinity, choices: [], slots: [] };
  const visit = (slot, used, slots, choices, filled, offPosition, secondary) => {
    if (slot === BANQUIGER_POSITIONS.length) {
      const earlier = choices.some((choice, index) => choice !== best.choices[index] && choices.slice(0, index).every((value, i) => value === best.choices[i]) && choice < best.choices[index]);
      if (filled > best.filled || (filled === best.filled && (offPosition < best.offPosition || (offPosition === best.offPosition && (secondary < best.secondary || (secondary === best.secondary && earlier)))))) best = { filled, offPosition, secondary, choices, slots };
      return;
    }
    const position = BANQUIGER_POSITIONS[slot];
    players.forEach((player, index) => {
      if (used.has(index)) return;
      visit(slot + 1, new Set([...used, index]), [...slots, index], [...choices, index], filled + 1, offPosition + (getBanquigerPositions(player).includes(position) ? 0 : 1), secondary + (player.position === position ? 0 : 1));
    });
    visit(slot + 1, used, [...slots, -1], [...choices, 999], filled, offPosition, secondary);
  };
  visit(0, new Set(), [], [], 0, 0, 0);
  const starterIndexes = new Set(best.slots.filter(index => index >= 0));
  const slots = best.slots.map(index => index >= 0 ? String(players[index].id) : null);
  slots.push(...players.filter((_, index) => !starterIndexes.has(index)).map(player => String(player.id)));
  return lineupFromSlots(players, slots);
};

export const BANQUIGER_SLOT_LABELS = [...BANQUIGER_POSITIONS, 'Suplente 1', 'Suplente 2'];
export function lineupFromSlots(players, assignedSlots) {
  const byId = new Map(players.map(player => [String(player.id), player]));
  const seen = new Set();
  const slots = Array.from({ length: 7 }, (_, index) => {
    const id = assignedSlots[index] == null ? null : String(assignedSlots[index]);
    if (!byId.has(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
  const startersByPosition = Object.fromEntries(BANQUIGER_POSITIONS.map((position, index) => {
    const player = byId.get(slots[index]);
    return [position, player ? { ...player, lineupPosition: position, inPosition: getBanquigerPositions(player).includes(position) } : null];
  }));
  return {
    slots, startersByPosition,
    starterPlayers: Object.values(startersByPosition).filter(Boolean),
    benchPlayers: slots.slice(5).map(id => byId.get(id) || null),
  };
}

export function reconcileBanquigerSlots(players, assignedSlots) {
  if (!Array.isArray(assignedSlots)) return buildBanquigerLineup(players).slots;
  const slots = lineupFromSlots(players, assignedSlots).slots;
  for (const player of players) {
    if (slots.includes(String(player.id))) continue;
    const eligible = getBanquigerPositions(player);
    const preferred = BANQUIGER_POSITIONS.findIndex((position, index) => !slots[index] && position === player.position);
    const compatible = BANQUIGER_POSITIONS.findIndex((position, index) => !slots[index] && eligible.includes(position));
    const index = preferred >= 0 ? preferred : compatible >= 0 ? compatible : slots.indexOf(null);
    if (index >= 0) slots[index] = String(player.id);
  }
  return slots;
}

export function moveBanquigerPlayer(slots, from, to) {
  if (from === to || from < 0 || from > 6 || to < 0 || to > 6 || !slots[from]) return slots;
  const next = [...slots];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export const canAddBanquigerPlayer = players => players.length < 7;

// Five starters are required; the two reserve places are optional.
export const isBanquigerRosterSizeValid = (ids, maximum = 7) =>
  Array.isArray(ids) && ids.length >= 5 && ids.length <= Math.min(7, maximum) &&
  new Set(ids.map(String)).size === ids.length;
