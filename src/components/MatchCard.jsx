import React from 'react';
import { BarChart3, Calendar, CalendarPlus, ChevronDown, Clock, MapPin } from 'lucide-react';
import { allPlayers, playerAdvancedStats, playerGameStats } from '@/data/data.js';
import { mergeStatRows } from '@/utils/statCalculations.js';

const MatchCard = ({ match, stats = null, players = allPlayers }) => {
  const TEAM_NAME = 'La Comunidad del Banquillo';
  const numericCellClass = 'px-3 py-3 text-right font-mono text-[12px] leading-none tabular-nums';
  const remoteStats = Array.isArray(stats) ? stats : null;
  const matchStats = mergeStatRows({
    gameStats: remoteStats
      ? remoteStats.map((stat) => ({ matchId: stat.match_id, playerId: stat.player_id, minutes: stat.minutes || '-', points: stat.points || 0 }))
      : playerGameStats.filter((stat) => stat.matchId === match.id),
    advancedStats: remoteStats
      ? remoteStats.map((stat) => ({
        matchId: stat.match_id,
        playerId: stat.player_id,
        points: stat.points || 0,
        fg: stat.field_goals,
        threePt: stat.three_pointers,
        ft: stat.free_throws,
        oreb: stat.offensive_rebounds || 0,
        dreb: stat.defensive_rebounds || 0,
        fouls: stat.fouls || 0,
        steals: stat.steals || 0,
        turnovers: stat.turnovers || 0,
        blocks: stat.blocks || 0,
        assists: stat.assists || 0,
      }))
      : playerAdvancedStats.filter((stat) => stat.matchId === match.id),
    players,
  });

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTeamLabel = (team) => {
    return team === 'masculine' ? 'Masculino' : 'Femenino';
  };

  const getCalendarFile = () => {
    const [year, month, day] = match.date.split('-').map(Number);
    const [hours, minutes] = match.time.split(':').map(Number);
    const startsAt = new Date(year, month - 1, day, hours, minutes);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const escapeIcsText = (text) =>
      String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

    const title = `${TEAM_NAME} vs ${match.rival}`;
    const details = match.result ? `Resultado: ${match.result}` : 'Partido pendiente';
    const contents = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//La Comunidad del Banquillo//Calendario//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${match.team}-${match.season}-${match.id}@comunidad-del-banquillo`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startsAt)}`,
      `DTEND:${formatIcsDate(endsAt)}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(details)}`,
      `LOCATION:${escapeIcsText(match.venue || '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return new Blob([contents], { type: 'text/calendar;charset=utf-8' });
  };

  const handleAddToCalendar = () => {
    const confirmed = window.confirm('¿Quieres añadir este partido a tu calendario?');

    if (!confirmed) return;

    const calendarUrl = URL.createObjectURL(getCalendarFile());
    window.location.href = calendarUrl;

    window.setTimeout(() => {
      URL.revokeObjectURL(calendarUrl);
    }, 30000);
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[hsl(43_65%_52%_/_0.2)] hover:border-[hsl(43_65%_52%)] transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-xl mb-1">vs {match.rival}</h3>
          <span className="text-[hsl(43_65%_52%)] text-sm font-medium">{getTeamLabel(match.team)}</span>
        </div>

        {match.result && (
          <div className="text-right">
            <span className="text-gray-400 text-xs block mb-1">Resultado</span>
            <span className="block text-[hsl(43_65%_52%)] font-bold text-2xl">{match.result}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 text-gray-300 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[hsl(43_65%_52%)]" />
            <span>{formatDate(match.date)}</span>
          </div>

          <div className="relative flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[hsl(43_65%_52%_/_0.45)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[hsl(43_65%_52%)] transition-smooth hover:bg-[hsl(43_65%_52%)] hover:text-black"
            >
              <CalendarPlus size={15} />
              Añadir
            </button>

            {matchStats.length > 0 && (
              <details className="group">
                <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 transition-smooth hover:border-[hsl(43_65%_52%_/_0.55)] hover:text-[hsl(43_65%_52%)]">
                  <BarChart3 size={15} />
                  Stats
                  <ChevronDown size={14} className="text-gray-500 transition-transform group-open:rotate-180" />
                </summary>

                <div className="absolute right-0 z-30 mt-2 w-[min(88vw,820px)] overflow-hidden rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[#0b0b0b] shadow-2xl shadow-black/70">
                  <div className="border-b border-[hsl(43_65%_52%_/_0.14)] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">
                      Estadísticas del partido
                    </p>
                  </div>

                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead className="sticky top-0 bg-[#141414] uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Jugador</th>
                          <th className="px-3 py-3 text-right font-semibold">Min.</th>
                          <th className="px-3 py-3 text-right font-semibold">PTS</th>
                          <th className="px-3 py-3 text-right font-semibold">REB</th>
                          <th className="px-3 py-3 text-right font-semibold">TC%</th>
                          <th className="px-3 py-3 text-right font-semibold">T3%</th>
                          <th className="px-3 py-3 text-right font-semibold">TL%</th>
                          <th className="px-3 py-3 text-right font-semibold">ROB</th>
                          <th className="px-3 py-3 text-right font-semibold">AST</th>
                          <th className="px-3 py-3 text-right font-semibold">FAL</th>
                          <th className="px-3 py-3 text-right font-semibold">PER</th>
                          <th className="px-3 py-3 text-right font-semibold">VAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchStats.map((stat) => (
                          <tr key={`${stat.matchId}-${stat.playerId}`} className="border-t border-white/5 text-gray-200">
                            <td className="px-4 py-3 font-medium">{stat.player.name}</td>
                            <td className={numericCellClass}>{stat.minutes}</td>
                            <td className={`${numericCellClass} font-bold text-white`}>{stat.points}</td>
                            <td className={numericCellClass}>{stat.rebounds ?? '-'}</td>
                            <td className={numericCellClass}>{stat.fgPct}</td>
                            <td className={numericCellClass}>{stat.threePtPct}</td>
                            <td className={numericCellClass}>{stat.ftPct}</td>
                            <td className={numericCellClass}>{stat.steals ?? '-'}</td>
                            <td className={numericCellClass}>{stat.assists ?? '-'}</td>
                            <td className={numericCellClass}>{stat.fouls ?? '-'}</td>
                            <td className={numericCellClass}>{stat.turnovers ?? '-'}</td>
                            <td className={`${numericCellClass} font-bold text-[hsl(43_65%_52%)]`}>
                              {stat.valuation ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Clock size={16} className="text-[hsl(43_65%_52%)]" />
          <span>{match.time}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <MapPin size={16} className="text-[hsl(43_65%_52%)]" />
          <span>{match.venue || match.location}</span>
        </div>

      </div>
    </div>
  );
};

export default MatchCard;
