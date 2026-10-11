// Narrative staging only: these defaults never alter probabilities or effects.
const bench = (message, location = 'En el banquillo · Después del entreno', authorName = 'Entrenador') => ({
  format: 'bench', authorMode: 'external', authorName, location, message,
});

export const EVENT_PRESENTATION_PRESETS = {
  summer: { message: '¡Gente! Tenemos pista este verano. ¿Quién se apunta a echar unas sesiones extra?' },
  mechanics: bench('Mira este fotograma de tu tiro. Podemos probar un ajuste del gesto, aunque al principio costará acostumbrarse.', 'Junto a la pista · Revisando el vídeo'),
  'next-level': bench('Los del siguiente turno nos han invitado a entrenar. Van a otro ritmo. ¿Te quedas a probar?', 'A pie de pista · Cambio de turno'),
  school: { format: 'direct', authorMode: 'external', authorName: 'Tu primo', message: '¿Cómo llevas los exámenes? Si quieres, organizamos los entrenos para que te dé tiempo a estudiar también.' },
  reading: bench('Pausa aquí: ese pase estaba libre. Vamos a repasar juntos qué opciones tenías.', 'Junto a la pista · Revisando el partido'),
  defense: bench('Necesitamos que alguien incomode a quienes más anotan. ¿Te encargas de ese trabajo esta temporada?'),
  rebound: bench('Antes de saltar, gana la posición. ¿Nos quedamos a trabajar el cierre del rebote?'),
  captain: { format: 'bar', authorMode: 'random', location: 'La Caña de Gonzalo', message: 'Entre horarios, convocatorias y días torcidos, nos vendría bien alguien que tirase del grupo. ¿Te animas a dar el paso?' },
  specialist: bench('Vamos a ensayar esta variante contigo. Quiero que encontremos el pase y el tiro sin tener que pensarlo.', 'En el banquillo · Pizarra del entrenamiento'),
  gym: bench('Nos está faltando fuerza al final de los partidos. Podemos subir la carga, pero habrá que dosificarla bien.', 'Junto a la pista · Preparación física'),
  ankle: bench('El tobillo sigue molestando. Antes de decidir si vuelves, tenemos que valorar cómo responde a la carga.', 'Consulta · Revisión del tobillo', 'Fisio'),
  knee: bench('Vamos a preparar la vuelta. Podemos intensificar la recuperación, siempre pendientes de cómo respondes.', 'Consulta · Plan de recuperación', 'Fisio'),
  zone: { format: 'court', message: 'El rival se cierra en zona. Recibes arriba y tus compañeros esperan que señales cómo atacar.', court: { homeLabel: 'Tu equipo', awayLabel: 'Rival', homeScore: 35, awayScore: 40, period: '3º cuarto', clock: '06:24' } },
  triple: bench('En el vídeo se ve que te dejan espacio fuera. ¿Trabajamos para buscar más tus triples?', 'Junto a la pista · Plan de ataque'),
  community: { format: 'instagram', message: '¡Mirad la jornada que estamos preparando! ¿Quién se apunta a enseñar lo básico y echar una mano?', post: { author: 'Baloncesto del barrio', handle: 'basket_del_barrio', title: 'Tu primer balón', text: 'Jornada abierta de iniciación al baloncesto. Juegos, primeros pases y tiros a canasta con gente de los equipos municipales. ¡No hace falta experiencia!' } },
  comeback: { format: 'court', message: 'Se acaba el tiempo muerto. Vais por detrás, pero todavía quedan minutos. ¿Das un paso al frente para intentar la remontada?', court: { homeLabel: 'Tu equipo', awayLabel: 'Rival', homeScore: 46, awayScore: 55, period: '4º cuarto', clock: '04:32' } },
  maturity: bench('No necesitamos que corras detrás de cada balón. Podemos trabajar la lectura y la colocación para anticiparnos.'),
  longevity: bench('Queremos que sigas disfrutando de los domingos. Vamos a pensar una rutina que encaje con esta etapa.', 'Junto a la pista · Plan de temporada'),
  farewell: bench('Antes de cerrar la lista del año que viene, quería hablar contigo. ¿Te quedan ganas de otra temporada?'),
  'retire-injuries': bench('Han sido muchas lesiones. Si decides dejar de competir, tu sitio entre nosotros sigue aquí.', 'Gradas vacías · Después del entrenamiento'),
  'retire-chapter': bench('Hemos compartido muchos años de pista. Si ahora te apetece cerrar esta etapa, lo entendemos.', 'Gradas vacías · Después del entrenamiento'),
  'routine-season': bench('Este año podemos centrarnos en los fundamentos: pase, defensa y constancia. ¿Cómo lo ves?'),
};
