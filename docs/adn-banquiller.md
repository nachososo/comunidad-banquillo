# ADN Banquiller: modo carrera

Juego: `/adn-banquiller`. Administración: `/panel-control/adn-banquiller`.

## Jugabilidad

- Inicio a los 17 años con una conversación ficticia inspirada en WhatsApp. Tu primo te invita a la Comunidad del Banquillo, el equipo municipal que ha formado con sus amigos. Responder abre la creación del jugador y no consume el evento anual.
- Tras crear al personaje aparece una bienvenida al grupo antes del primer evento: cabecera con el nombre literal `*Comunidad del Banquillo*`, el logo aportado y estética verde oscura consistente con el chat del primo. No se reproduce el fondo rosado, los contactos, los mensajes privados ni los stickers de las capturas de referencia. Los cuatro mensajes facilitados por el usuario están en `src/data/careerConversations.js`, en este orden: Carlos Torres, Dani González, Unai Suárez y Javier Torres. Sus marcas `bienvenido/a` se resuelven según el género narrativo; no se cambian palabras sin marcar. Se admiten terminaciones regulares `o/a`, `os/as` y variantes completas para formas irregulares. Las horas son parte de la escena ficticia. Continuar no cambia edad, habilidades, potencial ni el evento ya sorteado. Los iconos de comunicación son decorativos; no hay conexión con WhatsApp. Una carrera que ya estaba abierta no recibe la bienvenida a mitad de temporada.
- Hasta 24 temporadas anuales (17–40 inclusive). Cada año tiene exactamente un evento: aceptar sortea éxito/fallo; rechazar no aplica sus recompensas ni riesgos.
- Junior (17–18) y Senior (19–40) son grupos de edad; el inicio es municipal, no una cantera profesional. Los filtros Infantil/Cadete de catálogos anteriores se conservan por compatibilidad, pero no aparecen en nuevas carreras.
- Un único equipo mixto, con cuatro arquetipos y cinco posiciones. Masculino/femenino es solo una preferencia de trato narrativo (`profile.gender`): mismo catálogo, competición, rivales, probabilidades, potencial y resultados para ambos. Los perfiles antiguos con `profile.team` se interpretan como género narrativo. Los filtros antiguos `event.team` se conservan en el formato por compatibilidad, pero no se aplican ni se ofrecen en el panel. Media inicial 40, limitada a 0–100. La evolución por edad sigue calculándose internamente.
- Potencial individual oculto sorteado una sola vez: 55–69 (30%), 70–79 (50%), 80–89 (18%) y 90–97 (2%). Ritmo entre 0,8× y 1,2×; maduración precoz (20%), normal (60%) o tardía (20%). Media exacta con dos decimales acumulados e interfaz redondeada. Reglas e investigación en [potencial-y-progresion.md](potencial-y-progresion.md).
- Acercarse al potencial frena el crecimiento natural. Los eventos pueden superarlo sin que sus mejoras se recorten automáticamente en el año siguiente. Siguen aplicándose el declive por edad y el límite general 0–100.
- Las lesiones previas reducen la mejora natural y pueden agravar el declive. Las bajas actuales reducen la mejora según la parte de temporada disponible; perder todo el año impide la mejora natural positiva, pero no congela el envejecimiento. El balance muestra solo la variación global de media visible, no el desglose exacto del motor.
- Cinco habilidades internas 0–100: tiro, pase, rebote, defensa y control de presión. El arquetipo reparte las habilidades iniciales manteniendo media 40 en todas las posiciones. La media se deriva de ellas, no es un atributo independiente. La evolución natural desplaza todas por igual; los eventos cambian habilidades concretas permanentemente. Las fichas anuales se conservan en memoria para la simulación, pero no se muestran ni se incluyen en el texto compartido.
- Pantalla de carrera: cabecera horizontal con identidad, club, edad, media y recuento de premios; evento a la izquierda y trayectoria a la derecha (apilados en móvil). Antes de decidir, el año actual aparece al final de la tabla como fila resaltada con edad, club, media y «Decisión pendiente»; las estadísticas quedan vacías. Al aceptar o rechazar, se sustituye visualmente por el año completado sin duplicarlo. La fila pendiente no pertenece al historial de resultados ni cuenta para premios o resumen. La tabla se desplaza al último año sin mover la página. Solo se muestran estadísticas de partidos al completar cada temporada. No se muestran valores de habilidades, riesgo calculado ni detalles decimales internos. Las burbujas del evento sí muestran sus posibles modificadores y la probabilidad final para decidir. El motor, los sorteos y las reglas no cambian con este rediseño.
- Evolución del evento: modificador relativo de la mejora natural positiva de ese año (+25% significa ×1,25), sin acelerar el declive. Riesgo de lesión: puntos porcentuales sobre el riesgo anual (+5 convierte 4% en 9%); negativo protege. Ambos caducan al final de la temporada. El catálogo inicial ya no utiliza cambios directos de media.
- Se simulan los partidos de cada temporada (24 por defecto). Tiro genera puntos; pase, asistencias; rebote, rebotes; defensa, robos y tapones. Posición y minutos modulan el rendimiento. Control de presión reduce la variación de la anotación y puede influir en retos decisivos. Tier, media y dificultad influyen en victorias. El título municipal tiene un sorteo propio por tier y media, descrito más abajo. Las lesiones reducen los partidos del jugador, no el calendario del equipo.
- Riesgo anual base: `mínimo(25, 4 + máximo(0, edad − 29) × 0,5 + lesiones previas × 0,75)` por ciento. Se suma el modificador del evento, limitado a 0–100. Un sorteo anual puede causar una lesión con 3–8 partidos de baja, incluso al rechazar el evento. No se duplica el sorteo si el evento ya impone lesiones, se pierde el año completo o se acepta la retirada.
- Se conservan efectos avanzados para canastas ganadoras, totales estadísticos adicionales, lesiones explícitas y bajas. Los promedios mostrados se calculan desde los totales. El campo antiguo de media modifica todas las habilidades por igual, solo por compatibilidad con catálogos existentes.
- Desde los 30 pueden aparecer ofertas de retirada por lesiones previas. Hay además ofertas desde los 36 sin ese requisito. Se puede rechazar y continuar. Aceptar con éxito retira antes de jugar ese año: queda registro narrativo con cero partidos, sin premios ni cambio de media. A los 40 se disputa la última temporada y se abre el resumen.
- Sin partidos jugados no se generan estadísticas ni premios individuales. El equipo sigue disputando su liga durante las bajas y puede ganar el título colectivo. La retirada, en cambio, no disputa ni sortea la temporada. Las canastas ganadoras implican victorias del equipo.
- Palmarés individual y colectivo, media máxima, medias anuales, estadísticas de todos los años y tramos por club. Los fichajes conservan la identidad de cada temporada.
- Simulación recreativa cliente, sin premios reales ni clasificación competitiva verificable.

## Editor de eventos

### Identidad visual y conversaciones (31 de agosto de 2026)

La ficha y la trayectoria usan la dirección «cuaderno de club», en crema, negro cálido y dorado. Los eventos y su balance se presentan en el mismo grupo ficticio que la bienvenida: cabecera compartida, propuesta firmada por «El equipo», posibles efectos y dos respuestas. Las respuestas son controles del juego, no envían mensajes reales. El resultado aparece como continuación del chat; las habilidades internas siguen ocultas. La tabla anual y su fila pendiente mantienen el comportamiento descrito arriba.

Las propuestas del catálogo base tienen voz de equipo municipal; sus probabilidades y efectos no cambian. La presentación adapta las marcas regulares de género en los textos del evento. Se conservan intactos los cuatro mensajes de bienvenida aportados. No se reemplaza un catálogo personalizado ni se publica configuración remota. Alcance de la comparación técnica con la referencia: [revisión de originalidad](revision-originalidad-adn-banquiller.md).

### Configuración

#### Taller local y presentación narrativa

Formatos presenciales: «En la pista» muestra un marcador narrativo (equipos, puntuaciones, periodo y reloj MM:SS) y una situación inmediata; «Conversación en el banquillo» muestra una propuesta cara a cara con autor y cita, sin cabecera ni burbujas de WhatsApp. Ambos se eligen y previsualizan en el taller. La narración se edita por separado de la explicación del evento. El reloj no cuenta atrás ni limita el tiempo para responder; el marcador no modifica partidos, estadísticas ni probabilidades.

El catálogo base utiliza pista para `winner` (última posesión) y `pressure` (dos libres); banquillo para `first-team`, `captain` y `mentor`. Se conservan IDs, probabilidades, filtros y efectos. Las dos decisiones siguen siendo aceptar y rechazar el mismo reto, no jugadas alternativas nuevas. Un catálogo ya guardado o una partida abierta conserva su selección: se puede cambiar el formato desde el taller y guardar para nuevas sesiones, sin sobrescribir personalizaciones automáticamente.

Publicaciones compartidas: las opciones Instagram y X mantienen la cabecera y el fondo del WhatsApp del equipo. Un miembro envía una burbuja que contiene primero la tarjeta del post y después su comentario. El título, explicación, probabilidades y efectos del evento quedan debajo, fuera del contenido publicado. La publicación tiene sus propios campos `presentation.post.author`, `handle`, `title` y `text`; `presentation.message` es el comentario de WhatsApp y el autor narrativo es quien lo comparte, no necesariamente quien publica. Los dos textos se editan y exportan por separado, y se ven juntos en la vista previa. Para guardar un formato social nuevo se requieren autor y texto del post.

Las presentaciones sociales antiguas sin `post` se adaptan en lectura: el texto anterior pasa al post y se añade un comentario de compartir independiente. Se conserva la firma previa del post cuando está disponible. También se adaptan snapshots de partidas abiertas sin mutarlos ni consumir azar deportivo. No hay enlaces a cuentas reales, carga de publicaciones externas ni envío a redes. Mensajes privados y WhatsApp sencillo conservan su comportamiento.

Actualización visual del chat: bienvenida, mensajes de eventos y respuestas del balance comparten `CareerChatMessage`. En WhatsApp se muestra el nombre en color, el texto y una hora ficticia, sin avatar de iniciales ni pie «Escena del juego» dentro de la burbuja. El título del evento queda fuera del mensaje. Los formatos de redes sociales mantienen su propia tarjeta.

La firma genérica «El equipo» deja de ofrecerse: el autor predeterminado es un miembro al azar de la plantilla local. Los catálogos antiguos con `authorMode: team` siguen siendo válidos y se interpretan como miembro al azar. También se adaptan en lectura las escenas genéricas de partidas ya abiertas, sin reiniciarlas, mutar el catálogo ni consumir azar deportivo. Los autores concretos y externos se respetan. Las pruebas comprueban que el mensaje de evento genera la misma burbuja que la bienvenida.

En desarrollo (`npm run dev`), `/panel-control/adn-banquiller` abre el taller sin exigir una cuenta y sin ofrecer publicación remota. En producción se mantienen los permisos de administrador existentes; la excepción local está condicionada a `import.meta.env.DEV`, no al nombre del usuario. El enlace «Taller local de eventos» abre otra pestaña para no abandonar una partida activa.

- Formatos: grupo WhatsApp, mensaje privado, publicación ficticia de Instagram con anuncio tipográfico y publicación ficticia de X/Twitter. No se conectan redes, no se incrustan publicaciones reales ni se envían respuestas.
- Autor: «El equipo», un miembro concreto, un miembro al azar o un personaje externo con nombre libre. La lista usa únicamente IDs y nombres de `allPlayers` en `src/data/data.js`, la plantilla local pública del proyecto; no consulta la tabla remota de jugadores ni importa sus contactos, perfiles sociales, fotos o habilidades en la presentación.
- Campos: mensaje de hasta 1.500 caracteres, alias ficticio opcional y ubicación, además del título, explicación, respuestas y narraciones de éxito/fallo/rechazo existentes. La explicación se dibuja fuera de la burbuja o publicación cuando hay mensaje propio. Se conserva la adaptación de las marcas de género.
- Vista previa con trato masculino/femenino y el mismo componente que la partida. Los botones de esta vista no consumen temporadas. La prueba de abajo permite sortear el resultado o mostrar éxito/fallo y efectos por separado.
- Se mantienen porcentaje de éxito, influencia de habilidades, peso de aparición, límites de edad, lesiones previas, posición, repeticiones, habilidades permanentes, evolución, riesgo anual, estadísticas extra y premios. Búsqueda por título, explicación o mensaje; filtros por estado, categoría y formato. Crear, duplicar, pausar y eliminar siguen disponibles.

`presentation` es opcional en catálogos v2 anteriores: su ausencia conserva la presentación sencilla. La elección cosmética del autor usa un hash determinista de datos de la partida y temporada, no consume el generador de azar deportivo. Se captura en `pendingEvent.scene` y después en el registro del año; no cambia al volver a renderizar ni cuando se edita el catálogo más adelante.

El ejemplo base `overload` presenta la invitación «¡Gente! Me han dicho que la semana que viene hay torneo en La Elipa! ¿Nos apuntamos?» con autor de la plantilla al azar, seguido de la explicación deportiva. No se han cambiado sus probabilidades ni efectos.

«Guardar catálogo local» valida y guarda únicamente la configuración bajo `cdb:career-editor:v1` en el navegador. **No guarda partidas, perfiles ni resultados.** En desarrollo el juego carga este catálogo, o el catálogo base si aún no existe, sin consultar la configuración remota. Las sesiones ya abiertas mantienen su catálogo. Para aplicar un cambio, guardar y abrir una nueva sesión del juego; no se fuerza una recarga de la partida activa. En producción se sigue usando la configuración pública existente.

Exportación e importación JSON para respaldar o trasladar el catálogo (hasta 3 MB y 500 eventos). La importación valida antes de pedir confirmación para reemplazar el borrador; no guarda automáticamente. Los errores de formato, cuota o acceso al almacenamiento se muestran sin borrar lo previamente guardado. Si el catálogo local está dañado, se permite abrir el base como borrador sin sobrescribirlo hasta guardar explícitamente.

Verificado con 67 pruebas de carrera: compatibilidad de catálogos, cuatro presentaciones, adaptación de género y escape de HTML, autores estables, equivalencia de resultados al cambiar presentación, almacenamiento aislado, JSON inválido y errores de cuota. La compilación de producción elimina el acceso libre al taller local. No se ha hecho una revisión visual interactiva en navegador.

Crear, duplicar, modificar, pausar o eliminar eventos. Las modificaciones son un borrador hasta pulsar **Publicar configuración**. Eliminar requiere confirmación. Incluye un catálogo inicial de 26 eventos.

**Peso de aparición** es relativo entre eventos elegibles: peso base 20 tiene el doble de opciones que peso 10 en igualdad de condiciones. En retiradas que requieren lesiones, cada lesión por encima del mínimo incrementa el peso un 25%, hasta ×3. No es porcentaje de éxito. Los filtros incluyen edades, categoría, posición, lesiones previas, descanso en años y máximo de apariciones por carrera, nunca género. Una aparición cuenta aunque se rechace. Con descanso 3, deben pasar tres años completos antes de volver a aparecer.

**Porcentaje de éxito** es fijo por defecto. Ajuste opcional: `base + ((habilidad − 50) / 50) × influencia`, redondeado y limitado a 0–100. Se puede elegir cualquiera de las cinco habilidades o la media global. Las bases 0 y 100 se respetan siempre. El juego muestra la probabilidad final antes de aceptar, pero no su desglose ni el riesgo anual calculado del personaje. Los retos decisivos del catálogo utilizan control de presión.

Los campos principales del editor son las cinco habilidades, evolución y riesgo, con unidades y duración explícitas. Los efectos estadísticos y antiguos están en un apartado avanzado. El catálogo publicado existente se respeta: estos cambios no lo reescriben ni publican automáticamente.

Narraciones independientes para éxito, fallo y rechazo; efectos y premio individual opcional para éxito/fallo. El tipo retirada permite terminar la carrera y está restringido a senior desde los 30. La herramienta de prueba simula la decisión, no filtros ni estadísticas anuales.

Un catálogo vacío o sin eventos elegibles genera un evento básico de entrenamiento. No restaura eventos que se hayan eliminado o pausado. El catálogo y las reglas cargados al iniciar la sesión permanecen estables durante la partida: publicar afecta a nuevas sesiones.

Los catálogos anteriores de formato v1 se adaptan en lectura usando la primera decisión de cada evento como reto aceptable. La administración debe revisar efectos y edades antes de publicar v2. Esta adaptación no escribe automáticamente.

## Privacidad y permisos

- Jugar no requiere cuenta. La carrera y el nombre deportivo solo viven en memoria React: no hay guardado remoto, localStorage, sessionStorage ni recuperación de resultados.
- Recargar, cerrar o abandonar la página pierde la carrera. Se muestra aviso de salida y se confirma el reinicio.
- Solo se lee públicamente la configuración desde `game_data`, clave `adn-banquiller:config`. Únicamente administradores pueden publicar, mediante las políticas RLS existentes de Supabase.
- El repositorio de carrera solo expone cargar/publicar configuración. No lee ni escribe `user_game_data`.
- La migración anterior amplió los checks de ambas tablas para admitir este juego. Se conserva como historial; esta versión no usa los registros de carrera anteriores ni elimina datos existentes.
- Las publicaciones del panel usan control de concurrencia con `updated_at` y un token para recuperar respuestas perdidas. No se usan claves privilegiadas.
- La interfaz pública no envía identidad, elecciones ni resultados. Los eventos se resuelven localmente. El encabezado conserva la autenticación general del sitio, que no bloquea el juego.

## Fichajes y clubes (local)

El taller incluye una pestaña **Clubes** y el botón **Nuevo fichaje**. No se añaden clubes ficticios automáticamente ni se modifica el catálogo guardado. Cada club define identificador estable, nombre, nombre del grupo de WhatsApp, logo, contacto para ofertas y nombres opcionales de la plantilla. Los logos se cargan como PNG/JPG/WebP de hasta 200 KB dentro del catálogo, sin subirlos a servicios externos; también se admiten rutas locales `/img/`. Sin logo o con una imagen que falla se muestran las iniciales del club, nunca el escudo del Banquillo como sustituto.

Los eventos `transfer` apuntan a `targetClubId`. Llegan siempre como conversación privada con el contacto del destino, aunque se importe otro formato. El editor permite modificar el mensaje, probabilidades, efectos, filtros, botones y narraciones. `clubId` restringe cualquier evento al equipo actual elegido, o `all` lo habilita en cualquiera. No hay autofichajes ni ofertas antes de los 18: la primera temporada sigue siendo en el equipo del primo. Se puede crear una oferta de regreso al Banquillo.

Por defecto una oferta tiene 100% de éxito y ningún efecto sobre habilidades; la administración puede ajustar ambos. Aceptar y cerrar el fichaje cambia de club **antes de los partidos de esa temporada**, consume el evento anual y simula el año con las mismas reglas deportivas. Rechazar o fallar mantiene el club. No reinicia edad, potencial, habilidades ni historial. El logo del perfil, la cabecera del grupo y los registros de ese año usan la identidad del nuevo club. Las temporadas anteriores conservan su identidad mediante copias independientes. Los mensajes de miembros al azar usan la plantilla de cada club, con «Entrenador» como alternativa si no se han definido nombres.

`clubs` es opcional en los catálogos v2: los antiguos siguen arrancando con la Comunidad del Banquillo. Las partidas capturan su catálogo de clubes al crearse; las ofertas y temporadas conservan sus propias instantáneas. Guardar/importar/exportar incluye clubes y logos, nunca partidas. Se bloquea eliminar clubes referenciados por eventos y siempre se conserva el club inicial. Todo sigue exclusivamente en local.

### Tiers municipales y Blue Devils

Los cuatro tiers representan equipos de la misma competición municipal: tier 1 sin mínimo, tier 2 media 70, tier 3 media 80 y tier 4 media 87. El editor de clubes permite elegir tier y, opcionalmente, un mínimo propio (`minOverall`); cambiar de tier vuelve a su valor por defecto. Clubes antiguos sin tier mantienen sus ofertas sin requisito adicional. El mínimo se comprueba con la media visible al abrir la temporada y también al resolver una oferta. No modifica el éxito negociado ni las habilidades individuales. El tier también determina la fuerza colectiva y las probabilidades de liga descritas abajo. Bajar de media tras fichar no expulsa al personaje.

Blue Devils está incorporado al catálogo base como tier 4, grupo «Blue Devils» y contacto provisional «Coordinación de Blue Devils». Su oferta privada tiene cierre al 100% por defecto. El archivo `/img/blue-devils.png` es una copia íntegra del PNG aportado por el usuario, conservando su canal alfa. No se ha generado ni retocado el logo.

En desarrollo, la primera lectura de un catálogo local anterior incorpora solo este club y su oferta cuando faltan. No escribe en localStorage ni altera los datos personalizados existentes. La marca `clubPackVersion: 1` viaja al guardar/exportar; una vez guardada, eliminar el club o su oferta no los vuelve a incorporar. Las partidas que ya estaban abiertas no reciben la incorporación. La versión de configuración sigue siendo v2.

### Incorporación de Catacrockers

Catacrockers se añade como tier 1 (sin mínimo de media), grupo «Catacrockers» y contacto provisional «Coordinación de Catacrockers». Su oferta privada es editable, está disponible desde los 18 y se cierra al 100% por defecto. `/img/catacrockers.png` conserva íntegramente el PNG con transparencia aportado por el usuario. La segunda incorporación local (`clubPackVersion: 2`) añade únicamente los datos que faltan, conserva clubes y ofertas personalizados/pausados y no recupera un Blue Devils eliminado después de guardar la primera incorporación. No hay escrituras al leer, ni cambios en partidas abiertas.

### Incorporación de GMadrid

GMadrid se incorpora como tier 4, mínimo de media 87, grupo «GMadrid» y contacto provisional «Coordinación de GMadrid». La oferta privada es editable y cierra al 100% por defecto. `/img/gmadrid.png` es una copia exacta del PNG transparente entregado por el usuario. La tercera incorporación local (`clubPackVersion: 3`) respeta configuraciones personalizadas y eliminaciones de incorporaciones anteriores; no escribe al leer ni modifica partidas abiertas.

### Incorporación de Ramones

Ramones se incorpora como tier 2, mínimo de media 70, grupo «Ramones» y contacto provisional «Coordinación de Ramones». La oferta privada es editable y cierra al 100% por defecto. `/img/ramones.png` conserva exactamente el PNG transparente aportado por el usuario. La cuarta incorporación local (`clubPackVersion: 4`) respeta clubes y ofertas personalizados y eliminaciones anteriores, sin escribir al leer ni alterar partidas abiertas.

### Incorporación de Olímpico Alcobendas

Olímpico Alcobendas se incorpora como tier 3, mínimo de media 80, grupo «Olímpico Alcobendas» y contacto provisional «Coordinación de Olímpico Alcobendas». La oferta privada es editable y cierra al 100% por defecto. `/img/olimpico-alcobendas.png` conserva el PNG horizontal transparente aportado por el usuario; los avatares usan `object-fit: contain` para mostrar el logo completo. La quinta incorporación local (`clubPackVersion: 5`) conserva personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de Miyama

Miyama se incorpora como tier 4, mínimo de media 87, grupo «Miyama» y contacto provisional «Coordinación de Miyama». Su oferta privada es editable y cierra al 100% por defecto. `/img/miyama.png` conserva íntegramente el PNG horizontal transparente aportado por el usuario. La sexta incorporación local (`clubPackVersion: 6`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de Prusia

Prusia se incorpora como tier 3, mínimo de media 80, grupo «Prusia» y contacto provisional «Coordinación de Prusia». Su oferta privada es editable y cierra al 100% por defecto. `/img/prusia.png` conserva íntegramente el PNG horizontal transparente aportado por el usuario. La séptima incorporación local (`clubPackVersion: 7`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de Panzer

Panzer se incorpora como tier 3, mínimo de media 80, grupo «Panzer» y contacto provisional «Coordinación de Panzer». Su oferta privada es editable y cierra al 100% por defecto. `/img/panzer.png` conserva íntegramente el PNG transparente aportado por el usuario. La octava incorporación local (`clubPackVersion: 8`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de Vipers

Vipers se incorpora como tier 1, sin mínimo de media, grupo «Vipers» y contacto provisional «Coordinación de Vipers». Su oferta privada es editable, disponible desde los 18 años y cierra al 100% por defecto. `/img/vipers.png` conserva íntegramente el PNG transparente aportado por el usuario. La novena incorporación local (`clubPackVersion: 9`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de White Air

White Air se incorpora como tier 2, mínimo de media 70, grupo «White Air» y contacto provisional «Coordinación de White Air». Su oferta privada es editable y cierra al 100% por defecto. `/img/white-air.png` conserva íntegramente el PNG transparente aportado por el usuario. La décima incorporación local (`clubPackVersion: 10`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de Los Abuelos Dominicanos

Los Abuelos Dominicanos se incorporan como tier 1, sin mínimo de media, grupo «Los Abuelos Dominicanos» y contacto provisional «Coordinación de Los Abuelos Dominicanos». Su oferta privada es editable, disponible desde los 18 años y cierra al 100% por defecto. `/img/los-abuelos-dominicanos.png` conserva íntegramente el PNG transparente aportado por el usuario. La undécima incorporación local (`clubPackVersion: 11`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

### Incorporación de 2metros10

2metros10 se incorpora como tier 3, mínimo de media 80, grupo «2metros10» y contacto provisional «Coordinación de 2metros10». Su oferta privada es editable y cierra al 100% por defecto. `/img/2metros10.png` conserva íntegramente el PNG transparente aportado por el usuario. La duodécima incorporación local (`clubPackVersion: 12`) respeta personalizaciones y eliminaciones anteriores, sin escribir al leer ni modificar partidas abiertas.

## Eventos exclusivos y remitentes del Banquillo

El selector «Solo mientras juegas en» aparece al principio del editor, antes de la presentación. Elegir «La Comunidad del Banquillo · Exclusivo del Banquillo» guarda `clubId: 'cdb'`: el evento solo es elegible mientras el personaje pertenece a ese club. Al fichar fuera deja de aparecer; al regresar puede volver, respetando edades, pausas, descanso y máximo de apariciones. «Cualquier club» mantiene los eventos generales. No se han convertido automáticamente los eventos existentes en exclusivos ni se han inventado nuevas historias.

Se añaden Irene Crecis, Briseida Batalla, Gonzalo Carretero, Nacho Serrano y Daniel Bastardo al reparto narrativo local. Solo se guardan identificador estable y nombre; no se crean fichas deportivas ni se incorporan teléfonos, cuentas o estadísticas. Se conservan los identificadores anteriores y se evita duplicar nombres. Pueden seleccionarse como miembros concretos o participar en los mensajes al azar del Banquillo. Los clubes ajenos siguen usando sus propias plantillas y contactos. Los cuatro mensajes de bienvenida originales permanecen intactos. Una plantilla personalizada de nombres al azar del Banquillo continúa teniendo prioridad cuando se ha configurado.

## Probabilidades de liga municipal

Cada temporada disputada sortea una sola vez si el club del personaje gana la liga. No basta con superar el 75% de victorias, como ocurría antes. No se simula una clasificación compartida de todos los clubes: son probabilidades alternativas de la temporada del club elegido, no cuotas que deban sumar 100% entre el catálogo completo.

| Tier de liga | Media 0 | Media 40 | Media 80 | Media 100 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0,1% | 0,46% | 0,82% | 1% |
| 2 | 2% | 4,4% | 6,8% | 8% |
| 3 | 10% | 16% | 22% | 25% |
| 4 | 25% | 35% | 45% | 50% |

Se interpola de forma lineal: `base + (máximo − base) × media / 100`, usando la media visible al terminar la evolución y los efectos del evento. Las probabilidades no se redondean antes del sorteo. Todos los tiers conservan una oportunidad positiva y ninguno garantiza el título. Son valores iniciales de equilibrio del juego, no datos reales de los clubes.

La Comunidad del Banquillo (`cdb`) utiliza siempre tier 3 de liga por defecto, también en catálogos antiguos sin tier o con tier 1. Esta excepción no altera sus mínimos de fichaje, la media inicial 40 ni el inicio a los 17. Los demás clubes utilizan su tier; sin él se aplica tier 1. Un fichaje exitoso usa el destino para esa misma liga; un rechazo o fallo conserva el origen. El historial ya completado no se reescribe.

El editor de clubes permite ajustar `leagueBaseChance` (media 0) y `leagueMaxChance` (media 100). Son opcionales y aceptan valores entre 0,01 y 99,99; el máximo debe superar al mínimo efectivo. Vacío/null usa el valor del tier. Los valores personalizados se conservan al cambiar de tier y pueden restablecerse con «Usar probabilidades del tier». Viajan al guardar/exportar/importar y se capturan al iniciar la partida, sin migraciones ni escrituras remotas. El panel muestra ejemplos con media 40, 70 y 90; la partida no revela estos porcentajes.

El balance de victorias usa probabilidades por partido de 28/43/58/70% por tier, más `0,2 × (media − 50) + 0,3 × (50 − dificultad)`, limitado a 10–90%. Tras sortear el campeonato, se genera un balance compatible: un campeón tiene al menos el 75% de victorias; un no campeón puede tener un gran año sin recibir el título. Se evitan temporadas perfectas sin título salvo que un evento personalizado imponga tantas canastas ganadoras como partidos. Las victorias explícitas del evento se respetan siempre. La dificultad modifica el balance, no el porcentaje de campeonato configurado.

Solo los campeones reciben «Campeonato de liga municipal», independientemente de la categoría de edad del personaje. Una baja completa no impide que el equipo gane la liga, pero no produce premios individuales; una retirada no sortea título ni juega partidos. El resumen interno del año guarda `leagueTier`, `leagueChance` y `leagueChampion` para verificación, sin añadirlos a la interfaz pública ni al texto compartido.

El MVP no se concede solo por alcanzar una media determinada. Para entrar en el sorteo exige media 85, disputar al menos el 75% del calendario, jugar 28 minutos por partido, lograr un índice de impacto mínimo de 34 (`PTS + 1,2×REB + 1,5×AST + 2×(ROB+TAP)`) y que el equipo gane al menos el 62,5% de sus partidos. Una vez cumplidos esos requisitos, conserva una probabilidad del 35%; por tanto una buena temporada permite optar al premio, pero no lo garantiza. Las temporadas ya resueltas no se recalculan.

## Minutos y protagonismo

Los minutos por partido dependen de la media final del año, la adaptación inicial y el nivel competitivo del club: `12 + (media − 40) × 0,55 − adaptación − (tier − 1) × 1,5 − penalización por nivel bajo + variación`. La adaptación resta 4 minutos a los 17, 3 a los 18, 2 a los 19 y 1 a los 20; desde los 21 no resta. La penalización por nivel bajo es `5 × limitar((65 − media) / 21, 0, 1)`: resta cinco minutos hasta media 44 y desaparece gradualmente al alcanzar 65. La variación anual va de −2,5 a +2,5 minutos. Se redondea al entero y limita a 0–38 minutos. Si se obtienen cero, no se contabilizan partidos jugados ni estadísticas individuales; los partidos disponibles sin participación se registran como `gamesBenched`, sin confundirlos con bajas por lesión (`gamesMissed`). Son parámetros de equilibrio del juego, no estadísticas reales.

La Comunidad utiliza su nivel competitivo de tier 3: con 17 años y media 44 se obtienen 0–5 minutos. A igual edad, mayor media permite más protagonismo; a igual media, un club más fuerte ofrece menos minutos. Un joven excepcional puede ser titular. No se modifica el potencial, la progresión, la disponibilidad médica ni las probabilidades de liga. Puntos, rebotes, asistencias, robos y tapones se escalan por los minutos; los efectos explícitos de eventos se siguen sumando si hay participación. El género no interviene. Los fichajes usan el club de destino ese mismo año; las temporadas ya resueltas conservan su instantánea.

## Vitrina de trofeos originales

Ampliación: Máximo reboteador, Mejor defensor, Sexto hombre y Copa Interdistritos llevan la colección a diez diseños. La Copa solo se disputa tras ganar la liga de ese año, con una probabilidad inicial del 1–12% según media. Sus dos extremos se ajustan en Simulación anual. Reglas, compatibilidad, rol de banquillo y prompts en `docs/trofeos-interdistritos.md`.

Colección visual local v2: copa municipal de plata, balón MVP dorado, copa cónica de anotación, placa de quinteto con cinco estrellas grabadas, copa baja de asistencias y copa de bronce especial. Acabado deportivo sobrio, frontal y sin adornos de fantasía, siguiendo el tratamiento de miniaturas de la referencia. Imágenes raster originales generadas, no extraídas de las referencias ni réplicas de copas reales. Los archivos y prompts se documentan en `docs/trofeos-generados.md`; v1 se conserva sin usarse.

La cabecera muestra miniaturas de los títulos y premios individuales junto a sus respectivos contadores; el cuaderno repite, a la derecha de Junior/Senior, únicamente las miniaturas obtenidas en esa temporada. El palmarés y el resumen final usan los mismos diseños a mayor tamaño. Colectivos e individuales permanecen separados. Solo se renderizan los premios obtenidos: sin siluetas bloqueadas, huecos de premios futuros ni información nueva sobre las habilidades. Un trofeo repetido se agrupa con contador ×2, ×3…; pulsar su elemento desplegable (también con teclado) muestra los títulos originales, edades y clubes. Se reconocen nombres históricos con categoría Junior/Senior. Los premios especiales con distintos nombres permanecen separados aunque compartan la copa de bronce como imagen.

Panel → Trofeos ofrece una muestra de los diez diseños y repeticiones ficticias. Sus datos están aislados de la carrera y nunca se guardan, conceden ni comparten como resultados. Abrir la muestra no cambia el motor, las probabilidades ni el palmarés real. Si falla una imagen, se conserva el título accesible y se usa el icono genérico de trofeo. Todo sigue local.

## Compartir carrera

Al terminar: X, Facebook, Bluesky, WhatsApp, Telegram y Reddit, como en 18-0; también compartir nativo cuando está disponible. Permite copiar resumen, trayectoria año a año o enlace al juego.

Se comparte texto, no una carrera alojada. El enlace siempre apunta a la URL pública del juego, nunca a localhost ni a un perfil. Facebook puede mostrar solo el enlace. El texto no sale de la página hasta una acción explícita de compartir o copiar.

## Verificación y despliegue

Revisión de presentaciones: las jugadas decisivas (`winner`, `pressure`, `zone`, `comeback`) se presentan en pista; las charlas técnicas, de adaptación, recuperación y retirada usan el formato presencial `bench`, con lugar y remitente propios. El primo escribe en privado sobre los estudios; organizar sesiones de verano y el torneo de La Elipa conserva el grupo. La jornada de iniciación comparte una publicación de Instagram con comentario independiente. Los fichajes siguen siendo mensajes privados. El balance anual posterior continúa en el grupo como resumen, separado de la puesta en escena del evento.

«La Caña de Gonzalo» es una localización presencial seleccionable desde el formato de presentación. Usa la imagen local optimizada `public/img/career-locations/la-cana-de-gonzalo.jpg`, fija el nombre del lugar para evitar variantes y permite elegir qué miembro o personaje externo habla. La conversación se representa sobre la escena del bar, sin interfaz de WhatsApp. El evento inicial de liderazgo `captain` utiliza este entorno por defecto; cambiar de formato es puramente narrativo y no consume azar ni modifica sus efectos, probabilidad o filtros.

En local, `includeEventPresentations` adapta al leer únicamente presentaciones genéricas de eventos iniciales conocidos en catálogos antiguos. No escribe almacenamiento, no recupera eventos eliminados y no altera efectos, porcentajes, pausas ni condiciones. Conserva mensajes, remitentes, lugares, publicaciones y marcadores personalizados. `presentationPackVersion: 1` viaja con el catálogo actualizado al guardar/exportar; después se puede volver a elegir WhatsApp deliberadamente sin que la adaptación lo deshaga. Las partidas ya abiertas conservan su catálogo y escenas capturadas; el cambio se recoge al cargar de nuevo el catálogo, sin reescribir temporadas anteriores. Verificación por pruebas del catálogo y renderizado de todos los eventos presenciales, sin inspección de navegador ni acceso al almacenamiento real del usuario.

Encuadre del modo público: contenedor de `100dvh` con cabecera de altura natural y espacio restante para el juego. En ordenador (desde 900 px), portada y bienvenida usan dos columnas; la partida mantiene ficha y respuestas dentro del encuadre. El cuaderno desplaza temporadas, recuerdos y palmarés en su interior. Los trofeos detallados ya no hacen crecer la ficha durante la partida. Mensajes o escenas excepcionalmente largos tienen desplazamiento interno accesible por teclado, con respuestas fuera de esa zona. El resumen final también se consulta dentro del marco. En móvil se conserva una columna y tamaño legible con desplazamiento dentro de la superficie del juego. El panel de administración mantiene su distribución y pie habituales; estos límites no afectan al resto de la web. Verificación mediante renderizado y contrato CSS, sin prueba visual de navegador en este ajuste.

`npm run test:career`: motor, probabilidades, filtros, rechazo, lesiones, retirada, categorías, historial, resumen, enlaces de compartir, configuración pública y permisos/concurrencia de publicación con cliente de prueba. Incluye 100.000 perfiles, 1.000 carreras para comprobar la progresión exacta, otras 100 carreras completas, 10.000 sorteos de eventos reproducibles y renderizado de las pantallas mediante React en servidor.

`npm run build`: compilación de producción. Estas pruebas no sustituyen una revisión visual e interactiva en navegador.

Mantener todo exclusivamente en local hasta autorización explícita del usuario. No publicar la web, desplegar, subir cambios ni modificar la configuración remota como parte de estos ajustes. Mantener el despliegue Vercel existente cuando llegue esa autorización.
