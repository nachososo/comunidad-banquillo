export const slugifyPlayerName = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getPlayerSlug = (player) => {
  if (!player?.id) return '';
  const nameSlug = slugifyPlayerName(player.name || 'jugador');
  return `${nameSlug || 'jugador'}-${player.id}`;
};

export const getPlayerPath = (player) => `/jugador/${getPlayerSlug(player)}`;

export const getPlayerIdFromSlug = (slug = '') => {
  const normalized = String(slug).trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);

  const idMatch = normalized.match(/-(\d+)$/);
  if (idMatch) return Number(idMatch[1]);

  return null;
};
