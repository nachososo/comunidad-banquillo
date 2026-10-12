# Propuesta de poderes Banquiger

Borrador de diseño del 12/10/2026. No cambia el catálogo, la lógica ni los datos de la web publicada.

32 cartas: 16 propias y 16 contra rivales. Una carta para cada uno de los tres últimos de la clasificación definitiva de la jornada; se utiliza en la siguiente jornada con partido. Los descansos no generan entregas. Las cartas no se conceden por el puesto provisional ni por la clasificación acumulada.

## Reglas del experimento

- 7 jugadores, 5 titulares por posición y 2 suplentes; presupuesto 5 M.
- Puntuación original F = puntos + valoración sin puntos × (2 si titular; 1 si suplente), como en Banquiger.
- Los porcentajes se aplican a F positiva. Los bonus adicionales no reciben otro x2.
- Objetivos fijados antes del partido usando estadísticas de entrenamiento, sin conocer el resultado que se evalúa.
- Solo se atacan managers que acabaron por encima del receptor en la jornada anterior. La simulación elige adversarios cercanos por previsión de puntuación; no presupone que el manager conoce los resultados siguientes.
- Tope por carta: 6 / 10 / 16 / 24 según rareza, compartido entre todos los objetivos.
- Un jugador no pierde más del 60% de su F positiva entre todos los ataques. Un manager no pierde más de 24 puntos por ataques combinados. Los límites se calculan sobre puntuaciones originales y los objetivos pertenecen al equipo fantasy señalado, no a todos los managers que tengan ese jugador.
- Se juega una sola carta. Las tres cartas de los receptores se resuelven simultáneamente.

## Catálogo simulado

Impacto medio: puntos añadidos al equipo propio o puntos restados entre todos los rivales afectados. No equivale a puntos ganados por el receptor de un ataque. P95: impacto que no se supera en el 95% de los escenarios, no el máximo absoluto.

### Comunes

| Poder | Tipo | Efecto | Impacto medio | P95 | Sin efecto | Sube puestos por sí solo |
|---|---|---|---:|---:|---:|---:|
| Grito de la grada | Propio | Un jugador propio que dispute minutos recibe +4 puntos. | 3,2 | 4,0 | 20,9% | 44,7% |
| Red de seguridad | Propio | Eleva hacia 4 la puntuación de un titular propio que juegue, con un máximo de +6. | 1,3 | 6,0 | 73,0% | 16,0% |
| Pase extra | Propio | +2 puntos por asistencia de un jugador propio; máximo +6. | 1,6 | 6,0 | 60,0% | 21,4% |
| Dueño del rebote | Propio | +0,5 puntos por rebote de un jugador propio; máximo +6. | 3,3 | 6,0 | 20,9% | 43,0% |
| Mano encima | Rival | Un jugador rival pierde el 10% de su puntuación positiva; máximo 6. | 0,9 | 2,4 | 46,6% | 2,8% |
| Línea vigilada | Rival | Si juega, un jugador rival pierde 2 puntos y 1 por triple anotado; máximo 6. | 1,4 | 4,0 | 43,4% | 3,9% |
| Cortar el pase | Rival | Un jugador rival pierde 1 punto por asistencia; máximo 6. | 0,7 | 5,0 | 72,4% | 1,9% |
| Banquillo frío | Rival | Un suplente rival pierde el 20% de su puntuación positiva; máximo 6. | 0,7 | 3,0 | 58,7% | 1,8% |

### Raros

| Poder | Tipo | Efecto | Impacto medio | P95 | Sin efecto | Sube puestos por sí solo |
|---|---|---|---:|---:|---:|---:|
| Turbo | Propio | Un jugador propio suma el 25% de su puntuación positiva; máximo +10. | 2,1 | 6,0 | 46,5% | 26,7% |
| Sexto hombre | Propio | Un suplente que juegue recibe +2 y el bonus positivo de titular sin puntos; máximo +10. | 1,6 | 7,0 | 50,4% | 21,8% |
| Segunda oportunidad | Propio | Devuelve la mitad de las penalizaciones por tiros fallados de un jugador propio; máximo +10. | 3,4 | 9,0 | 26,2% | 41,4% |
| Pareja conectada | Propio | Dos jugadores propios suman el 15% de sus puntuaciones positivas; máximo +10 conjunto. | 1,9 | 5,0 | 26,8% | 26,6% |
| Defensa pegajosa | Rival | Un jugador rival pierde el 25% de su puntuación positiva; máximo 10. | 2,2 | 6,0 | 46,6% | 6,0% |
| Dos contra uno | Rival | Dos jugadores de un rival pierden el 15% de sus puntuaciones positivas; máximo 10 conjunto. | 1,9 | 5,0 | 27,7% | 5,0% |
| Sin manos rápidas | Rival | Un jugador rival pierde los puntos por robos y tapones, incluido x2 de titular; máximo 10. | 1,4 | 6,0 | 65,4% | 3,4% |
| Fuego cruzado | Rival | Un jugador de cada uno de dos rivales pierde el 10%; máximo 10 entre ambos. | 1,8 | 5,7 | 42,4% | 5,4% |

### Épicos

| Poder | Tipo | Efecto | Impacto medio | P95 | Sin efecto | Sube puestos por sí solo |
|---|---|---|---:|---:|---:|---:|
| Modo héroe | Propio | Un jugador propio suma el 50% de su puntuación positiva; máximo +16. | 4,3 | 12,0 | 46,5% | 36,4% |
| Dúo eléctrico | Propio | Dos jugadores propios suman el 30% de sus puntuaciones positivas; máximo +16 conjunto. | 3,7 | 9,9 | 26,8% | 40,1% |
| Juego colectivo | Propio | Suma un 50% extra de los puntos por rebotes y asistencias de un jugador propio, incluido x2; máximo +16. | 7,7 | 16,0 | 20,9% | 62,2% |
| Revulsivo | Propio | Un suplente propio duplica su puntuación positiva; máximo +16. | 3,3 | 15,0 | 60,2% | 27,2% |
| Marcaje especial | Rival | Un jugador rival pierde la mitad de su puntuación positiva; máximo 16. | 4,3 | 12,0 | 46,6% | 11,1% |
| Triángulo defensivo | Rival | Tres jugadores de un rival pierden el 20%; máximo 16 conjunto. | 3,4 | 8,2 | 11,2% | 9,5% |
| Doble presión | Rival | Un jugador de cada uno de dos rivales pierde el 20%; máximo 16 conjunto. | 3,5 | 11,4 | 42,4% | 9,2% |
| Sin galones | Rival | Un titular rival pierde solo su bonus x2 de valoración sin puntos; máximo 16. | 2,8 | 11,0 | 46,9% | 7,6% |

### Legendarios

| Poder | Tipo | Efecto | Impacto medio | P95 | Sin efecto | Sube puestos por sí solo |
|---|---|---|---:|---:|---:|---:|
| Capitán de remontada | Propio | Un jugador propio duplica su puntuación positiva; máximo +24. | 8,2 | 24,0 | 46,5% | 43,3% |
| Todos a una | Propio | La plantilla propia suma el 30% de las puntuaciones positivas; máximo +24 total. | 8,0 | 18,0 | 3,0% | 66,3% |
| Socios imparables | Propio | Dos jugadores propios suman el 75% de sus puntuaciones positivas; máximo +24 conjunto. | 9,1 | 24,0 | 26,8% | 54,8% |
| Rescate del titular | Propio | Eleva hacia 15 la puntuación de un titular propio que juegue, con un máximo de +24. | 5,8 | 21,0 | 57,2% | 36,4% |
| Candado | Rival | Un jugador rival pierde el 60% de su puntuación positiva; máximo 24. | 5,2 | 14,4 | 46,6% | 12,8% |
| Zona asfixiante | Rival | La plantilla de un rival pierde el 20% de las puntuaciones positivas; máximo 24 total. | 5,4 | 12,0 | 2,9% | 15,0% |
| Presión en tres pistas | Rival | Un jugador de cada uno de tres rivales pierde el 20%; máximo 24 entre todos. | 5,5 | 16,2 | 37,0% | 12,9% |
| Pareja desconectada | Rival | Dos jugadores de un rival pierden la mitad de sus puntuaciones positivas; máximo 24 conjunto. | 6,3 | 16,5 | 27,7% | 16,0% |

## Probabilidad de entrega

Se sortea rareza; después, propio (60%) o rival (40%); finalmente una de las cuatro cartas de esa combinación. La probabilidad es de recibir la carta, no de que su efecto funcione: una vez activada, su fórmula se aplica sin un segundo sorteo.

| Puesto de la jornada anterior | Común | Raro | Épico | Legendario |
|---|---:|---:|---:|---:|
| Antepenúltimo | 64% | 26% | 8% | 2% |
| Penúltimo | 56% | 30% | 11% | 3% |
| Último | 48% | 32% | 15% | 5% |

Probabilidad nominal de **cada carta** para el último, antes de excluir repeticiones: común propia 7,2%, común rival 4,8%; rara propia 4,8%, rara rival 3,2%; épica propia 2,25%, épica rival 1,5%; legendaria propia 0,75%, legendaria rival 0,5%. Suman 100% entre las 32 cartas.

Se excluyen las cartas recibidas en las tres últimas entregas del mismo usuario; el reparto se vuelve uniforme entre las elegibles dentro de la rareza/tipo sorteados. Eso modifica las probabilidades individuales condicionadas al historial, pero mantiene los porcentajes de rareza y tipo. Una carta caduca al terminar la siguiente jornada jugable y no se acumula; máximo una entrega y uso por usuario/jornada. El sorteo debería ejecutarse una sola vez en servidor y guardarse. Para ligas menores de cuatro managers habría que definir otra regla para no premiar también al ganador.

## Simulación ejecutada

Semilla 20261012. 5000 ligas sintéticas de 10 managers; 480.000 evaluaciones aisladas y 15.000 entregas con tres cartas activadas simultáneamente por liga.

Entrenamiento: partidos 1, 3, 4, 5, 6, 7, 9, 11. Validación: partidos 12, 14, 15, 18, 19, 20. Todos pertenecen a 2025/2026. Se excluyen los partidos sin estadísticas avanzadas en su totalidad. Una fila individual ausente se modela como cero; una fila de puntos sin avanzadas conserva solo sus puntos. Los precios se calculan con las medias de entrenamiento y la función de precios del proyecto. La selección de equipos es aleatoria dentro de las restricciones; no reproduce plantillas reales de usuarios. Los partidos de validación no alimentan la selección de objetivos.

| Resultado | Valor |
|---|---:|
| Puntuación media sin cartas | 26,9 |
| Mediana sin cartas | 26,0 |
| P95 sin cartas | 64,0 |
| Receptores que suben puestos gracias al conjunto de cartas | 20,9% |
| Mejora media de puesto por receptor | 0,3 |
| Bonus propio medio por entrega, incluyendo las cartas negativas | 1,6 |
| Daño a rivales medio por entrega, incluyendo las cartas positivas | 0,7 |

La simulación de variedad realizó 10.000 secuencias de diez entregas a un último clasificado recurrente, con veto de las tres cartas anteriores: 8,9 cartas distintas de media; entre 5 y 10. Esto mide diversidad de entregas, no el número de cartas que recibirá cada manager en una temporada.

## Ejemplo extraído de una liga simulada

Partido histórico 20, contra Gaychester United BC. Ejemplo escogido para mostrar cambios visibles; no representa el resultado medio. Equipos ficticios.

- Equipo 7, puesto anterior 8: **Dueño del rebote**. Equipo 7: +6,0 puntos.
- Equipo 5, puesto anterior 9: **Red de seguridad**. Equipo 5: +6,0 puntos.
- Equipo 2, puesto anterior 10: **Mano encima**. Equipo 10: -2,4 puntos.

| Equipo | Puesto anterior que decide la entrega | Puntos sin poderes | Puntos con poderes | Puesto sin poderes → con poderes |
|---|---:|---:|---:|---|
| 9 | 2 | 78,0 | 78,0 | 1 → 1 |
| 7 | 8 | 68,0 | 74,0 | 4 → 2 |
| 3 | 7 | 72,0 | 72,0 | 2 → 3 |
| 1 | 1 | 70,0 | 70,0 | 3 → 4 |
| 2 | 10 | 56,0 | 56,0 | 5 → 5 |
| 6 | 4 | 51,0 | 51,0 | 6 → 6 |
| 5 | 9 | 42,0 | 48,0 | 10 → 7 |
| 4 | 3 | 46,0 | 46,0 | 7 → 8 |
| 8 | 5 | 46,0 | 46,0 | 8 → 9 |
| 10 | 6 | 46,0 | 43,6 | 9 → 10 |

## Viabilidad y decisiones pendientes

- Las cartas propias favorecen más la remontada personal. Un ataque puede recortar al rival sin hacer subir al receptor: por eso propongo 60% propias y 40% negativas.
- Grito de la grada, Dueño del rebote, Segunda oportunidad y Todos a una son bastante consistentes en estos escenarios.
- Red de seguridad, Cortar el pase, Banquillo frío y Sin manos rápidas son cartas situacionales; no deberían describirse como equivalentes a las más consistentes aunque compartan rareza. Permitir elegir el objetivo da estrategia, pero la muestra no garantiza que siempre haya un buen objetivo.
- Juego colectivo sigue siendo de los épicos más fuertes. Si en 2026/2027 domina, reducir su límite de 16 a 12 sería el primer ajuste; ese cambio no está simulado aquí.
- Cambio maestro (sustitución automática de titular por suplente) se descartó como legendario: en la primera corrida solo aportaba 1,5 puntos de media y no hacía nada en el 69% de los casos. La protección contra puntuación negativa pura también era débil: 0,7 puntos y 82% sin efecto, de ahí su revisión.
- No incluiría ventas obligatorias, expulsiones del fantasy ni anulación de una plantilla entera: requieren otra simulación económica y afectan más allá de la jornada.
- No hay estimación fiable de equilibrio de toda una temporada: se reutilizan seis partidos de validación, no son cientos de miles de partidos independientes. La clasificación, participación y medias del nuevo curso pueden ser distintas. Usaría estos pesos como punto de partida y revisaría tras 4–6 jornadas con estadísticas completas.

El código publicado actualmente concede cartas al observar la posición visible y elige el poder mediante el índice de posición, sin sorteo ponderado. Para llevar este diseño a producción habrá que congelar la clasificación final de cada jornada, entregar para la siguiente y resolver el sorteo/puntuación en servidor. Este borrador no modifica ese comportamiento.

## Reproducir

Desde la raíz del proyecto:

```bash
node docs/banquiger-powers/simulate.mjs
```

Archivos: `simulate.mjs` (modelo), `results.json` (propuesta ajustada), `results-initial.json` (primera propuesta, distinta selección de objetivos y pesos; las diferencias no atribuyen causalmente un cambio aislado).
