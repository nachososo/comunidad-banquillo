import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CAREER_CONFIG as config, newTransferEvent } from '../src/data/careerData.js';
import { STARTING_CLUB } from '../src/data/careerClubs.js';
import { advanceCareer, createCareer, resolveSeason } from '../src/utils/careerEngine.js';
import { CAREER_TROPHIES } from '../src/utils/careerTrophies.js';

test('renderiza creación libre, evento, balance, edades, resumen completo y editor', async () => {
  const require = createRequire(import.meta.url);
  const load = async (file) => {
    const output = await build({
      entryPoints: [file], bundle: true, platform: 'node', format: 'esm', write: false,
      loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
      alias: { '@': process.cwd() + '/src' }, logLevel: 'silent',
      banner: { js: "import { createRequire as makeRequire } from 'node:module'; import { fileURLToPath as fromFileUrl } from 'node:url'; const nodeRequire = makeRequire(" + JSON.stringify(import.meta.url) + "); const require = (id) => nodeRequire(id.startsWith('file:') ? fromFileUrl(id) : id);" },
      plugins: [{
        name: 'shared-react',
        setup(builder) {
          builder.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({ path: pathToFileURL(require.resolve(path)).href, external: true }));
        },
      }],
    });
    return import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));
  };
  try {
    const { CareerCreation, CareerSession } = await load('src/pages/CareerPage.jsx');
    const { default: CareerGroupWelcome } = await load('src/components/career/CareerGroupWelcome.jsx');
    const { default: CareerInvitation } = await load('src/components/career/CareerInvitation.jsx');
    const { default: CareerPlay, SeasonEvent, SeasonResult } = await load('src/components/career/CareerPlay.jsx');
    const { EventEditor, InterdistrictsSettingsEditor } = await load('src/pages/CareerAdminPage.jsx');
    const cupEditor = renderToString(React.createElement(InterdistrictsSettingsEditor, { settings: {}, change() {} }));
    assert.match(cupEditor, /Victoria en Copa con media 0/);
    assert.match(cupEditor, /Victoria en Copa con media 100/);
    assert.match(cupEditor, /step="0.01"/);
    assert.match(cupEditor, /value="12"/);
    assert.match(cupEditor, /una vez clasificado/);
    const cupInitial = createCareer({ name: 'Copa', number: 7, gender: 'masculino', position: 'Base', archetype: 'allround' }, config, () => .5);
    const cupWinner = resolveSeason(cupInitial, false, () => 0);
    const cupBalance = renderToString(React.createElement(SeasonResult, { career: cupWinner, events: [], action() {} }));
    assert.match(cupBalance, /Copa Interdistritos: ¡doblete!/);
    const cupLoser = { ...cupWinner, lastResult: { ...cupWinner.lastResult, interdistrictsChampion: false, collectiveAwards: ['Campeonato de liga municipal'] } };
    assert.match(renderToString(React.createElement(SeasonResult, { career: cupLoser, events: [], action() {} })), /esta vez no levantamos la copa/);
    const noCup = resolveSeason(cupInitial, false, () => .99);
    assert.doesNotMatch(renderToString(React.createElement(SeasonResult, { career: noCup, events: [], action() {} })), /Copa Interdistritos/);
    const { default: CareerTrophyCollection, CareerTrophyPreview } = await load('src/components/career/CareerTrophyCollection.jsx');
    const sampleTrophies = renderToString(React.createElement(CareerTrophyPreview));
    for (const trophy of Object.values(CAREER_TROPHIES)) assert(sampleTrophies.includes(trophy.image));
    assert.match(sampleTrophies, /Muestra visual con premios ficticios/);
    const trophyAwards = [{ title: 'MVP de la temporada · Junior', age: 18, club: 'Banquillo' }, { title: 'MVP de la temporada · Senior', age: 25, club: 'Prusia' }];
    const trophyHtml = renderToString(React.createElement(CareerTrophyCollection, { awards: trophyAwards, category: 'individual' }));
    assert.equal((trophyHtml.match(/<details/g) || []).length, 1);
    assert.match(trophyHtml.replace(/<!--.*?-->/g, ''), /×2/);
    assert.match(trophyHtml, /18<!-- --> años · <!-- -->Banquillo/);
    assert.match(trophyHtml, /25<!-- --> años · <!-- -->Prusia/);
    assert.match(trophyHtml, /Ver temporadas y clubes/);
    for (const [type, trophy] of Object.entries(CAREER_TROPHIES)) assert.equal(trophyHtml.includes(trophy.image), type === 'mvp');
    assert.equal(renderToString(React.createElement(CareerTrophyCollection, { awards: [], category: 'individual', compact: true })), '');
    assert.doesNotMatch(renderToString(React.createElement(CareerTrophyCollection, { awards: [], category: 'individual' })), /<img|<details/);
    const { default: CareerClubLogo } = await load('src/components/career/CareerClubLogo.jsx');
    const logoHtml = (club, variant) => renderToString(React.createElement(CareerClubLogo, { club, variant }));
    assert.match(logoHtml(STARTING_CLUB, 'crest'), /src="\/img\/logo.png"/);
    assert.doesNotMatch(logoHtml(STARTING_CLUB, 'crest'), /career-group-logo/);
    assert.match(logoHtml(STARTING_CLUB, 'avatar'), /career-group-logo.png/);
    assert.match(logoHtml({ id: 'cdb', name: 'Club antiguo' }, 'crest'), /src="\/img\/logo.png"/);
    for (const id of ['cdb', 'otro-club']) for (const variant of ['crest', 'avatar']) {
      assert.match(logoHtml({ ...STARTING_CLUB, id, logo: '/img/personalizado.png' }, variant), /personalizado.png/);
      assert.doesNotMatch(logoHtml({ ...STARTING_CLUB, id, logo: '' }, variant), /<img/);
    }
    const creation = renderToString(React.createElement(CareerCreation, { onCreate() {} }));
    assert.match(creation, /Empezar mi carrera/);
    assert.doesNotMatch(creation, /Sin cuenta y sin guardado|Te apunta tu primo|Cierras el cuaderno|Un evento por año|Empiezas con media 40|Simulación ficticia/);
    assert.match(creation, /Invitación aceptada/);
    assert.match(creation, /equipo municipal/);
    assert.match(creation, /<label class="career-field"><span>Equipo<\/span><select/);
    assert.doesNotMatch(creation, /Género para los mensajes|Solo cambia cómo se dirigen a ti|El equipo es mixto|rivales, eventos y reglas/);
    assert.doesNotMatch(creation, /13–14|15–16|Empieza en infantil/);
    let accepted = 0;
    const invitationElement = CareerInvitation({ onAccept: () => accepted++ });
    const invitation = renderToString(invitationElement);
    for (const label of ['Tu primo', 'Mis amigos y yo', 'liga municipal', 'La Comunidad del Banquillo', '¡Me apunto, primo!']) assert(invitation.includes(label));
    assert.doesNotMatch(invitation, /Conversación ficticia|Sin teléfono|sin cuenta|sin guardado|no consume el evento/);
    assert.match(invitation, /17/);
    assert.doesNotMatch(invitation, /<form|type="tel"|wa.me|api.whatsapp/);
    const buttons = [];
    const visit = (element) => {
      if (!React.isValidElement(element)) return;
      if (element.type === 'button') buttons.push(element);
      React.Children.forEach(element.props.children, visit);
    };
    visit(invitationElement);
    assert.equal(buttons.length, 1); buttons[0].props.onClick(); assert.equal(accepted, 1);
    const render = (career) => renderToString(React.createElement(CareerPlay, { career, events: config.events, action() {}, onRestart() {} })).replace(/<!--.*?-->/g, '');
    let c = createCareer({ name: 'Prueba render', number: 7, team: 'femenino', position: 'Base', archetype: 'allround' }, config, () => 0);
    let welcomeCareer = { ...c, welcomePending: true };
    const originalCareer = structuredClone(welcomeCareer);
    const sessionProps = { career: welcomeCareer, events: config.events, action: (transform) => { welcomeCareer = transform(welcomeCareer); }, onRestart() {} };
    const welcomeElement = CareerSession(sessionProps);
    const welcome = renderToString(welcomeElement).replace(/<!--.*?-->/g, '');
    assert.match(welcome, /Bienvenida al grupo/);
    const genderedMessages = [{ id: 'gender-test', sender: 'Autor de prueba', text: { masculino: 'Bienvenido, primo', femenino: 'Bienvenida, prima' }, time: '18:08' }];
    for (const [gender, expected] of [['masculino', 'Bienvenido, primo'], ['femenino', 'Bienvenida, prima']]) {
      const html = renderToString(React.createElement(CareerGroupWelcome, { profile: { ...c.profile, gender }, messages: genderedMessages, onContinue() {} }));
      assert(html.includes(expected));
    }
    for (const label of ['*Comunidad del Banquillo*', 'Grupo del equipo', '/img/career-group-logo.png', 'ha añadido a Prueba render', 'Carlos Torres', 'Dani González', 'Unai Suárez', 'Javier Torres', '¡Bienvenida al equipo!', 'Los Anillos de Poder', 'Ir a mi primera temporada']) assert(welcome.includes(label));
    assert.doesNotMatch(welcome, /Alen CdB|Basty CdB|Briseida|Pachanga|Mensajes pendientes|Bienvenido\/a|de éxito si aceptas|<input|<textarea/);
    const maleWelcome = renderToString(React.createElement(CareerGroupWelcome, { profile: { ...c.profile, gender: 'masculino' }, onContinue() {} }));
    assert.match(maleWelcome, /¡Bienvenido al equipo!/);
    assert.doesNotMatch(maleWelcome, /Bienvenida al grupo|¡Bienvenida al equipo!|Bienvenido\/a|Mensajes pendientes/);
    welcomeElement.props.onContinue();
    assert.equal(welcomeCareer.welcomePending, false);
    assert.equal(welcomeCareer.age, 17); assert.equal(welcomeCareer.seasons.length, 0);
    assert.deepEqual(welcomeCareer.pendingEvent, originalCareer.pendingEvent);
    assert.deepEqual(welcomeCareer.attributes, originalCareer.attributes);
    assert.deepEqual(welcomeCareer.development, originalCareer.development);
    assert.equal(originalCareer.welcomePending, true);
    assert.match(renderToString(React.createElement(CareerSession, { ...sessionProps, career: welcomeCareer })), /de éxito si aceptas/);
    const scripted = renderToString(React.createElement(CareerGroupWelcome, { profile: { name: '<script>test</script>' }, onContinue() {}, messages: [{ id: 'test', sender: 'Autor de prueba', text: 'Mensaje de prueba <b>sin HTML</b>', time: '18:08', tone: 'blue' }] }));
    assert.match(scripted, /Autor de prueba/); assert.match(scripted, /18:08/);
    assert.doesNotMatch(scripted, /<script>|<b>sin HTML<\/b>|Mensajes pendientes/);
    assert.match(scripted, /&lt;b&gt;sin HTML&lt;\/b&gt;/);
    assert.match(render(c), /Temporada · 17 años/);
    assert.match(render(c), /aria-label="Media actual: 40"/);
    assert.match(render(c), /career-player-strip/);
    assert.doesNotMatch(render(c), /\/img\/trophies\//);
    for (const age of [17, 18, 19, 40]) {
      const header = render({ ...c, age }).match(/<header class="career-player-strip">[\s\S]*?<\/header>/)?.[0];
      assert(header);
      assert.match(header, /src="\/img\/logo.png"/);
      assert.doesNotMatch(header, /career-group-logo.png/);
      assert.match(header, new RegExp('<span>EDAD</span><strong>' + age + '</strong>'));
      assert.doesNotMatch(header, /Junior|Senior|<small>/);
    }
    assert.match(render(c), /career-game-columns/);
    assert.match(render(c), /career-notebook-scroll/);
    assert.match(render(c), /Cuaderno: temporadas, recuerdos y palmarés/);
    assert.match(render(c), /career-event-chat/);
    for (const label of ['*Comunidad del Banquillo*', '/img/career-group-logo.png', c.pendingEvent.scene.author.name, 'Tu respuesta']) assert(render(c).includes(label));
    assert.doesNotMatch(render(c), /El equipo|career-scene-avatar|Escena del juego|<textarea|wa.me|api.whatsapp/);
    const eventBubble = render(c).match(/<li class="career-group-bubble career-chat-message">[\s\S]*?<\/li>/)?.[0];
    assert(eventBubble); assert.match(eventBubble, /<time>18:10<\/time>/); assert.doesNotMatch(eventBubble, /<h2|career-scene-author/);
    const matchingWelcome = renderToString(React.createElement(CareerGroupWelcome, { profile: c.profile, onContinue() {}, messages: [{ id: 'same', sender: c.pendingEvent.scene.author.name, text: c.pendingEvent.scene.message || c.pendingEvent.description, time: '18:10', tone: eventBubble.match(/career-group-sender (blue|green|purple)/)[1] }] })).replace(/<!--.*?-->/g, '');
    assert(matchingWelcome.includes(eventBubble));
    const legacyScene = { ...c.pendingEvent.scene, authorMode: 'team', author: { id: '', name: 'El equipo' } };
    const legacyCareer = { ...c, pendingEvent: { ...c.pendingEvent, scene: legacyScene } };
    assert.doesNotMatch(render(legacyCareer), /El equipo|career-scene-avatar|Escena del juego/);
    assert.deepEqual(legacyCareer.pendingEvent.scene, legacyScene);
    assert.match(render(c), /Decisión pendiente/);
    assert.equal((render(c).match(/scope="row"/g) || []).length, 1);
    const pendingRow = render(c).match(/<tr class="career-record-pending"[^>]*>[\s\S]*?<\/tr>/)?.[0];
    assert(pendingRow); assert.match(pendingRow, /Temporada de 17 años pendiente/);
    assert.match(pendingRow, /career-record-rating">40/);
    assert.equal((pendingRow.match(/aria-label="[^"]+: pendiente"><\/td>/g) || []).length, 8);
    assert.equal(c.seasons.length, 0);
    assert.match(render(c), /de éxito si aceptas/);
    assert.doesNotMatch(render(c), /Equipo mixto|Sin cuenta ni guardado|Tu carrera se pierde al salir o recargar|Las cifras del reto|Rechazar no elimina el riesgo habitual/);
    const noHiddenValues = (html) => assert.doesNotMatch(html, /<progress|Habilidades del jugador|career-attributes|Riesgo anual de lesión|Riesgo de lesión resuelto|¿Cómo ha cambiado mi media\?|de evolución natural|development|maturation|potential/);
    noHiddenValues(render(c));
    const customChat = { ...c, pendingEvent: { ...c.pendingEvent, description: 'Bienvenido/a, ¿te apuntas?', acceptLabel: 'Estoy preparado/a' } };
    assert.match(render(customChat), /Bienvenida, ¿te apuntas\?/);
    assert.match(render(customChat), /Estoy preparada/);
    assert.doesNotMatch(render(customChat), /Bienvenido\/a|preparado\/a/);
    const retirementChat = render({ ...c, pendingEvent: config.events.find((event) => event.category === 'retirement') });
    assert.match(retirementChat, /Si confirmas, termina tu carrera/);
    assert.doesNotMatch(retirementChat, /Si sale mal/);
    // All presentation modes share the actual event controls and keep the
    // fictional message separate from the gameplay explanation.
    for (const format of ['group', 'direct', 'instagram', 'x']) {
      const sample = { ...c, pendingEvent: { ...c.pendingEvent, scene: undefined, description: 'Explicación deportiva independiente.', presentation: { format, authorMode: 'external', authorName: 'Organización del barrio', handle: 'torneo_ficticio', location: 'La Elipa', message: '¡Gente! ¿Nos apuntamos? Bienvenido/a <script>alert(1)</script>' } } };
      const html = render(sample);
      assert(html.includes('career-format-' + format));
      assert.match(html, /Organización del barrio/); assert.match(html, /La Elipa/);
      assert.match(html, /Bienvenida/); assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      assert.doesNotMatch(html, /<script>|<iframe|instagram.com|twitter.com|wa.me/);
      assert.equal((html.match(/Explicación deportiva independiente/g) || []).length, 1);
      assert.match(html, /career-event-context/); assert.match(html, /de éxito si aceptas/);
      if (format === 'direct') assert.doesNotMatch(html, /\*Comunidad del Banquillo\*/);
      else assert.match(html, /\*Comunidad del Banquillo\*/);
      if (format === 'instagram') assert.match(html, /career-social-announcement/);
    }
    const alternateInternal = { ...c, attributes: Object.fromEntries(Object.keys(c.attributes).map((key) => [key, 91.37])), development: { potential: 97, rate: 1.2, maturation: 'late' } };
    assert.equal(render(c), render(alternateInternal));
    const getButtons = (element) => {
      const found = [];
      const scan = (node) => { if (!React.isValidElement(node)) return; if (node.type === 'button') found.push(node); React.Children.forEach(node.props.children, scan); };
      scan(element); return found;
    };
    for (const event of config.events.filter((event) => ['court', 'bench'].includes(event.presentation.format))) {
      const html = render({ ...c, pendingEvent: { ...event, scene: undefined } });
      assert.match(html, /career-live-event/);
      assert.doesNotMatch(html, /career-group-header|career-chat-message|career-group-bubble|Tu respuesta/);
      assert.match(html, event.presentation.format === 'court' ? /career-scoreboard/ : /career-bench-dialogue/);
    }
    const barEvent = config.events.find((event) => event.presentation.format === 'bar');
    const barHtml = render({ ...c, pendingEvent: { ...barEvent, scene: undefined } });
    assert.match(barHtml, /career-format-bar/);
    assert.match(barHtml, /career-location-hero/);
    assert.match(barHtml, /la-cana-de-gonzalo\.jpg/);
    assert.match(barHtml, /La Caña de Gonzalo/);
    assert.match(barHtml, /career-bar-dialogue/);
    assert.doesNotMatch(barHtml, /career-group-header|career-chat-message|career-group-bubble|WhatsApp|Tu respuesta/);
    const barEditor = renderToString(React.createElement(EventEditor, { event: barEvent, change() {} }));
    for (const label of ['La Caña de Gonzalo', 'Quién habla contigo', 'Lo que te dice', 'Vista previa de la presentación']) assert(barEditor.includes(label));
    for (const id of ['winner', 'mentor']) {
      const event = config.events.find((item) => item.id === id);
      const liveCareer = { ...c, pendingEvent: { ...event, scene: undefined } };
      const html = render(liveCareer);
      assert.match(html, /career-live-event/);
      assert.doesNotMatch(html, /career-group-header|career-chat-message|career-group-bubble|Instagram|WhatsApp|Tu respuesta/);
      assert.match(html, /Tu decisión/); assert.match(html, /de éxito si aceptas/);
      noHiddenValues(html);
      if (id === 'winner') { assert.match(html, /career-scoreboard/); assert.match(html, /00:02/); assert.match(html, /No pedir el último tiro/); }
      else { assert.match(html, /career-bench-dialogue/); assert.match(html, /<blockquote>/); assert.doesNotMatch(html, /career-scoreboard/); }
      const liveEditor = renderToString(React.createElement(EventEditor, { event, change() {} }));
      if (id === 'winner') { assert.match(liveEditor, /Marcador de la escena/); assert.match(liveEditor, /Tiempo restante \(MM:SS\)/); assert.match(liveEditor, /Narración del momento/); }
      else { assert.match(liveEditor, /Quién habla contigo/); assert.match(liveEditor, /Lo que te dice/); }
      for (const [index, accepted] of [[0, true], [1, false]]) {
        let updated;
        const decisions = getButtons(SeasonEvent({ career: liveCareer, action: (transform) => { updated = transform(liveCareer); } }));
        assert.equal(decisions.length, 2); decisions[index].props.onClick();
        assert.equal(updated.lastResult.event.accepted, accepted);
        assert.equal(updated.age, 17); assert.equal(updated.seasons.length, 1);
      }
    }
    for (const [index, accepted] of [[0, true], [1, false]]) {
      let updated;
      const decisions = getButtons(SeasonEvent({ career: c, action: (transform) => { updated = transform(c); } }));
      assert.equal(decisions.length, 2); decisions[index].props.onClick();
      assert.equal(updated.lastResult.event.accepted, accepted);
      assert.equal(updated.age, 17); assert.equal(updated.seasons.length, 1);
      assert.doesNotMatch(render(updated), /career-record-pending|Decisión pendiente/);
      assert.equal((render(updated).match(/scope="row"/g) || []).length, 1);
    }
    const transferClub = { id: 'render-club', name: 'Club render', groupName: 'Grupo render', logo: '/img/club-render.png', contactName: 'Contacto render', members: ['Miembro render'] };
    const transferEvent = newTransferEvent('render-offer', transferClub.id);
    const transferConfig = { ...config, clubs: [STARTING_CLUB, transferClub], events: [transferEvent] };
    const transferCareer = advanceCareer(resolveSeason(createCareer(c.profile, transferConfig, () => .5), false, () => .5), transferConfig.events, () => .5);
    const offerHtml = render(transferCareer);
    assert.match(offerHtml, /career-format-direct/); assert.match(offerHtml, /Contacto render/); assert.match(offerHtml, /club-render.png/);
    assert.doesNotMatch(offerHtml, /<h2>Grupo render<\/h2>/);
    for (const [index, accepted] of [[0, true], [1, false]]) {
      let updated;
      const buttons = getButtons(SeasonEvent({ career: transferCareer, action: (transform) => { updated = transform(transferCareer); } }));
      assert.equal(buttons.length, 2); buttons[index].props.onClick();
      assert.equal(updated.currentClub.id, accepted ? transferClub.id : 'cdb');
      const html = render(updated);
      assert.match(html, accepted ? /<h2>Grupo render<\/h2>/ : /\*Comunidad del Banquillo\*/);
      if (accepted) {
        const header = html.match(/<header class="career-player-strip">[\s\S]*?<\/header>/)[0];
        assert.match(header, /club-render.png/); assert.match(header, /Club render/);
        assert.doesNotMatch(header, /career-group-logo.png/);
      }
    }
    const signed = resolveSeason(transferCareer, true, () => .5);
    const later = advanceCareer(signed, [config.events[0]], () => .5);
    const laterHtml = render(later);
    assert.match(laterHtml, /<h2>Grupo render<\/h2>/); assert.match(laterHtml, /Miembro render/);
    assert.match(laterHtml, /src="\/img\/logo.png"/); // old season keeps the transparent original crest
    const transferEditor = renderToString(React.createElement(EventEditor, { event: transferEvent, clubs: transferConfig.clubs, change() {} }));
    assert.match(transferEditor, /Club que hace la oferta/); assert.match(transferEditor, /Probabilidad de cerrar el fichaje/);
    assert.match(transferEditor, /Exclusivo del Banquillo/);
    assert(transferEditor.indexOf('Solo mientras juegas en') < transferEditor.indexOf('Cómo llega la historia'));
    const memberEditor = renderToString(React.createElement(EventEditor, { event: { ...config.events[0], clubId: 'cdb', presentation: { format: 'group', authorMode: 'member', memberId: 'cdb-irene-crecis' } }, clubs: config.clubs, change() {} }));
    for (const name of ['Irene Crecis', 'Briseida Batalla', 'Gonzalo Carretero', 'Nacho Serrano', 'Daniel Bastardo']) assert(memberEditor.includes(name));
    assert.match(transferEditor, /Contacto render/); assert.match(transferEditor, /<select disabled=""/);
    const { default: CareerClubsEditor } = await load('src/components/career/CareerClubsEditor.jsx');
    const clubsEditor = renderToString(React.createElement(CareerClubsEditor, { config: transferConfig, edit() {} }));
    for (const label of ['Añadir club', 'Nombre del grupo de WhatsApp', 'Persona que propone los fichajes', 'Logo del club', 'Tier municipal', 'Media mínima personalizada', 'Media 70', 'Media 80', 'Media 87']) assert(clubsEditor.includes(label));
    for (const label of ['Opciones de ganar la liga municipal', 'Probabilidad con media 0 (%)', 'Probabilidad con media 100 (%)', 'Usar probabilidades del tier', 'El Banquillo compite como tier 3', 'Media 40: 16%', 'Media 70: 20,5%']) assert(clubsEditor.includes(label));
    assert.doesNotMatch(clubsEditor, /Tier 5/);
    c = resolveSeason(c, false, () => .5);
    assert.match(render(c), /Seguimos a lo nuestro./);
    assert.match(render(c), /Balance en el chat ficticio del equipo/);
    assert.match(render(c), /career-chat-outgoing/);
    assert.match(render(c), /de media esta temporada/);
    assert.match(render(c), /Ver palmarés y clubes/);
    assert.doesNotMatch(render(c).match(/<header class="career-player-strip">[\s\S]*?<\/header>/)[0], /career-profile-trophies/);
    assert.equal((render(c).match(/scope="row"/g) || []).length, 1);
    noHiddenValues(render(c));
    const illustratedSeason = {
      ...c.seasons[0],
      collectiveAwards: ['Campeonato de liga municipal'],
      individualAwards: ['MVP de la temporada · Junior'],
    };
    const illustratedHtml = render({ ...c, seasons: [illustratedSeason] });
    const illustratedHeader = illustratedHtml.match(/<header class="career-player-strip">[\s\S]*?<\/header>/)?.[0];
    const illustratedNotebook = illustratedHtml.match(/<table class="career-table">[\s\S]*?<\/table>/)?.[0];
    assert(illustratedHeader);
    assert(illustratedNotebook);
    assert.match(illustratedHeader, /Títulos <strong>1<\/strong><span class="career-trophy-icons is-default"/);
    assert.match(illustratedHeader, /Premios individuales <strong>1<\/strong><span class="career-trophy-icons is-default"/);
    assert.match(illustratedHeader, /league-v2\.png/);
    assert.match(illustratedHeader, /mvp-v2\.png/);
    assert.match(illustratedNotebook, /<small>Junior<\/small><span class="career-trophy-icons is-season"/);
    assert.match(illustratedNotebook, /league-v2\.png/);
    assert.match(illustratedNotebook, /mvp-v2\.png/);
    assert.doesNotMatch(pendingRow, /career-trophy-icons|\/img\/trophies\//);
    let advanced;
    const continueButtons = getButtons(SeasonResult({ career: c, events: config.events, action: (transform) => { advanced = transform(c); } }));
    assert.equal(continueButtons.length, 1); continueButtons[0].props.onClick();
    assert.equal(advanced.age, 18); assert.equal(advanced.seasons.length, 1);
    c = advanceCareer(c, config.events, () => 0);
    assert.match(render(c), /Temporada · 18 años/);
    assert.equal((render(c).match(/scope="row"/g) || []).length, 2);
    assert.match(render(c), /Temporada de 18 años pendiente/);
    noHiddenValues(render(c));
    while (c.phase !== 'retired') {
      if (c.phase === 'event') c = resolveSeason(c, false, () => .5);
      else c = advanceCareer(c, config.events, () => 0);
    }
    const final = render(c);
    assert.match(final, /career-final-content/);
    assert.doesNotMatch(final, /career-record-pending|Decisión pendiente/);
    noHiddenValues(final);
    assert.match(final, /El banquillo guarda tu sitio/);
    assert.match(final, /Compartir carrera/);
    assert.match(final, /Media más alta/);
    assert.match(final, /Premios colectivos/);
    assert.match(final, /Premios individuales/);
    assert.match(final, /Clubes de tu carrera/);
    assert.equal((final.match(/scope="row"/g) || []).length, 24);
    assert.match(final, /scope="row">40/);
    assert.match(final, /scope="row">17/);
    assert.doesNotMatch(final, /scope="row">1[3-6]/);
    assert.match(final, /La Comunidad del Banquillo/);
    const editor = renderToString(React.createElement(EventEditor, { event: config.events[0], change() {} }));
    assert.match(editor, /Equipo mixto/);
    // Gender now exists in the narrative preview, never as an event eligibility filter.
    const eligibility = editor.match(/<legend class="font-bold">Cuándo puede aparecer<\/legend>[\s\S]*?<\/fieldset>/)?.[0];
    assert(eligibility);
    assert.doesNotMatch(eligibility, /<option value="masculino"|<option value="femenino"/);
    for (const label of ['Cómo llega la historia', 'Formato de presentación', 'Quién lo cuenta', 'Miembro al azar', 'Personaje externo', 'Mensaje de WhatsApp', 'Vista previa de la presentación']) assert(editor.includes(label));
    for (const format of ['instagram', 'x']) {
      const sharedEvent = { ...config.events[0], scene: undefined, description: 'Condiciones del evento por separado.', presentation: { format, authorMode: 'external', authorName: 'Persona que comparte', message: '¡Equipo, mirad esto!', post: { author: 'Organización del torneo', handle: 'torneos_barrio', title: 'Torneo de sábado', text: 'Anuncio público de inscripción.' } } };
      const career = createCareer({ name: 'Prueba', number: 7, gender: 'femenino', position: 'Base', archetype: 'allround' }, { ...config, events: [sharedEvent] }, () => .5);
      const html = render(career);
      assert.match(html, /\*Comunidad del Banquillo\*/);
      assert.match(html, /career-chat-share/);
      const post = html.match(/<article class="career-shared-post[\s\S]*?<\/article>/)?.[0];
      assert(post); assert.match(post, /Organización del torneo/); assert.match(post, /Anuncio público de inscripción/);
      assert.doesNotMatch(post, /Persona que comparte|¡Equipo, mirad esto!|Condiciones del evento por separado/);
      assert(html.indexOf('Persona que comparte') < html.indexOf(post));
      assert(html.indexOf(post) < html.indexOf('¡Equipo, mirad esto!'));
      assert(html.indexOf('¡Equipo, mirad esto!') < html.indexOf('Condiciones del evento por separado.'));
      assert(html.indexOf('Condiciones del evento por separado.') < html.indexOf('de éxito si aceptas'));
      const socialEditor = renderToString(React.createElement(EventEditor, { event: sharedEvent, change() {} }));
      for (const label of ['Quién comparte en WhatsApp', '1. La publicación compartida', 'Autor del post', 'Alias del post', '2. Mensaje de WhatsApp al equipo']) assert(socialEditor.includes(label));
      assert(socialEditor.includes(format === 'x' ? 'Texto del tweet' : 'Texto del post de Instagram'));
    }
    for (const label of ['Éxito al aceptarlo', 'Botón para aceptar', 'Botón para rechazar', 'Desde los años', 'Lesiones previas mínimas', 'Narración de fallo']) assert(editor.includes(label));
    for (const label of ['Tiro', 'Pase', 'Control de presión', 'Evolución', 'Riesgo de lesión', 'Habilidad que influye', 'permanentes', 'puntos porcentuales']) assert(editor.includes(label));
    const retirement = renderToString(React.createElement(EventEditor, { event: config.events.find((event) => event.category === 'retirement'), change() {} }));
    assert.match(retirement, /termina la carrera antes de disputar esta temporada/);
  } catch (error) { throw new Error(error.message); }
});

test('la página pública no persiste perfiles ni requiere autenticación para jugar', async () => {
  const page = await readFile('src/pages/CareerPage.jsx', 'utf8');
  assert.doesNotMatch(page, /useAuth|localStorage|sessionStorage|saveCareer|loadCareer|user_game_data/);
  assert.match(page, /careerRepository.loadConfig/);
  assert.match(page, /beforeunload/);
  const persistence = await readFile('src/lib/careerPersistence.js', 'utf8');
  assert.doesNotMatch(persistence, /from\(['"]user_game_data/);
  assert.match(persistence, /return \{ loadConfig, saveConfig \}/);
});
