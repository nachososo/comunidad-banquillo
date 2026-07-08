import React from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import PlayerCard from './PlayerCard.jsx';
import TeamSummary from './TeamSummary.jsx';

const SelectedTeamInsights = ({ selectedPlayers }) => {
  return (
    <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/80 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Quinteto elegido</p>
          <h2 className="mt-1 text-2xl font-black text-white">Lo que ya tienes</h2>
        </div>
        <p className="text-sm font-bold text-gray-400">
          {selectedPlayers.length ? `${selectedPlayers.length} de 5 puestos cubiertos` : 'Todavía no has elegido jugadores'}
        </p>
      </div>

      {selectedPlayers.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {selectedPlayers.map((player) => (
            <article
              key={`${player.draftPosition}-${player.id}`}
              className="min-h-[148px] rounded-lg border border-white/10 bg-black/40 p-3"
            >
              <p className="text-[11px] font-black uppercase text-[hsl(43_65%_52%)]">
                {player.draftPosition}
              </p>
              <h3 className="mt-1 text-base font-black leading-tight text-white">{player.name}</h3>
              <p className="mt-1 text-xs font-bold uppercase text-gray-500">
                {player.season}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(player.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[9px] font-black uppercase text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-black/35 p-5 text-sm font-bold text-gray-400">
          Elige primero una posición arriba. Después aquí verás tus jugadores y las habilidades que vas juntando.
        </div>
      )}
    </div>
  );
};

const DraftRound = ({
  availablePositions,
  error,
  hasUsedDraftRefresh,
  options,
  position,
  roundIndex,
  selectedPlayers,
  totalRounds,
  onChoosePosition,
  onRefreshOptions,
  onSelect,
}) => {
  const isChoosingPosition = !position;

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_450px]">
      <div className="space-y-5">
        <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.24)] bg-[#111]/90 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[hsl(43_65%_52%)]">
                <Shuffle size={15} />
                Ronda {roundIndex + 1} de {totalRounds}
              </p>
              <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">
                {isChoosingPosition ? 'Elige posición' : position}
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                {isChoosingPosition
                  ? 'Decide qué hueco del quinteto quieres cubrir ahora.'
                  : `Solo aparecen jugadores cuyo puesto principal es ${position}.`}
              </p>
            </div>
            {!isChoosingPosition && (
              <button
                type="button"
                onClick={onRefreshOptions}
                disabled={hasUsedDraftRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-xs font-black uppercase text-[hsl(43_65%_62%)] transition hover:border-[hsl(43_65%_52%)] hover:bg-[hsl(43_65%_52%_/_0.15)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-500"
                title={hasUsedDraftRefresh ? 'Ya has usado el reroll de esta partida' : 'Cambiar las opciones una vez por partida'}
              >
                <Shuffle size={15} />
                {hasUsedDraftRefresh ? '0x reroll' : '1x reroll'}
              </button>
            )}
          </div>

          {isChoosingPosition && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {availablePositions.map((draftPosition) => (
                <button
                  key={draftPosition}
                  type="button"
                  onClick={() => onChoosePosition(draftPosition)}
                  className="rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-black/35 p-4 text-left transition hover:border-[hsl(43_65%_52%)] hover:bg-[hsl(43_65%_52%_/_0.10)]"
                >
                  <span className="block text-lg font-black text-white">{draftPosition}</span>
                  <span className="mt-1 block text-xs font-black uppercase text-[hsl(43_65%_52%)]">
                    Elegir ahora
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {error}
            </div>
          )}
        </div>

        {isChoosingPosition ? (
          <SelectedTeamInsights selectedPlayers={selectedPlayers} />
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-[#111]/75 px-4 py-3 text-sm font-bold text-gray-300">
              Tienes un único reroll por partida. Puedes usarlo ahora o guardarlo para otra posición.
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {options.map((player) => (
                <motion.div
                  key={`${position}-${player.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <PlayerCard player={player} onSelect={onSelect} />
                </motion.div>
              ))}
              {options.length === 0 && (
                <div className="rounded-lg border border-white/10 bg-[#111]/90 p-5 text-sm font-bold text-gray-300 md:col-span-3">
                  No quedan jugadores disponibles para esta posición.
                </div>
              )}
            </div>
            <div className="text-xs font-bold uppercase text-gray-500">
              {hasUsedDraftRefresh ? '0x reroll disponible.' : '1x reroll disponible.'}
            </div>
          </div>
        )}
      </div>

      <TeamSummary selectedPlayers={selectedPlayers} />
    </section>
  );
};

export default DraftRound;
