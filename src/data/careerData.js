import { defaultPresentation } from '../utils/careerPresentation.js';
import { EVENT_PRESENTATION_PRESETS } from './careerEventPresentations.js';
import { DEFAULT_INTERDISTRICTS_SETTINGS } from '../utils/careerInterdistricts.js';
import { BLUE_DEVILS, CATACROCKERS, GMADRID, RAMONES, OLIMPICO_ALCOBENDAS, MIYAMA, PRUSIA, PANZER, VIPERS, WHITE_AIR, LOS_ABUELOS_DOMINICANOS, DOS_METROS_DIEZ, STARTING_CLUB } from './careerClubs.js';
export { STARTING_CLUB } from './careerClubs.js';

export const START_AGE = 17;
export const LAST_AGE = 40;
export const MAX_SEASONS = LAST_AGE - START_AGE + 1;
export const RETIREMENT_AGE = 30;
export const POSITIONS = ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot'];
export const STAGES = { infantil: 'Infantil', cadete: 'Cadete', junior: 'Junior', senior: 'Senior' };
export const CATEGORIES = { development: 'Desarrollo', court: 'En la pista', injury: 'Lesiones', community: 'Vida de equipo', transfer: 'Fichaje', retirement: 'Retirada' };
export const ARCHETYPES = {
  scorer: { label: 'Anotador', description: 'Más protagonismo ofensivo y facilidad para sumar puntos.' },
  anchor: { label: 'Muro defensivo', description: 'Rebote, robos y tapones para marcar diferencias atrás.' },
  leader: { label: 'Cerebro', description: 'Dirección de juego y asistencias para hacer mejor al equipo.' },
  allround: { label: 'Todoterreno', description: 'Un perfil equilibrado en todos los apartados.' },
};
export const EFFECT_FIELDS = {
  shooting: { label: 'Tiro', min: -30, max: 30, unit: ' pts (permanente)', help: 'Habilidad 0–100; influye en anotación, no son puntos de partido.' },
  passing: { label: 'Pase', min: -30, max: 30, unit: ' pts (permanente)', help: 'Habilidad 0–100; influye en las asistencias.' },
  rebounding: { label: 'Rebote', min: -30, max: 30, unit: ' pts (permanente)', help: 'Habilidad 0–100; influye en los rebotes por partido.' },
  defense: { label: 'Defensa', min: -30, max: 30, unit: ' pts (permanente)', help: 'Habilidad 0–100; influye en robos y tapones.' },
  composure: { label: 'Control de presión', min: -30, max: 30, unit: ' pts (permanente)', help: 'Más es mejor: estabiliza la anotación y puede ajustar el éxito de eventos decisivos.' },
  evolutionPct: { label: 'Evolución', min: -100, max: 200, unit: '% (esta temporada)', help: '+25% multiplica la mejora natural positiva por 1,25 este año. No aumenta el declive ni garantiza mejorar.' },
  injuryRisk: { label: 'Riesgo de lesión', min: -100, max: 100, unit: ' pp (esta temporada)', help: '+5 puntos porcentuales convierte un riesgo del 4% en 9%. Un valor negativo protege.' },
  overall: { label: 'Mejora general antigua', min: -30, max: 30, advanced: true, help: 'Compatibilidad: modifica todos los atributos por igual. Prioriza habilidades específicas.' },
  points: { label: 'Puntos extra', min: -500, max: 500, help: 'Total de puntos de esta temporada, no puntos por partido.' },
  rebounds: { label: 'Rebotes extra', min: -200, max: 200 },
  assists: { label: 'Asistencias extra', min: -200, max: 200 },
  steals: { label: 'Robos extra', min: -100, max: 100 },
  blocks: { label: 'Tapones extra', min: -100, max: 100 },
  winningShots: { label: 'Canastas ganadoras', min: 0, max: 10 },
  injuries: { label: 'Lesiones nuevas', min: 0, max: 5, help: 'Se acumulan en el historial y pueden habilitar eventos de retirada.' },
  gamesMissed: { label: 'Partidos de baja', min: 0, max: 40 },
};
export const DEFAULT_CAREER_SETTINGS = { gamesPerSeason: 24, difficulty: 50, ...DEFAULT_INTERDISTRICTS_SETTINGS };

export const newCareerEvent = (id = '') => ({
  id, title: '', description: '', category: 'development', enabled: true,
  presentation: defaultPresentation(),
  weight: 10, minAge: START_AGE, maxAge: LAST_AGE, stage: 'all',
  team: 'all', position: 'all', minInjuries: 0, cooldown: 3, maxOccurrences: 2,
  chance: 65, influence: 0, influenceAttribute: 'overall', acceptLabel: '¡Me apunto!', declineLabel: 'Esta vez paso',
  successText: '', failureText: '', declineText: 'Esta vez has pasado de la propuesta. Hemos seguido jugando y ya tenemos el balance del año.',
  success: { shooting: 3, evolutionPct: 15 }, failure: { composure: -2, evolutionPct: -10 }, successAward: '', failureAward: '',
});

const challenge = (id, title, description, chance, success, failure, extra = {}) => ({
  ...newCareerEvent(id), title, description, chance, success, failure,
  presentation: { ...defaultPresentation(), ...EVENT_PRESENTATION_PRESETS[id] },
  successText: '¡Ha salido! Lo que hemos trabajado se ha notado en la pista. Esto se merece un mensaje al grupo.',
  failureText: 'No ha salido como pensábamos. Lo hablamos en el próximo entreno; hoy toca mirar cómo ha ido el año.',
  ...extra,
});
export const newTransferEvent = (id = '', targetClubId = '') => ({
  ...newCareerEvent(id), category: 'transfer', targetClubId, minAge: 18,
  title: 'Una camiseta nueva', description: 'Otro club quiere contar contigo esta temporada. ¿Aceptas su oferta?',
  presentation: { ...defaultPresentation(), format: 'direct', authorMode: 'external', authorName: 'Coordinación deportiva', message: '¡Hola! Hemos visto cómo juegas y nos gustaría contar contigo en nuestro equipo. ¿Te animas a venir esta temporada?' },
  chance: 100, influence: 0, success: {}, failure: {},
  acceptLabel: 'Aceptar la oferta', declineLabel: 'Quedarme en mi equipo',
  successText: 'El fichaje se cierra. Te incorporas al nuevo equipo para esta temporada.',
  failureText: 'La negociación no llega a buen puerto. Continúas en tu equipo actual.',
  declineText: 'Agradeces la oferta, pero eliges seguir en tu equipo.',
});
export const DEFAULT_CAREER_EVENTS = [
  challenge('summer', '¿Quién abre la pista?', 'Tenemos pista libre este verano y un balón que pide uso. ¿Te apuntas a las sesiones extra del grupo?', 65, {"shooting":2,"evolutionPct":25,"injuryRisk":3}, {"composure":-2,"evolutionPct":-15,"injuryRisk":5}),
  challenge('winner', 'La última posesión', 'Puedes pedir el balón y asumir el último tiro. Si no lo pides, dejas la decisión al equipo.', 55, {"shooting":1,"composure":4,"points":3,"winningShots":1}, {"composure":-2}, { presentation: { ...defaultPresentation(), format: 'court', court: { ...defaultPresentation().court, clock: '00:02' }, message: 'El marcador aprieta. Quedan dos segundos y el balón está a punto de entrar en juego. Tienes la oportunidad de decidir.' }, category: 'court', influence: 20, influenceAttribute: 'composure', acceptLabel: 'Pedir el último tiro', declineLabel: 'No pedir el último tiro', successText: 'La canasta entra sobre la bocina. Tres puntos más y una victoria que lleva tu firma.', failureText: 'El lanzamiento no entra. Esta vez el final no fue el que imaginabas.' }),
  challenge('mechanics', 'El vídeo a cámara lenta', 'Hemos visto tu tiro en el vídeo del domingo. ¿Probamos a ajustar el gesto en los entrenos? Al principio puede salir de todo.', 60, {"shooting":6,"evolutionPct":15}, {"shooting":-3,"composure":-1}),
  challenge('next-level', 'Los del último turno', 'El equipo que entrena después nos ha invitado a su sesión. Van a otro ritmo. ¿Te quedas a probar?', 58, {"defense":2,"evolutionPct":35,"injuryRisk":5}, {"composure":-2,"injuryRisk":5}, { maxAge: 18 }),
  challenge('school', 'Entre apuntes y zapatillas', 'Se nos juntan los exámenes y los partidos. ¿Te organizas una rutina para llegar con ganas a las dos cosas?', 85, {"composure":4,"evolutionPct":15}, {"evolutionPct":-10}, { maxAge: 18 }),
  challenge('first-team', 'Hoy te toca dar el paso', 'Ya estás en senior y hay minutos importantes por repartir. ¿Te animas a asumir más juego este año?', 60, {"composure":3,"shooting":2,"evolutionPct":10}, {"composure":-3}, { presentation: { ...defaultPresentation(), format: 'bench', authorMode: 'external', authorName: 'Entrenador', message: 'Este año quiero contar más contigo en los momentos importantes. ¿Te ves dando ese paso?' }, minAge: 19, maxAge: 21, maxOccurrences: 1, category: 'court' }),
  challenge('reading', 'Pausa el vídeo ahí', 'Tenemos grabado el partido: en esa jugada había un pase que no vimos. ¿Te apuntas a revisar juntos cómo movemos el balón?', 75, {"passing":6,"composure":1}, {"passing":-1}),
  challenge('defense', 'Ese hoy no tira solo', 'La gente que más anota en la liga nos está haciendo un traje. ¿Te encargas de ponerles las cosas difíciles esta temporada?', 65, {"defense":6,"rebounding":2}, {"defense":-2,"composure":-1}, { category: 'court' }),
  challenge('rebound', 'El balón que nadie quiere', 'Otra vez nos han cogido el rebote entre tres. ¿Trabajamos la colocación para que los siguientes sean nuestros?', 70, {"rebounding":7,"defense":1}, {"evolutionPct":-10}),
  challenge('captain', 'Ponemos orden al grupo', 'Entre los horarios, las convocatorias y los días torcidos, nos vendría bien alguien que tire del equipo. ¿Das el paso?', 80, {"composure":5,"passing":3}, {"composure":-3}, { minAge: 17, category: 'community', successAward: 'Premio al liderazgo' }),
  challenge('specialist', 'La jugada del jueves', 'Se nos ha ocurrido una variante para sorprender en ataque. ¿La ensayamos contigo hasta que salga sin pensar?', 55, {"shooting":5,"passing":1}, {"shooting":-2}),
  challenge('pressure', 'Dos tiros y todos mirando', 'Partido igualado, dos libres y el banquillo aguantando la respiración. ¿Te ves con confianza para asumir ese momento?', 75, {"composure":3,"shooting":1,"points":2,"winningShots":1}, {"composure":-3}, { presentation: { ...defaultPresentation(), format: 'court', court: { ...defaultPresentation().court, homeScore: 58, awayScore: 59, clock: '00:01' }, message: 'El árbitro señala dos tiros libres. Hay un punto de diferencia y el banquillo contiene la respiración. Te toca decidir.' }, acceptLabel: 'Asumir los tiros libres', declineLabel: 'No asumir el reto', category: 'court', influence: 20, influenceAttribute: 'composure', successText: 'Anotas los dos libres y cierras la victoria.', failureText: 'La presión pesa y no consigues resolver desde la línea.' }),
  challenge('mentor', 'Cinco minutos más de pista', 'Todavía no han apagado las luces. Quienes llevan más años quieren repasar contigo un par de detalles. ¿Te quedas?', 85, {"passing":3,"defense":2,"evolutionPct":10}, {}, { minAge: START_AGE, presentation: { ...defaultPresentation(), format: 'bench', location: 'Junto a la pista · Después del entreno', message: 'Todavía tenemos cinco minutos antes de que apaguen las luces. ¿Te quedas conmigo a repasar un par de detalles?' } }),
  challenge('gym', 'Más piernas para el domingo', 'Estamos llegando al último cuarto con las piernas justas. ¿Te sumas a una preparación física más exigente este año?', 72, {"rebounding":4,"defense":3,"evolutionPct":20,"injuryRisk":5}, {"evolutionPct":-20,"injuryRisk":15}, { minAge: 17, failureText: 'La carga te supera: creces menos y aumenta tu riesgo de lesión durante este año.' }),
  challenge('ankle', 'El tobillo también opina', 'Ese tobillo sigue molestando. Nos vendría bien que jugaras, pero la vuelta no tiene por qué ser ahora. ¿Quieres adelantarla?', 45, {"shooting":1,"evolutionPct":10,"injuryRisk":15}, {"evolutionPct":-20,"injuryRisk":30}, { category: 'injury', declineText: 'Respetas los plazos y evitas el riesgo adicional, aunque siguen existiendo los riesgos habituales de competir.', failureText: 'Las molestias empeoran: tu evolución se frena y aumenta el riesgo de acabar lesionado.' }),
  challenge('knee', 'La vuelta se prepara', 'Después de la lesión, toca decidir cómo preparar la vuelta. ¿Apuestas por un programa de recuperación más intensivo?', 70, {"injuryRisk":-10,"evolutionPct":15}, {"evolutionPct":-15,"injuryRisk":12}, { category: 'injury', minInjuries: 1 }),
  challenge('overload', 'Torneo en La Elipa', 'Te invitan a un torneo extra. Puede darte experiencia, pero acumular partidos también pasa factura.', 60, {"evolutionPct":20,"shooting":2,"injuryRisk":10}, {"evolutionPct":-20,"injuryRisk":15}, { category: 'injury', presentation: { ...defaultPresentation(), authorMode: 'random', message: '¡Gente! Me han dicho que la semana que viene hay torneo en La Elipa! ¿Nos apuntamos?', location: 'La Elipa' }, acceptLabel: '¡Contad conmigo!', declineLabel: 'Esta vez descanso' }),
  challenge('zone', 'Nos han plantado una zona', 'Han cerrado la pintura y estamos dando vueltas por fuera. ¿Te encargas de ordenar el ataque y buscar los huecos?', 68, {"passing":5,"shooting":2}, {"passing":-2}, { category: 'court' }),
  challenge('triple', 'Si te dejan, tira', 'En los vídeos se ve que te están dejando espacio fuera. ¿Probamos a buscar más tus triples esta temporada?', 58, {"shooting":7,"composure":1}, {"shooting":-3,"composure":-2}, { category: 'court' }),
  challenge('community', 'El primer balón de alguien', 'Vamos a montar una jornada para quienes empiezan a jugar. ¿Vienes a enseñarles lo básico y echar unos tiros?', 90, {"composure":3,"injuryRisk":-2}, {}, { minAge: 19, category: 'community', successAward: 'Premio al compromiso' }),
  challenge('comeback', 'No nos vamos así', 'Llevamos un año torcido, pero todavía queda partido. ¿Tiras del equipo para intentar darle la vuelta?', 52, {"composure":5,"passing":3,"shooting":2}, {"composure":-3}, { category: 'court', influence: 20, influenceAttribute: 'composure' }),
  challenge('maturity', 'Menos carreras, más cabeza', 'Ya sabemos que no hace falta correrlo todo. ¿Trabajas una forma de jugar con más lectura y mejor colocación?', 75, {"passing":5,"composure":3,"injuryRisk":-3}, {"passing":-1}, { minAge: 30 }),
  challenge('longevity', 'Seguir viniendo al pabellón', 'Queremos seguir viéndote por la pista muchos domingos. ¿Preparas una rutina adaptada a esta etapa de tu carrera?', 65, {"injuryRisk":-6,"evolutionPct":20,"rebounding":2}, {"injuryRisk":10,"defense":-2}, { minAge: 30 }),
  challenge('farewell', 'Este año todavía estoy', 'Cuando sale la lista de la próxima temporada sigues teniendo ganas de apuntarte. ¿Vas a por un año de los que luego contamos?', 50, {"shooting":4,"composure":4,"injuryRisk":5}, {"composure":-3,"evolutionPct":-15,"injuryRisk":8}, { minAge: 35 }),
  challenge('retire-injuries', 'Las zapatillas piden tregua', 'Las lesiones se han ido acumulando. Si ha llegado el momento de dejar de competir, tu sitio en el grupo sigue aquí. ¿Cierras tu carrera?', 100, {}, {}, { category: 'retirement', minAge: 30, minInjuries: 1, weight: 18, acceptLabel: 'Retirarme', declineLabel: 'Seguir compitiendo', successText: 'Decides que ha llegado el momento. Termina tu carrera, no tu vínculo con el baloncesto.', failureText: 'Aún no te ves fuera de la pista.', declineText: 'Decides continuar una temporada más.', maxOccurrences: 4, cooldown: 1 }),
  challenge('retire-chapter', 'El banquillo sigue siendo tuyo', 'Llevamos un montón de años compartiendo pista. Si ahora te apetecen otros planes, lo entendemos. ¿Es el momento de despedirte de la pista?', 100, {}, {}, { category: 'retirement', minAge: 36, weight: 12, acceptLabel: 'Cerrar mi carrera', declineLabel: 'Todavía quiero jugar', successText: 'Eliges cerrar esta etapa y te llevas una vida de recuerdos.', failureText: 'Todavía queda baloncesto en ti.', declineText: 'La pista puede esperar a tu despedida. Sigues compitiendo.', maxOccurrences: 2 }),
];
export const ROUTINE_EVENT = challenge('routine-season', 'Una temporada para crecer', 'Este año no aparece un reto especial. Puedes centrarte en perfeccionar los fundamentos.', 100, { passing: 1, defense: 1, evolutionPct: 10 }, {}, {
  weight: 1, acceptLabel: 'Trabajar los fundamentos', declineLabel: 'Seguir mi rutina',
  successText: 'La constancia mejora tu pase y defensa y refuerza la evolución de este año.', declineText: 'Completas la temporada con tu rutina habitual.',
});
export const BLUE_DEVILS_OFFER = {
  ...newTransferEvent('transfer-blue-devils', BLUE_DEVILS.id), title: 'Una propuesta de Blue Devils',
  description: 'Blue Devils quiere contar contigo esta temporada. Puedes aceptar su oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Hola! Te escribo de Blue Devils. Estamos preparando el equipo para esta temporada y nos gustaría contar contigo. ¿Te animas a venir a jugar con nosotros?' },
  successText: 'El fichaje está cerrado. Esta temporada vistes la camiseta de Blue Devils.',
};
export const CATACROCKERS_OFFER = {
  ...newTransferEvent('transfer-catacrockers', CATACROCKERS.id), title: 'Una propuesta de Catacrockers',
  description: 'Catacrockers busca gente para su equipo esta temporada. Puedes aceptar su oferta o seguir en tu club.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Catacrockers. Estamos buscando gente para completar el equipo y nos gustaría contar contigo. ¿Te vienes a jugar con nosotros esta temporada?' },
  successText: 'Fichaje cerrado. Esta temporada juegas con Catacrockers y ya tienes sitio en su grupo.',
};
export const GMADRID_OFFER = {
  ...newTransferEvent('transfer-gmadrid', GMADRID.id), title: 'Una propuesta de GMadrid',
  description: 'GMadrid quiere incorporarte a su equipo esta temporada. Puedes aceptar la oferta o continuar en tu club.',
  presentation: { ...newTransferEvent().presentation, message: '¡Hola! Te escribo de GMadrid. Nos ha gustado lo que hemos visto de ti en la pista y queremos contar contigo para esta temporada. ¿Te apetece sumarte al equipo?' },
  successText: 'Acuerdo cerrado. Esta temporada juegas en GMadrid y te incorporas a su grupo.',
};
export const RAMONES_OFFER = {
  ...newTransferEvent('transfer-ramones', RAMONES.id), title: 'Una propuesta de Ramones',
  description: 'Ramones quiere contar contigo esta temporada. Puedes aceptar su oferta o continuar en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Ramones. Estamos preparando la plantilla de esta temporada y creemos que encajarías muy bien con nosotros. ¿Te animas a venir al equipo?' },
  successText: 'Fichaje cerrado. Esta temporada juegas con Ramones y ya formas parte de su grupo.',
};
export const OLIMPICO_ALCOBENDAS_OFFER = {
  ...newTransferEvent('transfer-olimpico-alcobendas', OLIMPICO_ALCOBENDAS.id), title: 'Una propuesta de Olímpico Alcobendas',
  description: 'Olímpico Alcobendas quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Hola! Te escribo de Olímpico Alcobendas. Estamos completando el equipo para esta temporada y nos gustaría que jugaras con nosotros. ¿Te apetece venir?' },
  successText: 'Acuerdo cerrado. Esta temporada juegas en Olímpico Alcobendas y te incorporas a su grupo.',
};
export const MIYAMA_OFFER = {
  ...newTransferEvent('transfer-miyama', MIYAMA.id), title: 'Una propuesta de Miyama',
  description: 'Miyama quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Miyama. Estamos preparando el equipo para esta temporada y nos gustaría contar contigo. ¿Te animas a jugar con nosotros?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en Miyama y te incorporas a su grupo.',
};
export const PRUSIA_OFFER = {
  ...newTransferEvent('transfer-prusia', PRUSIA.id), title: 'Una propuesta de Prusia',
  description: 'Prusia quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Hola! Te escribo de Prusia. Estamos organizando la plantilla de esta temporada y nos gustaría que te unieras al equipo. ¿Te apetece jugar con nosotros?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en Prusia y te incorporas a su grupo.',
};
export const PANZER_OFFER = {
  ...newTransferEvent('transfer-panzer', PANZER.id), title: 'Una propuesta de Panzer',
  description: 'Panzer quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Panzer. Estamos cerrando la plantilla para esta temporada y nos gustaría contar contigo. ¿Te apetece sumarte al equipo?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en Panzer y te incorporas a su grupo.',
};
export const VIPERS_OFFER = {
  ...newTransferEvent('transfer-vipers', VIPERS.id), title: 'Una propuesta de Vipers',
  description: 'Vipers quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Vipers. Estamos buscando gente para completar el equipo esta temporada. ¿Te animas a venir a jugar con nosotros?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en Vipers y te incorporas a su grupo.',
};
export const WHITE_AIR_OFFER = {
  ...newTransferEvent('transfer-white-air', WHITE_AIR.id), title: 'Una propuesta de White Air',
  description: 'White Air quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Hola! Te escribo de White Air. Estamos preparando el equipo de esta temporada y creemos que encajarías muy bien. ¿Te apetece venir a jugar con nosotros?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en White Air y te incorporas a su grupo.',
};
export const LOS_ABUELOS_DOMINICANOS_OFFER = {
  ...newTransferEvent('transfer-los-abuelos-dominicanos', LOS_ABUELOS_DOMINICANOS.id), title: 'Una propuesta de Los Abuelos Dominicanos',
  description: 'Los Abuelos Dominicanos quieren contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de Los Abuelos Dominicanos. Estamos buscando gente para completar el equipo esta temporada. ¿Te animas a venir a jugar con nosotros?' },
  successText: 'Fichaje cerrado. Esta temporada juegas con Los Abuelos Dominicanos y te incorporas a su grupo.',
};
export const DOS_METROS_DIEZ_OFFER = {
  ...newTransferEvent('transfer-2metros10', DOS_METROS_DIEZ.id), title: 'Una propuesta de 2metros10',
  description: '2metros10 quiere contar contigo esta temporada. Puedes aceptar la oferta o seguir en tu equipo.',
  presentation: { ...newTransferEvent().presentation, message: '¡Buenas! Te escribo de 2metros10. Estamos preparando la plantilla de esta temporada y nos gustaría contar contigo. ¿Te apetece sumarte al equipo?' },
  successText: 'Fichaje cerrado. Esta temporada juegas en 2metros10 y te incorporas a su grupo.',
};
DEFAULT_CAREER_EVENTS.push(BLUE_DEVILS_OFFER, CATACROCKERS_OFFER, GMADRID_OFFER, RAMONES_OFFER, OLIMPICO_ALCOBENDAS_OFFER, MIYAMA_OFFER, PRUSIA_OFFER, PANZER_OFFER, VIPERS_OFFER, WHITE_AIR_OFFER, LOS_ABUELOS_DOMINICANOS_OFFER, DOS_METROS_DIEZ_OFFER);
export const DEFAULT_CAREER_CONFIG = { version: 2, clubPackVersion: 12, presentationPackVersion: 1, settings: DEFAULT_CAREER_SETTINGS, clubs: [STARTING_CLUB, BLUE_DEVILS, CATACROCKERS, GMADRID, RAMONES, OLIMPICO_ALCOBENDAS, MIYAMA, PRUSIA, PANZER, VIPERS, WHITE_AIR, LOS_ABUELOS_DOMINICANOS, DOS_METROS_DIEZ], events: DEFAULT_CAREER_EVENTS };
