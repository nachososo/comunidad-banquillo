import React, { useState } from 'react';
import { Field } from './CareerLayout.jsx';
import { AUTHOR_MODES, CAREER_CAST, DEFAULT_SHARE_MESSAGE, isLiveFormat, isSocialFormat, PRESENTATION_FORMATS, presentationFor } from '../../utils/careerPresentation.js';
import { SeasonEvent } from './CareerPlay.jsx';
import { STARTING_CLUB } from '../../data/careerClubs.js';

export default function CareerPresentationEditor({ event, change, clubs = [STARTING_CLUB] }) {
  const p = presentationFor(event);
  const social = isSocialFormat(p.format);
  const court = p.format === 'court', bench = p.format === 'bench', bar = p.format === 'bar';
  const live = isLiveFormat(p.format);
  const transfer = event.category === 'transfer';
  const [gender, setGender] = useState('masculino');
  const [previewReply, setPreviewReply] = useState('');
  const update = (patch) => { setPreviewReply(''); change({ presentation: { ...p, ...patch } }); };
  const previewCareer = { age: Math.max(17, Number(event.minAge) || 17), clubs, currentClub: clubs.find((club) => club.id === event.clubId) || clubs[0], profile: { name: 'Tu personaje', number: 7, gender }, overall: 50, pendingEvent: { ...event, scene: undefined } };
  return <fieldset className="career-presentation-editor career-stack">
    <legend>Cómo llega la historia</legend>
    <p className="career-muted">{court ? 'Una decisión en plena pista. Marcador y reloj ambientan la escena: no simulan un partido adicional ni imponen un tiempo para responder.' : bar ? 'Una conversación informal después del partido en La Caña de Gonzalo, con su imagen y sin interfaz de mensajería.' : bench ? 'Una conversación cara a cara, sin interfaz de mensajería. Elige quién habla y escribe su propuesta.' : social ? 'Alguien comparte una publicación dentro del grupo y añade un mensaje. El autor del post y quien lo comparte se editan por separado.' : 'Primero habla alguien; después aparece la explicación del evento.'} Todo es ficticio, sin conexión con redes sociales.</p>
    <div className="career-grid">
      <Field label="Formato de presentación"><select disabled={transfer} value={transfer ? 'direct' : p.format} onChange={(e) => update({ format: e.target.value })}>{Object.entries(PRESENTATION_FORMATS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
      {transfer && <p className="career-muted">La oferta llega por privado desde el contacto fijado en el club de destino.</p>}
      {!transfer && !court && <Field label={social ? 'Quién comparte en WhatsApp' : bench || bar ? 'Quién habla contigo' : 'Quién lo cuenta'}><select value={p.authorMode} onChange={(e) => update({ authorMode: e.target.value })}>{Object.entries(AUTHOR_MODES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>}
      {!transfer && !court && p.authorMode === 'member' && <Field label="Miembro de la plantilla" hint="Miembros de la Comunidad del Banquillo. Para sus historias exclusivas, selecciona el Banquillo en «Solo mientras juegas en»."><select value={p.memberId} onChange={(e) => update({ memberId: e.target.value })}><option value="">Selecciona una persona</option>{CAREER_CAST.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>}
      {!transfer && !court && p.authorMode === 'external' && <Field label="Nombre del personaje externo"><input maxLength={80} value={p.authorName} onChange={(e) => update({ authorName: e.target.value })} placeholder="Ej.: Organización del torneo" /></Field>}
      {!transfer && !court && p.authorMode === 'random' && <p className="career-muted">Se elige entre los miembros del club actual. El autor se mantiene durante el evento y no altera los sorteos deportivos.</p>}
      {!social && !live && <Field label="Alias ficticio (opcional)" hint="No se enlaza a ninguna cuenta real."><input maxLength={40} value={p.handle} onChange={(e) => update({ handle: e.target.value })} placeholder="@basket_del_barrio" /></Field>}
      {bar ? <Field label="Lugar"><input value="La Caña de Gonzalo" disabled /></Field> : <Field label="Lugar (opcional)"><input maxLength={100} value={p.location} onChange={(e) => update({ location: e.target.value })} placeholder="La Elipa" /></Field>}
    </div>
    {court && <fieldset className="career-post-editor career-stack"><legend>Marcador de la escena</legend><div className="career-grid">
      {[['homeLabel', 'Nombre de tu equipo'], ['awayLabel', 'Nombre del rival']].map(([key, label]) => <Field key={key} label={label}><input maxLength={40} value={p.court[key]} onChange={(e) => update({ court: { ...p.court, [key]: e.target.value } })} /></Field>)}
      {[['homeScore', 'Puntos de tu equipo'], ['awayScore', 'Puntos del rival']].map(([key, label]) => <Field key={key} label={label}><input type="number" min={0} max={200} step={1} value={p.court[key]} onChange={(e) => update({ court: { ...p.court, [key]: e.target.value === '' ? '' : Number(e.target.value) } })} /></Field>)}
      <Field label="Periodo"><input maxLength={30} value={p.court.period} onChange={(e) => update({ court: { ...p.court, period: e.target.value } })} placeholder="4º cuarto" /></Field>
      <Field label="Tiempo restante (MM:SS)"><input maxLength={5} value={p.court.clock} onChange={(e) => update({ court: { ...p.court, clock: e.target.value } })} placeholder="00:08" /></Field>
    </div></fieldset>}
    {social && <fieldset className="career-post-editor career-stack"><legend>1. La publicación compartida</legend>
      <div className="career-grid">
        <Field label="Autor del post" hint="La cuenta que anuncia el torneo, no quien envía el WhatsApp."><input maxLength={80} value={p.post.author} onChange={(e) => update({ post: { ...p.post, author: e.target.value } })} placeholder="Baloncesto del barrio" /></Field>
        <Field label="Alias del post (opcional)"><input maxLength={40} value={p.post.handle} onChange={(e) => update({ post: { ...p.post, handle: e.target.value } })} placeholder="@torneos_del_barrio" /></Field>
      </div>
      <Field label="Titular de la publicación (opcional)"><input maxLength={100} value={p.post.title} onChange={(e) => update({ post: { ...p.post, title: e.target.value } })} placeholder="Torneo de baloncesto en La Elipa" /></Field>
      <Field label={p.format === 'instagram' ? 'Texto del post de Instagram' : 'Texto del tweet'} hint="Obligatorio en estos formatos. No incluye los efectos ni las probabilidades del juego."><textarea rows={4} maxLength={1500} value={p.post.text} onChange={(e) => update({ post: { ...p.post, text: e.target.value } })} placeholder="La semana que viene celebramos un torneo en La Elipa. ¡Inscripciones abiertas para equipos!" /></Field>
    </fieldset>}
    <Field label={court ? 'Narración del momento' : bench || bar ? 'Lo que te dice' : social ? '2. Mensaje de WhatsApp al equipo' : 'Mensaje de WhatsApp'} hint={social ? 'Tu comentario debajo del post. Admite bienvenido/a y preparado/a; si lo dejas vacío se propone una respuesta genérica.' : 'Admite bienvenido/a y preparado/a. Si lo dejas vacío, se usa la explicación.'}><textarea rows={4} maxLength={1500} value={p.message} onChange={(e) => update({ message: e.target.value })} placeholder={court ? 'El balón llega a tus manos. Queda una última posesión.' : bar ? 'Después del partido, entre algo de beber y las bromas del equipo, alguien saca un tema importante.' : bench ? 'Quiero contar contigo para dar un paso más este año. ¿Cómo lo ves?' : social ? DEFAULT_SHARE_MESSAGE : '¡Gente! Me han dicho que la semana que viene hay torneo en La Elipa! ¿Nos apuntamos?'} /></Field>
    <details className="career-presentation-preview" open>
      <summary>Vista previa de la presentación</summary>
      <Field label="Trato en la vista previa"><select value={gender} onChange={(e) => { setGender(e.target.value); setPreviewReply(''); }}><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></Field>
      <div className="career-game"><section className="career-panel career-season-panel"><SeasonEvent career={previewCareer} action={() => setPreviewReply('Respuesta de muestra. Para comprobar efectos, usa la prueba del evento de abajo.')} /></section></div>
      {previewReply && <p className="career-muted" role="status">{previewReply}</p>}
    </details>
  </fieldset>;
}
