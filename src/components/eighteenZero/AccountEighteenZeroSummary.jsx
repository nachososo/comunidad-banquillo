import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCw, Sparkles, Trophy } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const AccountEighteenZeroSummary = ({ summary, loading, error }) => {
  const hasGames = summary?.totalGames > 0;

  return (
    <article className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Sparkles size={22} className="mb-3 text-[hsl(43_65%_52%)]" />
          <h2 className="text-xl font-black text-white">Mi 18-0</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Tu historial personal del draft: récords, puntuación y últimas partidas.
          </p>
        </div>
        <Link
          to="/18-0"
          className="rounded-lg bg-[hsl(43_65%_52%)] px-4 py-2 text-xs font-black uppercase text-black transition hover:bg-[hsl(43_75%_58%)]"
        >
          Jugar
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-black uppercase text-gray-500">
          Cargando 18-0...
        </p>
      ) : error ? (
        <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </p>
      ) : !hasGames ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/35 px-4 py-4">
          <p className="font-black text-white">Todavía no tienes partidas guardadas.</p>
          <p className="mt-1 text-sm text-gray-500">Cuando termines una partida con sesión iniciada, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/35 p-3">
              <p className="text-[10px] font-black uppercase text-gray-500">Partidas</p>
              <p className="mt-2 text-2xl font-black text-white">{summary.totalGames}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 p-3">
              <p className="text-[10px] font-black uppercase text-gray-500">Mejor</p>
              <p className="mt-2 text-2xl font-black text-[hsl(43_65%_52%)]">{summary.bestGame?.score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 p-3">
              <p className="text-[10px] font-black uppercase text-gray-500">Media</p>
              <p className="mt-2 text-2xl font-black text-white">{summary.averageScore}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 p-3">
              <p className="text-[10px] font-black uppercase text-gray-500">18-0</p>
              <p className="mt-2 text-2xl font-black text-white">{summary.perfectSeasons}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[hsl(43_65%_52%)]">
                <Trophy size={15} />
                Mejor récord
              </p>
              <p className="mt-2 text-2xl font-black text-white">{summary.bestGame?.record}</p>
              <p className="mt-1 truncate text-xs font-bold text-gray-500">
                {summary.bestGame?.lineup?.map((player) => player.name).join(' · ')}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400">
                <RotateCw size={15} />
                Rerolls usados
              </p>
              <p className="mt-2 text-2xl font-black text-white">{summary.rerollsUsed}</p>
              <p className="mt-1 text-xs font-bold text-gray-500">
                Jugador más elegido: {summary.favoritePlayer?.name || '—'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/25">
            {summary.latestGames.map((game) => (
              <div key={game.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{game.record}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{formatDate(game.createdAt)} · {game.lineup.map((player) => player.name).join(' · ')}</p>
                </div>
                <p className="text-xl font-black text-[hsl(43_65%_52%)]">{game.score}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default AccountEighteenZeroSummary;
