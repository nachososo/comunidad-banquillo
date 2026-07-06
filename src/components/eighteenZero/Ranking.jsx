import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, LogIn, Medal, Trophy } from 'lucide-react';

const positionStyles = {
  1: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
  2: 'border-slate-300/30 bg-slate-300/10 text-slate-200',
  3: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
};

const Ranking = ({ entries, currentUserId, isAuthenticated, isAuthLoading, isLoading }) => {
  const visibleEntries = entries.slice(0, 10);
  const currentEntry = entries.find((entry) => entry.userId === currentUserId);
  const currentIsOutsideTop = currentEntry && currentEntry.position > 10;

  return (
    <section className="overflow-hidden rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#111]/90">
      <div className="flex items-center gap-3 border-b border-white/10 p-5 sm:p-6">
        <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[hsl(43_65%_52%_/_0.08)] p-2.5">
          <Trophy size={21} className="text-[hsl(43_65%_52%)]" />
        </div>
        <div>
          <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Clasificación 18-0</p>
          <h2 className="text-2xl font-black text-white">Ranking de la comunidad</h2>
        </div>
      </div>

      {isAuthLoading ? (
        <p className="p-8 text-center text-sm font-black uppercase text-gray-400">Comprobando sesión...</p>
      ) : !isAuthenticated ? (
        <div className="p-6 text-center sm:p-8">
          <LogIn size={28} className="mx-auto text-[hsl(43_65%_52%)]" />
          <p className="mt-3 font-black text-white">Inicia sesión para guardar tu puntuación y ver el ranking.</p>
          <Link
            to="/login"
            state={{ from: '/18-0' }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-[hsl(43_75%_58%)]"
          >
            <LogIn size={16} />
            Iniciar sesión
          </Link>
        </div>
      ) : isLoading ? (
        <p className="p-8 text-center text-sm font-black uppercase text-gray-400">Cargando clasificación...</p>
      ) : entries.length === 0 ? (
        <p className="p-8 text-center text-sm font-bold text-gray-400">Todavía no hay puntuaciones. La primera puede ser la tuya.</p>
      ) : (
        <div className="divide-y divide-white/10">
          {visibleEntries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <article
                key={entry.userId}
                className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 p-4 sm:px-6 ${isCurrentUser ? 'bg-[hsl(43_65%_52%_/_0.08)]' : ''}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-black ${positionStyles[entry.position] || 'border-white/10 bg-white/5 text-gray-300'}`}>
                  {entry.position === 1 ? <Crown size={17} /> : entry.position <= 3 ? <Medal size={17} /> : entry.position}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {entry.displayName}
                    {isCurrentUser && <span className="ml-2 text-[10px] uppercase text-[hsl(43_65%_52%)]">Tú</span>}
                  </p>
                  <p className="text-xs text-gray-500">{entry.bestRecord} · {entry.gamesPlayed} {entry.gamesPlayed === 1 ? 'partida' : 'partidas'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[hsl(43_65%_52%)]">{entry.bestScore}</p>
                  <p className="text-[10px] font-black uppercase text-gray-500">puntos</p>
                </div>
              </article>
            );
          })}

          {currentIsOutsideTop && (
            <>
              <div className="px-6 py-2 text-center text-xs font-black tracking-[0.3em] text-gray-600">•••</div>
              <article className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 bg-[hsl(43_65%_52%_/_0.08)] p-4 sm:px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-black text-gray-300">
                  {currentEntry.position}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{currentEntry.displayName}<span className="ml-2 text-[10px] uppercase text-[hsl(43_65%_52%)]">Tú</span></p>
                  <p className="text-xs text-gray-500">{currentEntry.bestRecord} · {currentEntry.gamesPlayed} {currentEntry.gamesPlayed === 1 ? 'partida' : 'partidas'}</p>
                </div>
                <p className="text-2xl font-black text-[hsl(43_65%_52%)]">{currentEntry.bestScore}</p>
              </article>
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default Ranking;
