import React from 'react';
import { ChevronDown, ChevronLeft, Plus, Video } from 'lucide-react';
import { clubIdentity } from '../../data/careerClubs.js';
import CareerClubLogo from './CareerClubLogo.jsx';

export default function CareerGroupHeader({ club }) {
  const identity = clubIdentity(club);
  return <header className="career-group-header">
    <span className="career-group-back" aria-hidden="true"><ChevronLeft size={27} /></span>
    <div className="career-group-avatar"><CareerClubLogo club={identity} /><span aria-hidden="true"><Plus size={15} /></span></div>
    <div className="career-group-identity"><h2>{identity.groupName}</h2><p>Grupo del equipo</p></div>
    <span className="career-group-video" aria-hidden="true"><Video size={27} strokeWidth={1.7} /><ChevronDown size={12} /></span>
  </header>;
}
