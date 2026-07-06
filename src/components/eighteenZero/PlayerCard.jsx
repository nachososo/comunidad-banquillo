import React from 'react';
import { Check } from 'lucide-react';

const PlayerCard = ({ player, onSelect }) => {
  return (
    <article className="flex h-full flex-col rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#0d0d0d]/90 p-5 transition hover:border-[hsl(43_65%_52%_/_0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">#{player.displayNumber ?? player.number}</p>
          <h3 className="mt-1 text-2xl font-black text-white">{player.name}</h3>
          {player.nickname && <p className="text-sm font-bold text-gray-400">"{player.nickname}"</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold uppercase text-gray-400">
        <span className="rounded-lg bg-white/5 px-3 py-2">{player.position}</span>
        <span className="rounded-lg bg-white/5 px-3 py-2">{player.season}</span>
      </div>

      <div className="mt-4 flex flex-1 content-start flex-wrap gap-2">
        {player.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(player)}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_75%_58%)]"
      >
        <Check size={17} />
        Elegir jugador
      </button>
    </article>
  );
};

export default PlayerCard;
