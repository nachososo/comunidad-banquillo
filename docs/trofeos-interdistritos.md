# Ampliación de premios y Copa Interdistritos

Todo permanece local. No se modifican probabilidades de liga, fichajes, atributos ni estadísticas por añadir los trofeos. Sí se añaden sorteos de premios y de Copa: una misma semilla puede producir eventos futuros diferentes por consumir esos nuevos sorteos.

## Copa Interdistritos

- Clasificación automática solo por ganar la liga municipal de **ese mismo año**, con cualquier club. No basta con una liga de años anteriores.
- Se resuelve al final de la temporada, después de la liga y premios individuales, sin consumir otro evento ni avanzar la edad. En esta primera versión se simula el resultado global de la Copa, no eliminatorias ni estadísticas de sus partidos.
- Porcentaje condicional: `base + (máximo − base) × mediaFinal / 100`. Valores iniciales: 1% con media 0 y 12% con media 100. Media 40: 5,4%; media 70: 8,7%; media 87: 10,57%. Son posibilidades de ganar **una vez clasificado**, no posibilidades conjuntas de ganar liga y Copa.
- Editables en Panel → Simulación anual: `interdistrictsBaseChance` y `interdistrictsMaxChance`. Cada extremo debe estar entre 0,01 y 25; máximo estrictamente mayor que base. El límite mantiene una probabilidad baja.
- Catálogos antiguos sin esos campos usan los valores iniciales sin sobrescribir su contenido. Las partidas nuevas hacen una copia de los ajustes; una edición posterior del catálogo no afecta a la partida abierta.
- Una retirada previa a la temporada no disputa liga ni Copa. Una baja del jugador durante todo el año no impide que su equipo gane los dos títulos, igual que ya ocurría con la liga, pero no concede premios individuales.
- Ganarla añade `Copa Interdistritos` al palmarés colectivo junto a la liga; participar sin ganar deja constancia narrativa pero no añade ningún trofeo. Balance, historial, vitrina y texto detallado compartible reflejan el resultado sin revelar probabilidades al jugar.

## Nuevos premios individuales

Son sorteos de elegibilidad, como los premios individuales existentes, no posiciones calculadas frente a una plantilla rival completa. Los tres requieren jugar al menos la mitad de los partidos de liga programados. Mantienen los sufijos históricos de categoría para compatibilidad.

| Premio | Requisitos | Probabilidad si cumple |
| --- | --- | --- |
| Máximo reboteador | Al menos 8 rebotes por partido | 40% |
| Mejor defensor | Atributo defensa ≥75 y robos + tapones por partido ≥2 | 35% |
| Sexto hombre | Rol de banquillo, media ≥60 y puntos por partido ≥10 | 30% |

El simulador todavía no tiene alineaciones completas: los minutos son una aproximación explícita del rol anual. Menos de 20: rotación; 20–27: rotación de banquillo, elegible para Sexto hombre; 28 o más: titular; ningún partido: sin participación. Este rol no altera los minutos existentes ni consume azar. Se muestra solo después de resolver la temporada. Los requisitos de premios están documentados en el panel, pero no son campos editables en esta ampliación.

## Cuatro imágenes originales

Herramienta integrada imagegen, sin CLI. Referencias de estilo: captura de trofeos aportada por el usuario y `public/img/trophies/league-v2.png`. Aspecto deportivo convencional, sin adornos fantásticos. Cada PNG final tiene 1254×1254 píxeles y canal alfa real, se inspeccionó visualmente y se copió sin retocar al proyecto. Los seis diseños existentes se mantienen; ahora hay diez diseños.

- `/Users/j.atorres/Desktop/comunidad-banquillo/public/img/trophies/interdistricts-v1.png`
- `/Users/j.atorres/Desktop/comunidad-banquillo/public/img/trophies/rebounder-v1.png`
- `/Users/j.atorres/Desktop/comunidad-banquillo/public/img/trophies/defender-v1.png`
- `/Users/j.atorres/Desktop/comunidad-banquillo/public/img/trophies/sixth-v1.png`

### Prompts exactos

Prefijo común para las cuatro generaciones, seguido del asunto:

```text
Use case: stylized-concept
Asset type: transparent PNG small sports-management-game trophy sprite.
Scene/backdrop: genuinely transparent background with real alpha channel, not a colored or checkered backdrop. Square canvas.
Style/medium: sober conventional sporting trophy, lightly simplified realistic 3D sprite, clean smooth metal with restrained highlights, muted silver and pale champagne gold, plausible manufactured physical object, designed to read at 48px. No fantasy ornament.
Composition/framing: single complete centered trophy, straight front view, near-orthographic, enough transparent padding, object about 75 percent canvas height. Small plain black plinth. Soft neutral studio illumination, no cast shadow outside the object.
Constraints: one original object only. No text, letters, numbers, logos, watermark, stars, laurels, wings, glow, floating shapes, ornate sculpture, scene, floor, or pedestal beyond the small black base.
```

Interdistricts:

```text
Subject: modest taller silver lidded cup with two simple smooth loop handles, narrow champagne-gold rim, simple low rounded lid with tiny plain knob, slim short stem and small plain black square base. Entire trophy is restrained and practical, not an ornate ceremonial chalice.
```

Rebounder:

```text
Subject: simple short silver fluted cup without handles, gently tapered bowl with a few broad vertical flutes, short silver stem and small black square base. Silver only. Modest ordinary sports award, compact broad-cup silhouette.
```

Defender:

```text
Subject: modest round silver medal plate standing vertically on a small black plinth. One simple shallow embossed blank shield outline at center of the silver disk, no stars. The disk is supported physically by a short silver foot and plinth, not floating. Simple manufactured sports trophy, clean circular silhouette.
```

Sixth, generación inicial:

```text
Subject: simple pale champagne-gold rectangular upright award plaque on a small black rectangular base. Plaque has one small shallow basketball relief near the top: just a modest circular ball relief with basketball seam lines. Rest of the rectangular plate blank. No text or numerals. Plausible sober ordinary sports award, straight rectangular silhouette.
```

Sixth necesitó una corrección de encuadre y halo, mediante imagegen y usando la primera salida como referencia:

```text
Use case: background-extraction
Input image: edit target, existing simple gold basketball plaque trophy.
Change ONLY background and framing. Preserve the existing trophy object's geometry, gold material, basketball relief and black plinth. Remove completely all dark backdrop AND all golden haze/halo/glow surrounding the trophy. Output a genuinely transparent PNG with real alpha=0 everywhere outside the clean trophy silhouette. The transparent background must not be painted black or white. Use a SQUARE canvas with the complete trophy centered, uncropped, resized to about 80 percent canvas height and ample transparent space on both sides. No glow, no halo, no floor, no shadows outside the object. Keep no text, no numerals, no logo. This is a clean cutout sports trophy sprite, not a presentation scene.
```
