import React, { useState } from 'react';
import { Field, Notice } from './CareerLayout.jsx';
import CareerGroupHeader from './CareerGroupHeader.jsx';
import { CLUB_TIERS, clubsFor, MAX_CLUB_LOGO_BYTES, minimumOverallForClub } from '../../data/careerClubs.js';
import { LEAGUE_TIERS, leagueChanceForClub, leagueTierForClub } from '../../utils/careerLeague.js';

export default function CareerClubsEditor({ config, edit }) {
  const clubs = clubsFor(config);
  const [selectedId, setSelectedId] = useState('cdb');
  const [error, setError] = useState('');
  const selected = clubs.find((club) => club.id === selectedId) || clubs[0];
  const updateClub = (id, patch) => edit((current) => ({ ...current, clubs: clubsFor(current).map((club) => club.id === id ? { ...club, ...patch } : club) }));
  const change = (patch) => updateClub(selected.id, patch);
  const upload = (input) => {
    const file = input.files?.[0], id = selected.id;
    input.value = ''; setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_CLUB_LOGO_BYTES) { setError('Usa un PNG, JPG o WebP de hasta 200 KB.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setError('No se pudo leer la imagen.');
    reader.onload = () => updateClub(id, { logo: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const references = config.events.filter((event) => event.targetClubId === selected.id || event.clubId === selected.id);
  const leagueTier = leagueTierForClub(selected);
  const leagueDefaults = LEAGUE_TIERS[leagueTier];
  return <section className="career-panel career-stack">
    <div className="career-actions justify-between"><h2>Clubes y grupos</h2><button type="button" className="career-button" disabled={clubs.length >= 50} onClick={() => {
      const club = { id: crypto.randomUUID(), name: 'Nuevo club', groupName: 'Grupo del nuevo club', tier: 1, logo: '', contactName: 'Coordinación deportiva', members: [] };
      edit((current) => ({ ...current, clubs: [...clubsFor(current), club] })); setSelectedId(club.id);
    }}>Añadir club</button></div>
    <Field label="Club que quieres editar"><select value={selected.id} onChange={(e) => { setSelectedId(e.target.value); setError(''); }}>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name || 'Club sin nombre'}</option>)}</select></Field>
    <div className="career-grid">
      <Field label="Nombre del club"><input maxLength={80} value={selected.name} onChange={(e) => change({ name: e.target.value })} /></Field>
      <Field label="Nombre del grupo de WhatsApp"><input maxLength={80} value={selected.groupName} onChange={(e) => change({ groupName: e.target.value })} /></Field>
      <Field label="Tier municipal"><select value={selected.tier ?? 1} onChange={(e) => change({ tier: Number(e.target.value), minOverall: null })}>{Object.entries(CLUB_TIERS).map(([tier, info]) => <option key={tier} value={tier}>Tier {tier} · {info.label} · {info.minOverall ? 'Media ' + info.minOverall : 'Sin mínimo'}</option>)}</select></Field>
      <Field label="Media mínima personalizada (opcional)" hint={'Mínimo efectivo: ' + (minimumOverallForClub(selected) || 'sin mínimo') + '. Vacío utiliza el mínimo del tier; cambiar de tier restablece ese mínimo.'}><input type="number" min={0} max={100} step={1} value={selected.minOverall ?? ''} placeholder={String(CLUB_TIERS[selected.tier ?? 1].minOverall)} onChange={(e) => change({ minOverall: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
      <Field label="Persona que propone los fichajes"><input maxLength={80} value={selected.contactName} onChange={(e) => change({ contactName: e.target.value })} placeholder="Nombre del contacto del club" /></Field>
      <Field label="Logo del club" hint="PNG, JPG o WebP, hasta 200 KB. Se incluye en el catálogo local; no se sube a ningún servicio."><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.currentTarget)} /></Field>
    </div>
    <fieldset className="career-stack">
      <legend>Opciones de ganar la liga municipal</legend>
      <p className="career-muted">{selected.id === 'cdb' ? 'El Banquillo compite como tier 3 para ganar la liga, independientemente de los requisitos de fichaje.' : 'Probabilidades de tier ' + leagueTier + '. Vacío utiliza los valores del tier.'} Aumentan progresivamente con la media. Estos porcentajes solo se muestran en el panel.</p>
      <div className="career-grid">
        <Field label="Probabilidad con media 0 (%)"><input type="number" min={0.01} max={99.99} step={0.01} value={selected.leagueBaseChance ?? ''} placeholder={String(leagueDefaults.base)} onChange={(e) => change({ leagueBaseChance: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
        <Field label="Probabilidad con media 100 (%)"><input type="number" min={0.01} max={99.99} step={0.01} value={selected.leagueMaxChance ?? ''} placeholder={String(leagueDefaults.max)} onChange={(e) => change({ leagueMaxChance: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
      </div>
      <p className="career-muted">{[40, 70, 90].map((overall) => 'Media ' + overall + ': ' + leagueChanceForClub(selected, overall).toLocaleString('es', { maximumFractionDigits: 2 }) + '%').join(' · ')}</p>
      <button type="button" className="career-button secondary" onClick={() => change({ leagueBaseChance: null, leagueMaxChance: null })}>Usar probabilidades del tier</button>
    </fieldset>
    <Notice error>{error}</Notice>
    {selected.logo && <button type="button" className="career-button secondary" onClick={() => change({ logo: '' })}>Quitar logo</button>}
    <Field label="Nombres del grupo (uno por línea)" hint={selected.id === 'cdb' ? 'Si lo dejas vacío, se utiliza la plantilla original de la Comunidad del Banquillo.' : 'Se usan en mensajes de miembros al azar. Sin nombres, hablará el entrenador.'}><textarea rows={4} value={selected.members.join('\n')} onChange={(e) => change({ members: e.target.value.split('\n') })} onBlur={() => change({ members: selected.members.map((name) => name.trim()).filter(Boolean) })} /></Field>
    <div className="career-group-chat"><CareerGroupHeader club={selected} /></div>
    {selected.id !== 'cdb' && <><button type="button" className="career-button danger" disabled={references.length > 0} onClick={() => {
      if (!window.confirm('¿Eliminar ' + selected.name + ' del borrador de clubes?')) return;
      edit((current) => ({ ...current, clubs: clubsFor(current).filter((club) => club.id !== selected.id) })); setSelectedId('cdb');
    }}>Eliminar club</button>{references.length > 0 && <p className="career-muted">Este club está vinculado a {references.length} eventos. Cambia sus clubes o elimina esos eventos antes de borrar el club.</p>}</>}
  </section>;
}
