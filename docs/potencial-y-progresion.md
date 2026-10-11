# Potencial y progresión: investigación para ADN Banquiller

Consultado el 31 de agosto de 2026. Se ha leído el JavaScript público entregado por ambos sitios, sin entrar en cuentas, jugar partidas ni ejecutar su código. Describe esas versiones, no una regla universal de los simuladores. No se ha copiado su implementación al proyecto.

## The Real MVP: potencial individual

Su generador sortea estas bandas al crear el personaje:

| Perfil | Probabilidad | Potencial sorteado |
| --- | ---: | ---: |
| Limitado | 33% | 68–75 |
| Rotación | 34% | 76–83 |
| Titular | 21% | 84–90 |
| Estrella | 10% | 90–96 |
| Generacional | 2% | 96–99 |

También sortea ritmo de desarrollo (0,72–1,30), profesionalidad (0,88–1,12) y desfase de maduración (−1 a +3 años). La mejora se frena cerca del potencial. Intervienen edad, posición, minutos, rendimiento, lesiones, recuperación y decisiones. Conserva decimales internamente, aunque muestra una media redondeada. El potencial orienta la trayectoria, no garantiza alcanzarlo ni constituye un techo absolutamente inamovible.

Fuente: [The Real MVP](https://therealmvp.skyhook.es/), [módulo público examinado](https://therealmvp.skyhook.es/_next/static/chunks/page-DtaZ-hAr.js), generador de potencial y resolución anual.

## Copero: curvas y sorteos por etapas

Para jugadores de campo asigna una curva precoz (10%), normal (80%) o tardía (10%), a partir de la semilla de la partida. Los porteros tienen una curva específica. En la lógica examinada no aparece un techo individual de potencial equivalente al anterior: sortea cambios dentro de tablas por edad y perfil, con media limitada a 40–99.

El cambio se calcula para ciclos de dos años y se reparte entre temporadas. Por ejemplo, la curva normal usa +3 a +14 para el ciclo que apunta a los 20 años. Por eso no hay que interpretar ese intervalo como crecimiento anual. Poco protagonismo puede empeorar el sorteo; una suspensión impide aplicar mejoras positivas. Los eventos añaden otros modificadores.

Fuente: [simulador de Copero](https://copero.com.ar/juegos/simulador-carrera), [módulo público examinado](https://copero.com.ar/assets/CareerSimulatorPage-D1pHETwp.js), tablas de desarrollo y funciones de ciclo anual.

## Qué existe ahora en nuestro juego

La invitación municipal y el inicio a los 17 se mantienen. Sigue habiendo un evento por año hasta los 40 y posibles retiradas desde los 30. Se ha implantado el sistema aprobado por el usuario, con este reparto propio (distinto de las referencias):

| Potencial | Probabilidad |
| --- | ---: |
| 55–69 | 30% |
| 70–79 | 50% |
| 80–89 | 18% |
| 90–97 | 2% |

Se sortea primero la banda y después un entero uniforme dentro de ella. Además, se sortean de forma independiente un ritmo entre 0,8 y 1,2 y una maduración precoz (20%), normal (60%) o tardía (20%). Los dos últimos repartos son parámetros iniciales de equilibrio, no reglas de los juegos de referencia. Todos comienzan con media 40.

Los rasgos permanecen estables durante toda la carrera, no se deducen del nombre, sexo, posición o estilo, y no se muestran en pantalla, historial ni texto compartido. «Oculto» significa oculto al jugador en la interfaz, no un secreto protegido: la simulación vive en el navegador.

## Evolución natural implantada

La tabla base depende de edad y maduración. Como referencia, la curva normal crece 4 puntos/año a los 17–19, 3,2 a los 20–22, 2,2 a los 23–25 y 1,1 a los 26–28; se estabiliza en +0,2 a los 29–31 y pasa a declive −0,7 a los 32–34, −1,5 a los 35–37 y −2,3 a los 38–40. No son incrementos finales garantizados.

La precoz crece más al principio y entra antes en estabilidad/declive; la tardía empieza más despacio, acelera a los 23–25 y retrasa el declive. Las tablas completas están en `src/utils/careerDevelopment.js`.

Durante las etapas de mejora:

1. Base por edad y maduración × ritmo, más variación uniforme de −0,35 a +0,35; nunca por debajo de cero en estas etapas.
2. Multiplicar por el margen: distancia al potencial / 12, limitado a 0–1.
3. Multiplicar por salud: cada lesión anterior resta un 7% del factor, con mínimo del 55%.
4. Multiplicar por la fracción de temporada disponible después de las bajas explícitas y del riesgo anual de lesión.
5. Multiplicar por experiencia de juego: `0,85 + 0,15 × limitar(minutos del año anterior / 24, 0, 1)`. Sin participación sigue existiendo un 85% del crecimiento por entrenar; desde 24 minutos se mantiene el 100%, sin bonificación por acumular puntos. En el primer año, sin historial compatible o tras una temporada completa de baja médica se usa 1. Se toma el año anterior para evitar calcular minutos y evolución circularmente. No modifica el declive.
6. Multiplicar por `máximo(0, 1 + evoluciónDelEvento / 100)`. El modificador solo dura esa temporada.
7. Limitar el crecimiento al margen restante; si ya se supera el potencial, no subir naturalmente ni recortar la media hasta ese potencial.

En declive se usa la base negativa más la misma variación anual y un desgaste de −0,05 por lesión anterior, hasta ocho lesiones. El declive no se anula por haber perdido partidos.

La evolución se acumula con dos decimales y desplaza las cinco habilidades por igual. Después se aplican los cambios específicos del evento a cada habilidad y su límite 0–100. La media se recalcula como promedio ponderado según posición; la interfaz redondea a enteros. Los valores de habilidades, el desglose exacto y el riesgo calculado permanecen ocultos, también en el historial y en el texto compartido. Solo se descubren las estadísticas de partidos al terminar cada año. Las mejoras de habilidades pueden superar el potencial y no se revierten automáticamente el año siguiente. La edad, lesiones y eventos posteriores sí pueden reducirlas.

## Habilidades y media ponderada

Pesos iniciales de equilibrio, propios de este juego:

| Posición | Tiro | Pase | Rebote | Defensa | Control de presión |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base | 20% | 35% | 10% | 20% | 15% |
| Escolta | 40% | 15% | 10% | 20% | 15% |
| Alero | 30% | 15% | 20% | 25% | 10% |
| Ala-pívot | 20% | 10% | 30% | 30% | 10% |
| Pívot | 15% | 5% | 35% | 35% | 10% |

Por ejemplo, +6 de tiro aporta +2,4 de media exacta a un escolta y +0,9 a un pívot, antes de límites. Mejora la anotación en ambos; no añade seis puntos por partido. Pase genera asistencias, rebote genera rebotes y defensa genera robos y tapones. Los minutos dependen de la media y pueden afectar indirectamente todos los totales. El control de presión reduce la variación ofensiva y ajusta el éxito de los eventos configurados para usarlo.

Habilidades son permanentes; evolución (%) y riesgo (puntos porcentuales) son anuales. Las reglas del sorteo de lesión se documentan en [adn-banquiller.md](adn-banquiller.md). El panel permite modificar estos efectos por separado para éxito y fallo, y conserva efectos antiguos en opciones avanzadas. Estas mecánicas son un diseño propio inspirado en la petición, no una reproducción del código de las referencias.

## Equilibrio de estadísticas

La media no se convierte directamente en puntos: determina los minutos junto a edad y club; cada habilidad genera su propia producción por 24 minutos. Con `s = habilidad / 100`, las nuevas curvas son:

- Puntos: `18 × tiro^4 × forma`.
- Rebotes: `(0,3 + 5,2 × rebote^1,7) × posición` (1,45 interiores; 0,8 exteriores).
- Asistencias: `(0,15 + 3,5 × pase^1,8) × posición` (1,55 bases; 0,75 resto).
- Robos: `0,08 + 1,4 × defensa^1,8`.
- Tapones: `(0,02 + 0,8 × defensa^2) × posición` (1,35 interiores; 0,45 exteriores).

La forma varía simétricamente alrededor de 1, con amplitud de `0,18 − 0,1 × control de presión`. Son curvas propias de equilibrio, no una calibración con datos reales de liga municipal. Sustituyen la anotación lineal antigua y el primer ajuste de 8–11 puntos, todavía demasiado alto para el criterio del usuario. El perfil equilibrado de media 70 ahora ronda 4–6 puntos con sus minutos habituales; en el Banquillo, a los 25 años y con forma neutra, da unos 4,7. Un especialista con mucho más tiro que el resto de habilidades puede superar esa referencia sin que cambie el valor de su media. No se impone un tope artificial de puntos por media. Esta revisión solo ajusta anotación: mantiene los minutos, las otras estadísticas, el potencial y la evolución.

Los totales se calculan a partir de estos ritmos, minutos y partidos, y después se añaden los efectos explícitos del evento si hay participación. Se mantienen los umbrales de premios; Sexto hombre exige un suplente realmente productivo, no cualquier jugador de media 65. Pruebas de equilibrio: 4.000 temporadas de media 70 entre cinco posiciones y cuatro tiers, 1.200 temporadas en distintos niveles, curvas monótonas y crecimiento por experiencia. Las reglas de inicio 17/40, potencial 30/50/18/2 y 0–5 minutos para 17/44 en el Banquillo permanecen. Las temporadas resueltas no se recalculan.

## Retirada, compatibilidad y alcance

Desde los 30, las retiradas que exigen lesiones ganan un 25% de peso relativo por cada lesión por encima de su mínimo, hasta ×3. Siguen respetando edades, filtros, descansos y máximos. Esto cambia la posibilidad de aparición, no el porcentaje de éxito al aceptar; rechazar permite continuar.

Las carreras nuevas usan formato interno v4; el catálogo de eventos sigue en v2, con nuevos campos opcionales y sin cambios remotos. Una partida antigua aún abierta puede recibir sus rasgos una sola vez y adoptar habilidades uniformes equivalentes a su media al resolver su siguiente temporada, conservando los años anteriores. No existe guardado ni carga de carreras.

Todo permanece exclusivamente en local. Las curvas se podrán equilibrar cuando se definan otros clubes, sin cambiar el reparto de potencial aprobado salvo nueva indicación del usuario.
