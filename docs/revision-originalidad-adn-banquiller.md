# Revisión técnica de originalidad — ADN Banquiller

Fecha: 31 de agosto de 2026. Trabajo exclusivamente local.

## Resultado y límites

La comprobación limitada no encontró coincidencias exactas en textos de 35 o más caracteres ni en las ventanas de código examinadas. Tampoco se encontraron importaciones ni enlaces a recursos de The Real MVP en el módulo local de carrera. Esto **no prueba la ausencia de copia**, no acredita autoría y no es una certificación jurídica. La similitud visual con la captura facilitada era evidente; se ha rediseñado la presentación independientemente del resultado del análisis literal.

No se ha comparado todo el sitio externo, su repositorio original, su servidor ni otros juegos. La minificación, los cambios de nombres, las traducciones y las modificaciones de estructura pueden impedir detectar código relacionado. No se ha realizado un análisis semántico ni una evaluación legal de marcas, diseño, imágenes o derechos de terceros.

## Método reproducible

Se inspeccionaron como texto dos archivos públicos enlazados por la portada de [The Real MVP](https://therealmvp.skyhook.es/):

- [JavaScript público](https://therealmvp.skyhook.es/_next/static/chunks/page-DtaZ-hAr.js), 232.837 bytes. SHA-256: `d5a6e4b97ce03015376563d321cacde853ed19ac9f77106cddd2b0923a8fbc9f`.
- [CSS público](https://therealmvp.skyhook.es/_next/static/css/index.BECd9Bjm.css), 210.789 bytes. SHA-256: `ed109365dab648022aafa0cc701efe1230e2ca27f5fbd719b3b9471cbf032526`.

Las copias de análisis están en un directorio temporal, fuera del proyecto. No se ejecutaron, importaron ni incorporaron al juego.

`scripts/audit-career-source.mjs` compara los 19 archivos actuales de componentes de carrera, datos, utilidades, repositorios y las dos páginas. Extrae literales de JavaScript/JSX, normaliza espacios y busca coincidencias exactas de longitud ≥35. Además, examina ventanas de 160 caracteres normalizados cada 40 posiciones (JS contra JS y CSS contra CSS). Imprime los hashes de los archivos locales y los resultados. Solo necesita el analizador Babel ya presente en las dependencias del proyecto; no accede a la red.

```sh
node scripts/audit-career-source.mjs /ruta/reference.js /ruta/reference.css
```

Resultado tras los cambios: `literalMatches: []`, `blockMatches: []`. La misma comprobación antes del rediseño también devolvió listas vacías. No se interpreta como porcentaje de originalidad.

## Recursos y procedencia observada

- El logo del grupo procede de la imagen proporcionada por el usuario; el otro logo ya estaba en el proyecto. No se ha verificado documentalmente la titularidad de esas imágenes.
- La cabecera del chat sigue la referencia de WhatsApp solicitada por el usuario. Es una escena ficticia sin conexión, envío de mensajes ni marcas de participantes copiadas de la captura.
- Las cuatro frases de bienvenida y sus autores son las suministradas por el usuario. Los eventos nuevos usan «El equipo» y no atribuyen frases inventadas a personas reales.
- Los iconos usan la dependencia existente `lucide-react`. No se han añadido bibliotecas para imitar el juego externo.
- Las importaciones globales de DM Sans, Graduate y Outfit ya figuran en `HEAD:src/index.css`, fuera de este rediseño. La pantalla de carrera usa DM Sans, títulos editoriales con Georgia del sistema y tipografía de sistema en los chats. No se han descargado fuentes del sitio de referencia.
- Los archivos de carrera aún no tienen historial propio consolidado en Git: la inspección del estado local no permite certificar cómo se escribió cada línea.

## Cambios de identidad

- Cabecera de club en crema, negro cálido y dorado; media en un recuadro oscuro y composición distinta de la ficha de referencia.
- Trayectoria como cuaderno del equipo: sin pastillas naranjas de media ni acentos azul petróleo/rojo del ejemplo. Se mantiene la tabla anual porque el usuario pidió esa función.
- Eventos y balance dentro de la conversación del grupo, con burbujas, respuestas elegibles y cabecera compartida con la bienvenida. No hay tarjetas de decisiones calcadas del ejemplo.
- Los 26 títulos y propuestas del catálogo inicial se han redactado con contexto de equipo municipal: vídeos del domingo, pista libre, turnos de entrenamiento y torneos del grupo. No cambian IDs, pesos, probabilidades, filtros ni efectos.
- Se mantiene el motor con las reglas acordadas: inicio a los 17, potencial 30/50/18/2, habilidades ocultas, estadísticas anuales y retirada hasta los 40. No se ha sustituido por código descargado.

La revisión y el rediseño no publican configuraciones ni alteran catálogos ya cargados en memoria o publicados por administradores. La aplicación toma su catálogo al abrir la sesión; los textos base nuevos se usan cuando corresponde cargar ese catálogo, sin sobrescribir personalizaciones.

## Verificación

`npm run test:career`: 59 pruebas, incluidas decisiones, conversación, adaptación de género, atributos ocultos y trayectoria hasta los 40. `npm run build`: compilación correcta, con aviso de tamaño del bundle principal. No se ha realizado una comprobación visual interactiva en navegador ni recargado la partida del usuario.
