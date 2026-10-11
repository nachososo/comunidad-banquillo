import React from 'react';
import { ArrowRight, Camera, Mic, Plus, Sticker } from 'lucide-react';
import CareerGroupHeader from './CareerGroupHeader.jsx';
import CareerChatMessage from './CareerChatMessage.jsx';
import { CAREER_WELCOME_MESSAGES } from '../../data/careerConversations.js';
import { START_AGE } from '../../data/careerData.js';
import { messageForProfile } from '../../utils/careerNarrative.js';

export default function CareerGroupWelcome({ profile, club, onContinue, messages = CAREER_WELCOME_MESSAGES }) {
  return <section className="career-invitation career-group-welcome" aria-labelledby="career-group-title">
    <header className="career-invitation-heading">
      <p className="career-kicker">{START_AGE} años · Antes de tu primera temporada</p>
      <h1 id="career-group-title">{messageForProfile({ masculino: 'Bienvenido al grupo.', femenino: 'Bienvenida al grupo.' }, profile)}</h1>
      <p>Tu primo te ha abierto la puerta. Ahora empieza tu historia con la comunidad.</p>
    </header>
    <div className="career-group-chat" role="region" aria-label="Bienvenida ficticia al grupo de WhatsApp">
      <CareerGroupHeader club={club} />
      <div className="career-group-messages" tabIndex={0} role="region" aria-label="Conversación de bienvenida">
        <p className="career-group-day">HOY</p>
        <p className="career-group-system">Tu primo ha añadido a {profile.name}.</p>
        {messages.length > 0 ? <ol className="career-group-thread" aria-label="Mensajes de bienvenida">{messages.map((message) => <CareerChatMessage key={message.id} sender={message.sender} tone={message.tone} message={messageForProfile(message.text, profile)} time={message.time} />)}</ol> : <div className="career-group-pending"><p>La bienvenida está por escribir.</p><span>Aquí irán las frases y los guiños del equipo, con el nombre de quien los dice.</span><small>Diseño preparado · Mensajes pendientes</small></div>}
      </div>
      <div className="career-group-composer" aria-hidden="true"><Plus size={25} /><span><Sticker size={21} /></span><Camera size={25} /><Mic size={25} /></div>
    </div>
    <div className="career-group-next"><button type="button" className="career-button" onClick={onContinue}>Ir a mi primera temporada <ArrowRight size={17} aria-hidden="true" /></button></div>
  </section>;
}
