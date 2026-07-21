import React from 'react';
import { Clock3, RotateCw, Star } from 'lucide-react';

const formatGameDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const getLineupText = (lineup = []) =>
  lineup
    .map((player) => `${player.draftPosition}: ${player.name}`)
    .join(' · ');

const GameHistory = ({ games = [], isAuthenticated, isLoading }) => {
  if (!isAuthenticated) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111]/80">
      <div className="flex items-center gap-3 border-b border-white/10 p-5 sm:p-6">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <Clock3 size={21} className="text-[hsl(43_65%_52%)]" />
        </div>
        <div>
          <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Historial personal</p>
          <h2 className="text-2xl font-black text-white">Mis últimas partidas</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm font-black uppercase text-gray-400">Cargando partidas...</p>
      ) : games.length === 0 ? (
        <p className="p-8 text-center text-sm font-bold text-gray-400">Cuando termines una partida guardada aparecerá aquí.</p>
      ) : (
        <div className="divide-y divide-white/10">
          {games.map((game) => (
            <article key={game.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[hsl(43_65%_52%)] px-3 py-1 text-xs font-black text-black">
                      {game.record}
                    </span>
                    {game.usedReroll && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-gray-300">
                        <RotateCw size={12} />
                        reroll usado
                      </span>
                    )}
                    <span className="text-xs font-bold text-gray-500">{formatGameDate(game.createdAt)}</span>
                  </div>
                  <p className="mt-3 truncate text-sm font-bold text-gray-300">{getLineupText(game.lineup)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {game.coach?.name && <span>Entrenador: <strong className="text-gray-300">{game.coach.name}</strong></span>}
                    {game.mvp?.name && (
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} className="text-[hsl(43_65%_52%)]" />
                        MVP: <strong className="text-gray-300">{game.mvp.name}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl font-black text-[hsl(43_65%_52%)]">{game.score}</p>
                  <p className="text-[10px] font-black uppercase text-gray-500">puntos</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default GameHistory;
