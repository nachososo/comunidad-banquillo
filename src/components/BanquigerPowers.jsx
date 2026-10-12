import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { POWER_ODDS, POWER_RARITIES, validatePowerTargets } from '@/utils/banquigerPowers.js';

export default function BanquigerPowers({ cards, catalog, teams, sourceTeamId, uses, open, onUse, notice }) {
  const [choices, setChoices] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (card, index, patch) => setChoices(previous => {
    const targets = previous[card.instanceId] || Array.from({ length: card.power.rivalCount }, () => ({ teamId: card.power.type === 'positive' ? sourceTeamId : '', playerIds: [] }));
    return { ...previous, [card.instanceId]: targets.map((t, i) => i === index ? { ...t, ...patch } : t) };
  });
  const activate = async (card, targets) => {
    const message = validatePowerTargets(card.power, targets, teams, sourceTeamId, card.eligibleTeamIds || []);
    if (message) { setError(message); return; }
    setBusy(true); setError('');
    try { await onUse(card, targets); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <section className="space-y-4">
    <div className="rounded-xl border border-yellow-600/25 bg-[#111]/90 p-5">
      <p className="text-xs font-black uppercase text-yellow-500">Poderes del Banquillo</p>
      <h2 className="mt-1 text-xl font-black text-white">Cartas de remontada</h2>
      <p className="mt-2 text-sm text-gray-400">Los tres últimos de la jornada definitiva reciben una carta para el siguiente partido. Una activación antes del cierre del mercado; después caduca. Los ataques afectan solo al equipo elegido y solo a rivales que quedaron por delante.</p>
      {(notice || error) && <p role="status" className="my-4 rounded-lg border border-yellow-600/30 p-3 text-sm text-yellow-200">{error || notice}</p>}
      {!cards.length && <p className="my-6 text-center text-gray-400">No tienes cartas disponibles. Se reparten al publicar la clasificación definitiva, con al menos cuatro equipos completos.</p>}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{cards.map(card => {
        const power = card.power;
        const targets = choices[card.instanceId] || Array.from({ length: power.rivalCount }, () => ({ teamId: power.type === 'positive' ? sourceTeamId : '', playerIds: [] }));
        const rivals = teams.filter(t => (card.eligibleTeamIds || []).includes(String(t.id)));
        return <article key={card.instanceId} className="rounded-xl border border-yellow-600/30 bg-black/30 p-5">
          <span className={`text-xs font-black ${power.type === 'positive' ? 'text-green-300' : 'text-red-300'}`}>{power.type === 'positive' ? 'Propio' : 'Ataque rival'} · {POWER_RARITIES[power.rarity]}</span>
          <h3 className="mt-1 text-xl font-black text-white">{power.name}</h3><p className="mt-3 text-sm text-gray-400">{power.description}</p>
          {targets.map((target, index) => {
            const team = teams.find(t => String(t.id) === String(target.teamId));
            const candidates = (team?.lineup || []).filter(p => (!power.bench || !p.starter) && (!power.starterOnly || p.starter));
            return <fieldset key={index} disabled={!open || busy} className="mt-4 space-y-3"><legend className="text-xs font-bold text-gray-400">Objetivo {index + 1}</legend>
              {power.type === 'negative' && <select aria-label={`Equipo rival ${index + 1}`} value={target.teamId} onChange={e => update(card, index, { teamId: e.target.value, playerIds: [] })} className="w-full rounded-lg border border-white/10 bg-black p-3 text-sm text-white"><option value="">Elegir rival</option>{rivals.map(t => <option key={t.id} value={t.id}>{t.team}</option>)}</select>}
              {power.count === 7 ? <p className="text-sm text-gray-300">Afecta a toda la plantilla seleccionada.</p> : <div><p className="mb-2 text-xs text-gray-400">Elige {power.count} {power.bench ? 'suplente(s)' : power.starterOnly ? 'titular(es)' : 'jugador(es)'}</p>{candidates.map(player => <label key={player.id} className="flex gap-2 py-1 text-sm text-gray-300"><input type="checkbox" checked={target.playerIds.includes(player.id)} onChange={e => update(card, index, { playerIds: e.target.checked ? [...target.playerIds, player.id] : target.playerIds.filter(id => id !== player.id) })} />{player.name} · {player.starter ? 'Titular' : 'Suplente'}</label>)}</div>}
            </fieldset>;
          })}
          <button disabled={!open || busy} onClick={() => activate(card, targets)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600 p-3 text-sm font-black text-black disabled:opacity-40"><Zap size={16} />{busy ? 'Activando…' : open ? 'Activar poder' : 'Mercado cerrado'}</button>
        </article>;
      })}</div>
    </div>
    {!!uses.length && <div className="rounded-xl border border-white/10 bg-[#111]/90 p-5"><h3 className="font-black text-white">Registro de esta jornada</h3>{uses.map(use => <p key={use.id} className="mt-3 text-sm text-gray-400"><strong className="text-white">{use.sourceTeamName}</strong> usó <strong className="text-yellow-300">{use.powerName}</strong> sobre {(use.targets || []).map(target => { const team = teams.find(t => String(t.id) === target.teamId); return `${team?.team || 'Equipo'}${target.playerIds.length ? ` (${target.playerIds.map(id => team?.lineup.find(p => p.id === id)?.name || 'Jugador').join(', ')})` : ' (plantilla completa)'}`; }).join(' · ')}.</p>)}</div>}
    <details className="rounded-xl border border-white/10 bg-[#111]/90 p-5"><summary className="cursor-pointer font-black text-white">Catálogo de los 32 poderes y probabilidades</summary>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm text-gray-300"><thead><tr><th className="p-2">Posición</th>{Object.values(POWER_RARITIES).map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{POWER_ODDS.map((odds, i) => <tr key={i}><td className="p-2">{['Antepenúltimo', 'Penúltimo', 'Último'][i]}</td>{odds.map((n,j) => <td key={j} className="p-2">{n}%</td>)}</tr>)}</tbody></table></div>
      <p className="my-3 text-sm text-gray-400">60% propios y 40% ataques en cada rareza. No se repiten las tres últimas cartas recibidas. Máximo de daño combinado: 60% de la puntuación positiva de cada jugador y 24 puntos por equipo. En empates se utiliza el identificador del equipo como desempate estable.</p>
      <div className="grid gap-3 sm:grid-cols-2">{catalog.map(power => <article key={power.id} className="rounded-lg bg-black/25 p-3"><p className="text-xs text-yellow-300">{POWER_RARITIES[power.rarity]} · {power.type === 'positive' ? 'Propio' : 'Ataque'}{power.active === false ? ' · Desactivado' : ''}</p><h4 className="mt-1 font-bold text-white">{power.name}</h4><p className="mt-1 text-sm text-gray-400">{power.description}</p></article>)}</div>
    </details>
  </section>;
}
