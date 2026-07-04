import React from 'react';
import { UsersRound } from 'lucide-react';
import { DRAFT_POSITIONS } from '@/data/cdbPlayers.js';

const courtSlots = {
  Base: 'left-[50%] top-[65%] -translate-x-1/2',
  Escolta: 'right-[5%] top-[47%]',
  Alero: 'left-[5%] top-[47%]',
  'Ala-Pívot': 'right-[17%] top-[9%]',
  Pívot: 'left-[17%] top-[9%]',
};

const shortPositions = {
  Base: 'B',
  Escolta: 'E',
  Alero: 'A',
  'Ala-Pívot': 'AP',
  Pívot: 'P',
};

const TeamSummary = ({ selectedPlayers }) => {
  const playerByPosition = new Map(selectedPlayers.map((player) => [player.draftPosition, player]));
  const skillCounts = selectedPlayers.reduce((map, player) => {
    (player.tags || []).forEach((tag) => {
      map.set(tag, (map.get(tag) || 0) + 1);
    });
    return map;
  }, new Map());
  const topSkills = Array.from(skillCounts.entries())
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, 8);

  return (
    <aside className="self-start rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/80 p-4">
      <span className="mb-3 inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]">
        <UsersRound size={17} />
        Quinteto
      </span>

      <div className="relative mx-auto aspect-[1.2] min-h-[285px] w-full max-w-[420px] overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.09),transparent_28%),linear-gradient(180deg,#172033_0%,#071020_100%)] shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:6px_100%]" />
        <div className="pointer-events-none absolute left-[6%] right-[6%] top-[-2%] h-[50%] rounded-b-[999px] border-x-2 border-b-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-[7%] h-[26%] w-[36%] -translate-x-1/2 rounded-b-[999px] border-x-2 border-b-2 border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-[17%] h-[21%] w-[22%] -translate-x-1/2 rounded-full border-2 border-white/18" />
        <div className="pointer-events-none absolute left-[18%] top-0 h-full border-l border-white/18" />
        <div className="pointer-events-none absolute right-[18%] top-0 h-full border-l border-white/18" />

        {DRAFT_POSITIONS.map((position) => {
          const player = playerByPosition.get(position);
          return (
            <div
              key={position}
              className={`absolute flex min-h-[58px] w-[96px] flex-col items-center justify-center rounded-xl border border-dashed p-2 text-center shadow-xl backdrop-blur-sm ${courtSlots[position]} ${
                player
                  ? 'border-[hsl(43_65%_52%_/_0.8)] bg-black/75'
                  : 'border-white/25 bg-white/[0.08]'
              }`}
            >
              <p className="text-[10px] font-black uppercase text-[hsl(43_65%_52%)]">
                {shortPositions[position]}
              </p>
              <p className={player ? 'mt-1 text-xs font-black leading-tight text-white' : 'mt-1 text-xs font-black text-gray-500'}>
                {player ? player.name : 'Pendiente'}
              </p>
            </div>
          );
        })}
      </div>

      {topSkills.length > 0 && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
          <p className="text-[11px] font-black uppercase text-[hsl(43_65%_52%)]">Habilidades acumuladas</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topSkills.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full border border-[hsl(43_65%_52%_/_0.22)] bg-[hsl(43_65%_52%_/_0.08)] px-2.5 py-1 text-[11px] font-black text-white"
              >
                {tag}
                <span className="ml-2 text-[hsl(43_65%_52%)]">x{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

    </aside>
  );
};

export default TeamSummary;
