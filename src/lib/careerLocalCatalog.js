import { BLUE_DEVILS_OFFER, CATACROCKERS_OFFER, GMADRID_OFFER, RAMONES_OFFER, OLIMPICO_ALCOBENDAS_OFFER, MIYAMA_OFFER, PRUSIA_OFFER, PANZER_OFFER, VIPERS_OFFER, WHITE_AIR_OFFER, LOS_ABUELOS_DOMINICANOS_OFFER, DOS_METROS_DIEZ_OFFER, DEFAULT_CAREER_CONFIG } from '../data/careerData.js';
import { BLUE_DEVILS, CATACROCKERS, GMADRID, RAMONES, OLIMPICO_ALCOBENDAS, MIYAMA, PRUSIA, PANZER, VIPERS, WHITE_AIR, LOS_ABUELOS_DOMINICANOS, DOS_METROS_DIEZ, clubsFor } from '../data/careerClubs.js';
import { upgradeConfig, validateConfig } from '../utils/careerEngine.js';
import { defaultPresentation } from '../utils/careerPresentation.js';

export const LOCAL_CAREER_CATALOG_KEY = 'cdb:career-editor:v1';
export const MAX_CATALOG_BYTES = 3 * 1024 * 1024;

export function catalogForExport(config) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.slice(0, 6).join(' '));
  // This format never contains profiles, careers, auth tokens or publish tokens.
  return structuredClone({ version: config.version, settings: config.settings, events: config.events, ...(config.clubs !== undefined ? { clubs: config.clubs } : {}), ...(config.clubPackVersion !== undefined ? { clubPackVersion: config.clubPackVersion } : {}), ...(config.presentationPackVersion !== undefined ? { presentationPackVersion: config.presentationPackVersion } : {}) });
}

// Upgrade only untouched generic staging of known starter events. Custom text,
// senders, posts, locations, scoreboards and explicit non-group formats win.
// The marker lets a later deliberate switch back to plain WhatsApp stay put.
export function includeEventPresentations(config) {
  if ((config.presentationPackVersion ?? 0) >= 1) return config;
  const defaults = defaultPresentation();
  const equal = (a, b) => a === b || (a && b && typeof a === 'object' && typeof b === 'object'
    && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => equal(a[key], b[key])));
  const events = config.events.map((event) => {
    const replacement = DEFAULT_CAREER_CONFIG.events.find((candidate) => candidate.id === event.id);
    if (!replacement || event.category === 'transfer') return event;
    const generic = event.presentation === undefined || Object.entries(event.presentation).every(([key, value]) =>
      (key === 'authorMode' && value === 'team') || (key === 'message' && value === event.description)
      || equal(value, defaults[key]));
    return generic ? { ...event, presentation: structuredClone(replacement.presentation) } : event;
  });
  return events.some((event, index) => event !== config.events[index])
    ? { ...config, events, presentationPackVersion: 1 } : config;
}

// Additive, read-only updates for clubs explicitly supplied by the user.
// Saving the version marker makes later deletions permanent. Never replace an
// existing club/offer, reset custom settings or write storage during a read.
function includeClubPack(config, club, offer, version) {
  if ((config.clubPackVersion ?? 0) >= version) return config;
  const clubs = clubsFor(config);
  const existing = clubs.find((item) => item.id === club.id || item.name.trim().toLocaleLowerCase('es') === club.name.toLocaleLowerCase('es'));
  const destination = existing || club;
  const hasOffer = config.events.some((event) => event.id === offer.id || (event.category === 'transfer' && event.targetClubId === destination.id));
  return catalogForExport({ ...config, clubPackVersion: version,
    clubs: existing ? clubs : [...clubs, club],
    events: hasOffer ? config.events : [...config.events, { ...offer, targetClubId: destination.id }],
  });
}
export const includeBlueDevils = (config) => includeClubPack(config, BLUE_DEVILS, BLUE_DEVILS_OFFER, 1);
export const includeCatacrockers = (config) => includeClubPack(includeBlueDevils(config), CATACROCKERS, CATACROCKERS_OFFER, 2);
export const includeGMadrid = (config) => includeClubPack(includeCatacrockers(config), GMADRID, GMADRID_OFFER, 3);
export const includeRamones = (config) => includeClubPack(includeGMadrid(config), RAMONES, RAMONES_OFFER, 4);
export const includeOlimpicoAlcobendas = (config) => includeClubPack(includeRamones(config), OLIMPICO_ALCOBENDAS, OLIMPICO_ALCOBENDAS_OFFER, 5);
export const includeMiyama = (config) => includeClubPack(includeOlimpicoAlcobendas(config), MIYAMA, MIYAMA_OFFER, 6);
export const includePrusia = (config) => includeClubPack(includeMiyama(config), PRUSIA, PRUSIA_OFFER, 7);
export const includePanzer = (config) => includeClubPack(includePrusia(config), PANZER, PANZER_OFFER, 8);
export const includeVipers = (config) => includeClubPack(includePanzer(config), VIPERS, VIPERS_OFFER, 9);
export const includeWhiteAir = (config) => includeClubPack(includeVipers(config), WHITE_AIR, WHITE_AIR_OFFER, 10);
export const includeLosAbuelosDominicanos = (config) => includeClubPack(includeWhiteAir(config), LOS_ABUELOS_DOMINICANOS, LOS_ABUELOS_DOMINICANOS_OFFER, 11);
export const includeDosMetrosDiez = (config) => includeClubPack(includeLosAbuelosDominicanos(config), DOS_METROS_DIEZ, DOS_METROS_DIEZ_OFFER, 12);

export function parseCareerCatalog(text) {
  if (new TextEncoder().encode(text).length > MAX_CATALOG_BYTES) throw new Error('El archivo supera el límite de 3 MB.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  return catalogForExport(upgradeConfig(value));
}

// Called only by development-mode branches. No remote repository writes.
export function readLocalCareerCatalog(storage) {
  try {
    const text = (storage ?? window.localStorage).getItem(LOCAL_CAREER_CATALOG_KEY);
    return text ? includeEventPresentations(includeDosMetrosDiez(parseCareerCatalog(text))) : structuredClone(DEFAULT_CAREER_CONFIG);
  } catch (error) { throw new Error('No se pudo leer el catálogo local. ' + error.message); }
}

export function saveLocalCareerCatalog(config, storage) {
  const data = catalogForExport(config);
  const text = JSON.stringify(data);
  if (new TextEncoder().encode(text).length > MAX_CATALOG_BYTES) throw new Error('El catálogo supera el límite de 3 MB.');
  try { (storage ?? window.localStorage).setItem(LOCAL_CAREER_CATALOG_KEY, text); }
  catch { throw new Error('El navegador no permite guardar el catálogo local. Puedes exportarlo como JSON.'); }
  return data;
}
