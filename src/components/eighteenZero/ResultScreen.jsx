import React from 'react';
import { Link2, RotateCcw, Star, Trophy } from 'lucide-react';
import EventList from './EventList.jsx';
import ShareResultButton from './ShareResultButton.jsx';
import { getOrderedDraftTeam } from '@/utils/shareResult.js';

const scoreLabels = [
  ['attackScore', 'Ataque'],
  ['defenseScore', 'Defensa'],
  ['reboundPhysicalScore', 'Rebote/Físico'],
  ['chemistryScore', 'Química'],
  ['clutchEventScore', 'Clutch'],
  ['totalScore', 'Total'],
];

const ResultScreen = ({ team, coach, result, onRestart }) => {
  const orderedTeam = getOrderedDraftTeam(team);

  return (
  <section className="space-y-6">
    <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[#111]/90 p-6 sm:p-8">
      <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]">
        <Trophy size={18} />
        Resultado final
      </p>
      <h1 className="mt-3 text-5xl font-black text-white sm:text-7xl">
        {result.recordInfo.record}
        <span className="block text-3xl text-[hsl(43_65%_52%)] sm:text-4xl">{result.recordInfo.title}</span>
      </h1>
      <p className="mt-4 max-w-3xl text-gray-300">{result.recordInfo.description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_75%_58%)]"
        >
          <RotateCcw size={17} />
          Volver a jugar
        </button>
        <ShareResultButton team={orderedTeam} result={result} />
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-5">
      {orderedTeam.map((player) => (
        <article key={player.id} className="rounded-lg border border-white/10 bg-black/35 p-4 text-center">
          <p className="text-[11px] font-black uppercase text-[hsl(43_65%_52%)]">{player.draftPosition}</p>
          <h2 className="mt-1 text-lg font-black text-white">{player.name}</h2>
          <p className="mt-1 text-xs font-bold text-gray-500">{player.season}</p>
          {player.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {player.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/12 bg-white/7 px-2 py-1 text-[10px] font-black uppercase text-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>

    {coach && <article className="flex flex-col items-center justify-center rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#111]/85 p-5 text-center"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Entrenador elegido</p><h2 className="mt-1 block text-2xl font-black text-white">{coach.name}</h2></article>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {scoreLabels.map(([key, label]) => (
        <div key={key} className="rounded-lg border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/80 p-4 text-center">
          <p className="text-[11px] font-black uppercase text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{result.scores[key]}</p>
        </div>
      ))}
    </div>

    <article className="rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/85 p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[hsl(43_65%_52%)]">
          <Star size={17} />
          Banquiller del año
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">{result.mvp.name}</h2>
        </div>
        <div className="flex min-w-36 items-center justify-center rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[hsl(43_65%_52%_/_0.08)] px-5 py-4 text-center">
          <p className="inline-flex flex-col items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]"><Star size={22} /> CDB Awards</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[hsl(43_65%_52%)]">
          <Star size={17} />
          Jugador clave
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">{result.keyPlayer.name}</h2>
        </div>
      </div>
    </article>

    {result.playerChemistryResults?.length > 0 && (
      <article className="rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/85 p-5">
        <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]">
          <Link2 size={17} />
          Química especial
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {result.playerChemistryResults.map((link) => (
            <div key={link.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-white">{link.name}</h3>
                <span className="rounded-full bg-[hsl(43_65%_52%)] px-3 py-1 text-xs font-black text-black">
                  {link.modifier > 0 ? `+${link.modifier}` : link.modifier}
                </span>
              </div>
              {link.description && <p className="mt-2 text-sm text-gray-400">{link.description}</p>}
            </div>
          ))}
        </div>
      </article>
    )}

    <EventList events={result.eventResults} />
  </section>
  );
};

export default ResultScreen;
