import React from 'react';
import { CheckCheck, MessageCircle, Send } from 'lucide-react';
import { START_AGE } from '../../data/careerData.js';

export default function CareerInvitation({ onAccept }) {
  return <section className="career-invitation" aria-labelledby="career-invitation-title">
    <header className="career-invitation-heading"><p className="career-kicker">Tienes {START_AGE} años · El comienzo</p><h1 id="career-invitation-title">Todo empieza con un mensaje.</h1><p>Antes de las estadísticas, los premios y las grandes noches, estaba tu primo.</p></header>
    <div className="career-chat" role="region" aria-label="Conversación con tu primo">
      <div className="career-chat-header"><span className="career-chat-avatar"><MessageCircle size={24} aria-hidden="true" /></span><div><h2>Tu primo</h2><p>Una invitación que lo cambia todo</p></div><span className="career-chat-status">en línea</span></div>
      <div className="career-chat-messages" tabIndex={0} role="region" aria-label="Mensajes de tu primo">
        <p className="career-chat-day">HOY</p>
        <ol className="career-chat-thread">
          <li className="career-chat-bubble"><p>¡Ey! 🏀 ¿Te acuerdas de que queríamos montar un equipo?</p><span className="career-chat-time">18:07</span></li>
          <li className="career-chat-bubble"><p>Pues ya está. Mis amigos y yo hemos formado un equipo para jugar en la liga municipal: <strong>La Comunidad del Banquillo.</strong></p><span className="career-chat-time">18:07</span></li>
          <li className="career-chat-bubble"><p>Nos falta alguien como tú. Vente a jugar con nosotros, que lo vamos a pasar bien. ¿Te apuntas?</p><span className="career-chat-time">18:08</span></li>
        </ol>
        <div className="career-chat-club"><img src="/img/logo.png" alt="Escudo de La Comunidad del Banquillo" /><div><strong>La Comunidad del Banquillo</strong><span>Liga municipal · Un equipo de amigos</span></div></div>
        <p className="career-chat-note"><CheckCheck size={14} aria-hidden="true" /> Tu carrera todavía está por escribir.</p>
      </div>
      <div className="career-chat-reply"><button type="button" onClick={onAccept}>¡Me apunto, primo! <Send size={18} aria-hidden="true" /></button><p>Responder y crear mi jugador</p></div>
    </div>
  </section>;
}
