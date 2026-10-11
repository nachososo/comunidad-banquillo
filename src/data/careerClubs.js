import { validateLeagueChances } from '../utils/careerLeague.js';

export const CLUB_TIERS = {
  1: { label: 'Zona baja', minOverall: 0 },
  2: { label: 'Mitad de tabla', minOverall: 70 },
  3: { label: 'Puestos altos', minOverall: 80 },
  4: { label: 'Candidato al título', minOverall: 87 },
};
export const minimumOverallForClub = (club) => club?.minOverall ?? CLUB_TIERS[club?.tier ?? 1]?.minOverall ?? 0;

export const STARTING_CLUB = {
  id: 'cdb', name: 'La Comunidad del Banquillo', groupName: '*Comunidad del Banquillo*',
  logo: '/img/career-group-logo.png', contactName: 'Coordinación del Banquillo', members: [],
};
export const BLUE_DEVILS = {
  id: 'blue-devils', name: 'Blue Devils', groupName: 'Blue Devils', tier: 4,
  logo: '/img/blue-devils.png', contactName: 'Coordinación de Blue Devils', members: [],
};
export const CATACROCKERS = {
  id: 'catacrockers', name: 'Catacrockers', groupName: 'Catacrockers', tier: 1,
  logo: '/img/catacrockers.png', contactName: 'Coordinación de Catacrockers', members: [],
};
export const GMADRID = {
  id: 'gmadrid', name: 'GMadrid', groupName: 'GMadrid', tier: 4,
  logo: '/img/gmadrid.png', contactName: 'Coordinación de GMadrid', members: [],
};
export const RAMONES = {
  id: 'ramones', name: 'Ramones', groupName: 'Ramones', tier: 2,
  logo: '/img/ramones.png', contactName: 'Coordinación de Ramones', members: [],
};
export const OLIMPICO_ALCOBENDAS = {
  id: 'olimpico-alcobendas', name: 'Olímpico Alcobendas', groupName: 'Olímpico Alcobendas', tier: 3,
  logo: '/img/olimpico-alcobendas.png', contactName: 'Coordinación de Olímpico Alcobendas', members: [],
};

export const MIYAMA = {
  id: 'miyama', name: 'Miyama', groupName: 'Miyama', tier: 4,
  logo: '/img/miyama.png', contactName: 'Coordinación de Miyama', members: [],
};

export const PRUSIA = {
  id: 'prusia', name: 'Prusia', groupName: 'Prusia', tier: 3,
  logo: '/img/prusia.png', contactName: 'Coordinación de Prusia', members: [],
};

export const PANZER = {
  id: 'panzer', name: 'Panzer', groupName: 'Panzer', tier: 3,
  logo: '/img/panzer.png', contactName: 'Coordinación de Panzer', members: [],
};

export const VIPERS = {
  id: 'vipers', name: 'Vipers', groupName: 'Vipers', tier: 1,
  logo: '/img/vipers.png', contactName: 'Coordinación de Vipers', members: [],
};

export const WHITE_AIR = {
  id: 'white-air', name: 'White Air', groupName: 'White Air', tier: 2,
  logo: '/img/white-air.png', contactName: 'Coordinación de White Air', members: [],
};

export const LOS_ABUELOS_DOMINICANOS = {
  id: 'los-abuelos-dominicanos', name: 'Los Abuelos Dominicanos', groupName: 'Los Abuelos Dominicanos', tier: 1,
  logo: '/img/los-abuelos-dominicanos.png', contactName: 'Coordinación de Los Abuelos Dominicanos', members: [],
};

export const DOS_METROS_DIEZ = {
  id: '2metros10', name: '2metros10', groupName: '2metros10', tier: 3,
  logo: '/img/2metros10.png', contactName: 'Coordinación de 2metros10', members: [],
};

export const clubsFor = (config) => config?.clubs === undefined ? [STARTING_CLUB] : config.clubs;
export const clubIdentity = (club = STARTING_CLUB) => ({
  ...(club.id === STARTING_CLUB.id ? STARTING_CLUB : { logo: '', contactName: 'Coordinación deportiva', members: [] }),
  ...club, groupName: club.groupName || (club.id === STARTING_CLUB.id ? STARTING_CLUB.groupName : club.name),
});

// Local assets or embedded raster images only. No tracking URLs, SVG or scripts.
export const MAX_CLUB_LOGO_BYTES = 200 * 1024;
export const validClubLogo = (logo) => typeof logo === 'string' && (logo === '' ||
  logo.length <= 300 && /^\/img\/[a-zA-Z0-9_./ -]+\.(png|jpe?g|webp)$/i.test(logo) && !logo.includes('..') ||
  logo.length <= Math.ceil(MAX_CLUB_LOGO_BYTES * 4 / 3) + 40 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo));

export function validateClubs(clubs) {
  if (!Array.isArray(clubs) || !clubs.length || clubs.length > 50) return ['Define entre 1 y 50 clubes.'];
  const errors = [], ids = new Set();
  for (const club of clubs) {
    if (!club || typeof club !== 'object' || Array.isArray(club)) { errors.push('Club no válido.'); continue; }
    if (typeof club.id !== 'string' || !club.id.trim() || club.id.length > 100 || ids.has(club.id)) errors.push('Identificador de club vacío o repetido.');
    ids.add(club.id);
    if (club.tier !== undefined && (!Number.isInteger(club.tier) || !Object.hasOwn(CLUB_TIERS, club.tier))) errors.push('Tier del club: elige un valor del 1 al 4.');
    if (club.minOverall !== undefined && club.minOverall !== null && (!Number.isInteger(club.minOverall) || club.minOverall < 0 || club.minOverall > 100)) errors.push('Media mínima del club: entero entre 0 y 100, o usa el mínimo del tier.');
    errors.push(...validateLeagueChances(club));
    for (const key of ['name', 'groupName', 'contactName']) if (typeof club[key] !== 'string' || !club[key].trim() || club[key].length > 80) errors.push('Club: completa ' + key + ' (máximo 80 caracteres).');
    if (!validClubLogo(club.logo)) errors.push('Logo: usa una imagen local PNG, JPG o WebP de hasta 200 KB.');
    if (!Array.isArray(club.members) || club.members.length > 40 || club.members.some((name) => typeof name !== 'string' || !name.trim() || name.length > 80)) errors.push('Plantilla del club: hasta 40 nombres de 80 caracteres.');
  }
  if (!ids.has(STARTING_CLUB.id)) errors.push('Conserva la Comunidad del Banquillo como club inicial.');
  return errors;
}

export const transferClubFor = (event, career = {}) => event.transferClub || clubsFor(career).find((club) => club.id === event.targetClubId);
