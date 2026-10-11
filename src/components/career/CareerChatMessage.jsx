import React from 'react';

// The welcome and season conversations intentionally share the same markup.
export default function CareerChatMessage({ sender, tone = 'blue', message, time, children, className = '' }) {
  return <li className={'career-group-bubble career-chat-message' + (className ? ' ' + className : '')}>
    <strong className={'career-group-sender ' + (['blue', 'green', 'purple'].includes(tone) ? tone : 'blue')}>{sender}</strong>
    {message && <p>{message}</p>}
    {children}
    {time && <time>{time}</time>}
  </li>;
}
