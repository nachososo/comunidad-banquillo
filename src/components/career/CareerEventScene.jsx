import React from 'react';
import { ChevronLeft, Heart, MessageCircle, Instagram, Send } from 'lucide-react';
import CareerGroupHeader from './CareerGroupHeader.jsx';
import { DEFAULT_SHARE_MESSAGE, isSocialFormat, sceneForEvent, senderTone } from '../../utils/careerPresentation.js';
import CareerChatMessage from './CareerChatMessage.jsx';
import { messageForProfile } from '../../utils/careerNarrative.js';
import CareerClubLogo from './CareerClubLogo.jsx';

export function EventSceneHeader({ scene, club, offerClub }) {
  if (scene.format !== 'direct') return <CareerGroupHeader club={club} />;
  return <header className="career-group-header career-scene-header">
    <span aria-hidden="true"><ChevronLeft size={24} /></span>
    {offerClub && <CareerClubLogo club={offerClub} />}
    <div className="career-group-identity"><h2>{scene.author.name}</h2><p>{offerClub ? offerClub.name + ' · Mensaje privado' : 'Mensaje privado · Escena ficticia'}</p></div>
  </header>;
}

export default function CareerEventScene({ event, career }) {
  const scene = sceneForEvent(event, career);
  const social = isSocialFormat(scene.format);
  const message = messageForProfile(scene.message || (social ? DEFAULT_SHARE_MESSAGE : event.description), career.profile);
  const name = scene.author.name;
  if (!social) return <CareerChatMessage sender={name} tone={senderTone(name)} message={message} time="18:10" />;
  const post = scene.post;
  return <CareerChatMessage sender={name} tone={senderTone(name)} time="18:10" className="career-chat-share">
    <article className={'career-shared-post career-shared-' + scene.format} aria-label={scene.format === 'instagram' ? 'Publicación de Instagram compartida' : 'Tweet compartido'}>
      <div className="career-shared-platform">{scene.format === 'instagram' ? <Instagram size={16} aria-hidden="true" /> : <span className="career-x-mark" aria-hidden="true">𝕏</span>}<span>{scene.format === 'instagram' ? 'Instagram' : 'X / Twitter'} · Publicación ficticia</span></div>
      <header className="career-shared-author"><strong>{post.author || 'Autor de la publicación'}</strong>{post.handle && <small>@{post.handle.replace(/^@/, '')}</small>}</header>
      {scene.format === 'instagram' && <div className="career-social-announcement"><span>BALONCESTO DE BARRIO</span><strong>{messageForProfile(post.title || 'Nos vemos en la pista', career.profile)}</strong>{scene.location && <span>{scene.location}</span>}</div>}
      {scene.format === 'x' && post.title && <h3>{messageForProfile(post.title, career.profile)}</h3>}
      <p>{messageForProfile(post.text || 'Escribe aquí el contenido de la publicación desde el editor.', career.profile)}</p>
      <div className="career-social-actions" aria-hidden="true"><Heart size={17} /><MessageCircle size={17} /><Send size={17} /></div>
    </article>
    <p>{message}</p>
  </CareerChatMessage>;
}
