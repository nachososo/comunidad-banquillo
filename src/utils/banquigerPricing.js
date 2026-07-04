export const BANQUIGER_ELITE_COUNT = 3;
export const BANQUIGER_MIN_PRICE = 0.4;

export const applyBanquigerPricing = (players = []) => {
  const rankedIds = [...players]
    .sort((first, second) => second.avgValuation - first.avgValuation)
    .map((player) => String(player.id));
  const eliteIds = new Set(rankedIds.slice(0, Math.min(BANQUIGER_ELITE_COUNT, players.length)));

  return players.map((player) => {
    const rank = rankedIds.indexOf(String(player.id));
    const elite = eliteIds.has(String(player.id));
    const price = elite
      ? 1.6 - rank * 0.1
      : Math.max(BANQUIGER_MIN_PRICE, Math.min(1.1, 0.4 + Math.max(0, player.avgValuation) * 0.045));

    return {
      ...player,
      price: Number(price.toFixed(1)),
      priceTier: elite ? 'elite' : price >= 0.8 ? 'premium' : 'standard',
    };
  });
};
