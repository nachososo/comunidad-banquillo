export const isCompatibleWithPosition = (player, position) => player.position === position;

export const getRandomDraftOptions = ({ players, position, selectedIds = [], selectedPersonIds = [], limit = 3 }) => {
  const compatiblePlayers = players.filter(
    (player) =>
      player.draftEligible !== false &&
      !selectedIds.includes(player.id) &&
      !selectedPersonIds.includes(player.personId || player.id) &&
      isCompatibleWithPosition(player, position),
  );

  return [...compatiblePlayers].sort(() => Math.random() - 0.5).slice(0, limit);
};
