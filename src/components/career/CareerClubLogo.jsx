import React, { useState } from 'react';
import { clubIdentity, validClubLogo } from '../../data/careerClubs.js';

export default function CareerClubLogo({ club, variant = 'avatar', className = '', width = 52, height = 52, decorative = false }) {
  const identity = clubIdentity(club);
  const [failed, setFailed] = useState('');
  // The original chat avatar has a white background; the existing club crest
  // is transparent. Keep custom club images and saved catalogue data untouched.
  const logo = variant === 'crest' && identity.id === 'cdb' && identity.logo === '/img/career-group-logo.png'
    ? '/img/logo.png' : identity.logo;
  const src = validClubLogo(logo) ? logo : '';
  if (src && failed !== src) return <img className={className} src={src} alt={decorative ? '' : 'Logo de ' + identity.name} width={width} height={height} onError={() => setFailed(src)} />;
  const initials = (identity.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('');
  return <span className={'career-club-initials ' + className} style={{ width, height }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Club ' + identity.name} aria-hidden={decorative || undefined}>{initials}</span>;
}
