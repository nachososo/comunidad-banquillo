import { allPlayers } from '../data/data.js';
import { transferClubFor } from '../data/careerClubs.js';
import { CAREER_ADDITIONAL_MEMBERS } from '../data/careerConversations.js';

// Public local roster only: do not copy phone numbers, accounts or player ratings.
const roster = [...new Map(allPlayers.map(({ id, name }) => [String(id), { id: String(id), name }])).values()];
// Keep existing IDs first so saved events still resolve their original sender.
const nameKey = (name) => name.trim().toLocaleLowerCase('es');
export const CAREER_CAST = [...roster, ...CAREER_ADDITIONAL_MEMBERS].filter((person, index, cast) =>
  cast.findIndex((candidate) => nameKey(candidate.name) === nameKey(person.name)) === index);
export const PRESENTATION_FORMATS = { group: 'WhatsApp · Grupo del equipo', direct: 'WhatsApp · Mensaje privado', instagram: 'WhatsApp · Compartir Instagram', x: 'WhatsApp · Compartir X / Twitter', court: 'En la pista', bench: 'Conversación en el banquillo', bar: 'La Caña de Gonzalo' };
export const AUTHOR_MODES = { member: 'Miembro concreto', random: 'Miembro al azar', external: 'Personaje externo' };
export const isSocialFormat = (format) => ['instagram', 'x'].includes(format);
export const isLiveFormat = (format) => ['court', 'bench', 'bar'].includes(format);
export const BAR_LOCATION = 'La Caña de Gonzalo';
export const BAR_LOCATION_IMAGE = '/img/career-locations/la-cana-de-gonzalo.jpg';
export const defaultCourt = () => ({ homeLabel: 'Banquillo', awayLabel: 'Rival', homeScore: 58, awayScore: 59, period: '4º cuarto', clock: '00:08' });
export const defaultPost = () => ({ author: 'Baloncesto del barrio', handle: '', title: '', text: '' });
export const DEFAULT_SHARE_MESSAGE = 'Mirad esta publicación. ¿Nos apuntamos?';
export const defaultPresentation = () => ({ format: 'group', authorMode: 'random', memberId: '', authorName: '', handle: '', message: '', location: '', post: defaultPost(), court: defaultCourt() });
export const presentationFor = (event) => {
  const raw = event.presentation;
  const p = { ...defaultPresentation(), ...raw, post: { ...defaultPost(), ...raw?.post }, court: { ...defaultCourt(), ...raw?.court } };
  if (event.category === 'transfer') return { ...p, format: 'direct', authorMode: 'external', authorName: p.authorName || 'Coordinación deportiva' };
  if (p.format === 'bar') p.location = BAR_LOCATION;
  // Older social events used one text for the publication. Keep that text as
  // the post and add a separate sharing message without rewriting saved data.
  if (isSocialFormat(p.format) && raw?.post === undefined) {
    p.post = { ...defaultPost(), author: raw?.author?.name || p.authorName || CAREER_CAST.find((person) => person.id === p.memberId)?.name || defaultPost().author, handle: p.handle, title: event.title || '', text: p.message || event.description || '' };
    p.message = DEFAULT_SHARE_MESSAGE;
  }
  return p.authorMode === 'team' ? { ...p, authorMode: 'random' } : p;
};

export function validatePresentation(presentation) {
  if (presentation === undefined) return []; // Published v2 catalogues remain compatible.
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return ['Presentación no válida.'];
  const p = { ...defaultPresentation(), ...presentation }, errors = [];
  if (!Object.hasOwn(PRESENTATION_FORMATS, p.format)) errors.push('Elige un formato de presentación válido.');
  if (p.authorMode !== 'team' && !Object.hasOwn(AUTHOR_MODES, p.authorMode)) errors.push('Elige un tipo de autor válido.');
  for (const [key, max] of [['memberId', 100], ['authorName', 80], ['handle', 40], ['message', 1500], ['location', 100]]) {
    if (typeof p[key] !== 'string' || p[key].length > max) errors.push('Presentación: revisa ' + key + ' (máximo ' + max + ').');
  }
  if (p.format !== 'court' && p.authorMode === 'member' && !CAREER_CAST.some((member) => member.id === p.memberId)) errors.push('Selecciona un miembro de la plantilla local.');
  if (p.format !== 'court' && p.authorMode === 'external' && (typeof p.authorName !== 'string' || !p.authorName.trim())) errors.push('Escribe el nombre del personaje externo.');
  if (typeof p.handle === 'string' && p.handle && !/^@?[\w.]{1,39}$/.test(p.handle)) errors.push('El alias solo admite letras sin tildes, números, puntos y guiones bajos.');
  if (presentation.court !== undefined) {
    const court = presentation.court;
    if (!court || typeof court !== 'object' || Array.isArray(court)) errors.push('Marcador de escena no válido.');
    else {
      for (const [key, max] of [['homeLabel', 40], ['awayLabel', 40], ['period', 30]]) if (typeof court[key] !== 'string' || !court[key].trim() || court[key].length > max) errors.push('Marcador: revisa ' + key + '.');
      for (const key of ['homeScore', 'awayScore']) if (!Number.isInteger(court[key]) || court[key] < 0 || court[key] > 200) errors.push('Marcador: puntuaciones enteras entre 0 y 200.');
      if (typeof court.clock !== 'string' || !/^\d{2}:[0-5]\d$/.test(court.clock)) errors.push('Reloj de escena: usa MM:SS (por ejemplo, 00:08).');
    }
  }
  if (presentation.post !== undefined) {
    const post = presentation.post;
    if (!post || typeof post !== 'object' || Array.isArray(post)) errors.push('Publicación no válida.');
    else {
      for (const [key, max] of [['author', 80], ['handle', 40], ['title', 100], ['text', 1500]]) {
        if (typeof post[key] !== 'string' || post[key].length > max) errors.push('Publicación: revisa ' + key + ' (máximo ' + max + ').');
      }
      if (typeof post.handle === 'string' && post.handle && !/^@?[\w.]{1,39}$/.test(post.handle)) errors.push('Revisa el alias de la publicación.');
      if (isSocialFormat(p.format) && (!post.author?.trim?.() || !post.text?.trim?.())) errors.push('Completa el autor y el texto de la publicación compartida.');
    }
  }
  return errors;
}

const hash = (text) => Array.from(text).reduce((value, letter) => Math.imul(value ^ letter.codePointAt(0), 16777619) >>> 0, 2166136261);

// Cosmetic selection is deterministic within a season and NEVER consumes a
// gameplay random draw. Store its result with the event so history cannot drift.
export function resolvePresentation(event, career = {}, cast = CAREER_CAST) {
  const p = presentationFor(event);
  if (event.category === 'transfer') {
    const club = transferClubFor(event, career);
    return { ...p, format: 'direct', authorMode: 'external', author: { id: '', name: club?.contactName || 'Coordinación deportiva' } };
  }
  if (career.currentClub && (career.currentClub.id !== 'cdb' || (p.authorMode === 'random' && career.currentClub.members?.length))) {
    cast = (career.currentClub.members || []).map((name, index) => ({ id: career.currentClub.id + '-' + index, name }));
  }
  let author = { id: '', name: 'Entrenador' };
  if (p.authorMode === 'external') author = { id: '', name: p.authorName.trim() || 'Organización del torneo' };
  if (p.authorMode === 'member') author = cast.find((person) => person.id === p.memberId) || author;
  if (p.authorMode === 'random' && cast.length) {
    const seed = [event.id, career.age, career.profile?.name, career.profile?.number, JSON.stringify(career.development ?? {})].join('|');
    author = cast[hash(seed) % cast.length];
  }
  return { ...p, author: { ...author } };
}

export const senderTone = (name) => ['blue', 'green', 'purple'][hash(name) % 3];

// Read-only compatibility for already-open games with a generic sender snapshot.
// Named authors stay untouched; neither the catalogue nor the career is mutated.
export function sceneForEvent(event, career = {}) {
  if (event.category === 'transfer') return resolvePresentation(event, career);
  if (!event.scene) return resolvePresentation(event, career);
  const scene = { ...event.scene, ...presentationFor({ ...event, presentation: event.scene }) };
  if (scene.authorMode === 'team' || (!scene.author?.id && scene.author?.name === 'El equipo')) {
    return resolvePresentation({ ...event, presentation: { ...scene, authorMode: 'random' } }, career);
  }
  return scene;
}
