# Poderes de Banquiger: implementación

Los 32 poderes de la propuesta se encuentran en `src/utils/banquigerPowers.js`. El catálogo sustituye las cuatro cartas antiguas y conserva únicamente nombres, descripciones y activación personalizada. Los efectos, objetivos, rarezas y límites mantienen el equilibrio simulado.

- La administración publica una jornada después de registrar resultado y estadísticas oficiales. El cálculo usa las alineaciones registradas, la puntuación base y todas las cartas compartidas de ese partido.
- La publicación suma puntos a la clasificación general y reparte una carta a los tres últimos de **esa jornada**, con al menos cuatro equipos completos. Los empates se ordenan por el identificador estable del equipo.
- La siguiente jornada es el siguiente partido efectivo del calendario masculino: los descansos no consumen cartas. No hay reparto inicial sin una clasificación definitiva anterior.
- Probabilidades común/raro/épico/legendario: antepenúltimo 64/26/8/2; penúltimo 56/30/11/3; último 48/32/15/5. Dentro de la rareza, 60% propios y 40% ataques. Se excluyen las tres últimas cartas entregadas y los ataques que requieren más rivales elegibles de los disponibles. Si administración desactiva todas las cartas elegibles de un grupo, se sortea entre las restantes activas y elegibles.
- Una activación por equipo y jornada, antes del comienzo del partido. Inventarios privados, registro compartido de activaciones, persistencia entre dispositivos y protección contra cartas ajenas, reutilización y puntuaciones manipuladas.
- Los ataques solo afectan a la plantilla fantasy objetivo, aunque otros managers tengan al mismo jugador. Todos los efectos se calculan sobre la puntuación original, sin multiplicar bonus anteriores. Daño conjunto máximo de 60% de cada puntuación positiva y 24 puntos por equipo.
- La selección se guarda por jornada; al empezar el partido se bloquean los cambios de alineación en el servidor. Si no se cambia el equipo, se conserva la alineación anterior. Publicar dos veces no duplica puntos ni premios. Las cartas no se acumulan para otras jornadas.
- Durante el mercado pueden cambiarse plantillas; un objetivo que abandona la plantilla deja de recibir el efecto. Cada activación es definitiva y no se puede volver a elegir el objetivo.

## Validación

`node --test tests/banquigerPowers.test.js tests/banquigerSchedule.test.js`: 14 pruebas, incluyendo los 32 efectos, caps, múltiples rivales, titular/suplente, no participantes y migración del catálogo.

`supabase/banquiger-powers-verification.sql`: fixtures transaccionales que terminan con ROLLBACK. Verifica reparto único, inventarios privados, activación de todos los efectos y rechazo de cartas ajenas, reutilizadas y caducadas, cambios de alineación fuera de plazo y puntos falsificados.

`npm run test:career`: las 153 pruebas del modo carrera siguen pasando. `npm run build` compila correctamente.

## Modo carrera

La ruta pública `/adn-banquiller` redirige al inicio en producción; se han retirado los enlaces del menú, cuenta, pie y sitemap. El código, la configuración, el editor protegido y el acceso de desarrollo se conservan para retomar el trabajo.

## Posiciones dobles

Se activan por defecto Base/Escolta, Escolta/Base, Alero/Escolta, Ala-Pívot/Pívot y Pívot/Ala-Pívot. La configuración de Banquiger guarda `position`, `secondaryPositions` (máximo una) y `positionsVersion: 2`; una lista vacía significa que administración ha elegido una sola posición. En el panel Mercado puede editarse la posición principal y secundaria de cada jugador, incluidos los personalizados.

El quinteto busca la asignación que cubra más puestos sin duplicar jugadores. A igualdad de cobertura prefiere las posiciones principales y después el orden de selección por puesto. Así se reasigna un jugador polivalente cuando reservarlo en su posición principal impediría completar el equipo. Se mantienen cinco titulares y dos suplentes, precios, presupuesto y multiplicadores.

La lógica compartida en `banquigerPositions.js` también decide titulares en el cálculo de puntos y poderes. Su equivalente SQL valida las siete fichas y las cartas de titular/suplente en el servidor. La migración adicional está en `supabase/banquiger-dual-positions.sql`.

Validación: 19 pruebas de posiciones, poderes y calendario; 80 plantillas de contraste con idénticas asignaciones entre JavaScript y SQL; las siete comprobaciones transaccionales de cartas, privacidad y cierre de mercado siguen pasando.


## Alineación libre y movimientos (14/10/2026)

- Se mantienen siete fichajes, cinco titulares y dos suplentes, con el presupuesto configurado. Cualquier jugador puede ocupar cualquier puesto.
- Solo los titulares en posición principal o secundaria reciben el multiplicador de estadísticas sin puntos (por defecto ×2). Titulares fuera de posición y suplentes puntúan ×1; puntos anotados siempre ×1. Penalizaciones y efectos que dependen de estadísticas usan el multiplicador efectivo.
- `lineup_slots` guarda siete IDs o nulos en orden Base, Escolta, Alero, Ala-Pívot, Pívot, Suplente 1, Suplente 2. Se valida que cada fichaje aparezca una sola vez. `lineups[jornada][equipo]` congela los puestos junto a las plantillas históricas; los lectores anteriores de `snapshots` conservan su formato.
- Arrastre con Pointer Events para ratón, lápiz y dedo; captura del puntero, intercambio en destinos ocupados, desplazamiento al borde de pantalla mediante arrastre de las tarjetas. El cierre de mercado se comprueba tanto en cliente como en servidor, incluidos cambios que solo afectan a los puestos.
- Aplicar `supabase/banquiger-free-lineups.sql` después de los scripts anteriores de poderes y posiciones dobles. La migración conserva las alineaciones existentes y sus snapshots antes de introducir el emparejamiento libre.
- Verificación: 21 pruebas de calendario/posiciones/poderes; 32 combinaciones comparadas entre JavaScript y SQL; scripts `banquiger-free-lineups-verification.sql` y `banquiger-powers-verification.sql` en transacciones con rollback. Arrastre, recuperación de ×2 en puesto natural, intercambio con suplente y bloqueo comprobados en navegador, también a 390 px de ancho. No se modificaron alineaciones reales durante las pruebas.

La interacción de la alineación es exclusivamente por arrastre; se han retirado los botones Mover y Colocar aquí.
