import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Trophy, Star, Calendar, Award, Instagram, BarChart3 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { allPlayers, matches, playerAdvancedStats, playerGameStats } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { buildAdvancedTotals, formatPercentage, mergeStatRows } from '@/utils/statCalculations.js';
import { getPlayerIdFromSlug, getPlayerSlug, slugifyPlayerName } from '@/utils/playerSlug.js';

const formatSeniority = (seniority) => {
  if (!seniority) return 'Reciente';

  const normalizedSeniority = String(seniority).trim();
  const numericSeniority = normalizedSeniority.match(/^(\d+)(?:\s*años?)?$/i);

  if (numericSeniority) {
    const years = Number(numericSeniority[1]);
    return `${years} año${years !== 1 ? 's' : ''}`;
  }

  return normalizedSeniority;
};

const PlayerDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const numericId = getPlayerIdFromSlug(id);
  const basePlayer = allPlayers.find((p) => p.id === numericId)
    || allPlayers.find((p) => slugifyPlayerName(p.name) === slugifyPlayerName(id));
  const [remotePlayer, setRemotePlayer] = useState(null);
  const [remoteStatRows, setRemoteStatRows] = useState(null);
  const [activeSection, setActiveSection] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.includes('estadisticas') ? 'stats' : 'profile',
  );
  const [selectedSeason, setSelectedSeason] = useState('2025-2026');

  useEffect(() => {
    let isMounted = true;

    const loadPlayerOverride = async () => {
      if (!isSupabaseConfigured || !numericId) return;

      const { data, error } = await supabase
        .from('players')
        .select('id,name,number,team,position,height,seniority,instagram,poster_url,active,profile_text')
        .eq('id', numericId)
        .maybeSingle();

      if (!isMounted || error || !data) return;

      setRemotePlayer(data);
    };

    loadPlayerOverride();

    return () => {
      isMounted = false;
    };
  }, [numericId]);

  useEffect(() => {
    let isMounted = true;
    if (!isSupabaseConfigured || !numericId) return undefined;

    supabase
      .from('player_stats')
      .select('match_id,player_id,minutes,points,field_goals,three_pointers,free_throws,offensive_rebounds,defensive_rebounds,fouls,steals,turnovers,blocks,assists,valuation,match:matches(id,team,season,phase,match_date,match_time,rival,venue,court,our_score,rival_score,status)')
      .eq('player_id', numericId)
      .then(({ data, error }) => {
        if (isMounted && !error) setRemoteStatRows(data || []);
      });

    return () => {
      isMounted = false;
    };
  }, [numericId]);

  const player = useMemo(() => {
    if (!basePlayer) return null;
    if (!remotePlayer) return basePlayer;

    return {
      ...basePlayer,
      name: remotePlayer.name || basePlayer.name,
      number: remotePlayer.number || basePlayer.number,
      team: remotePlayer.team || basePlayer.team,
      position: remotePlayer.position || basePlayer.position,
      height: remotePlayer.height || basePlayer.height,
      antiguedad: remotePlayer.seniority
        ? String(remotePlayer.seniority).replace(/\s*años?$/i, '')
        : basePlayer.antiguedad,
      instagram: remotePlayer.instagram || basePlayer.instagram,
      poster: remotePlayer.poster_url || basePlayer.poster,
      profile_text: remotePlayer.profile_text || basePlayer.profile_text,
    };
  }, [basePlayer, remotePlayer]);

  useEffect(() => {
    if (!player) return;
    const canonicalSlug = getPlayerSlug(player);
    if (id !== canonicalSlug) {
      navigate(`/jugador/${canonicalSlug}${location.hash || ''}`, { replace: true });
    }
  }, [id, location.hash, navigate, player]);

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col bg-[#040404]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-white mb-4">Jugador no encontrado</h1>
            <Link to="/" className="text-[hsl(43_65%_52%)] hover:underline">
              Volver al inicio
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const backLink = player.team === 'masculine' ? '/plantilla-masculina' : '/plantilla-femenina';
  const teamLabel = player.team === 'masculine' ? 'Equipo Masculino' : 'Equipo Femenino';
  const canonicalPath = `/jugador/${getPlayerSlug(player)}`;
  const canonicalUrl = `https://comunidaddelbanquillo.es${canonicalPath}`;
  const pageTitle = `${player.name} | ${teamLabel} | La Comunidad del Banquillo`;
  const pageDescription = `Perfil de ${player.name}, ${player.position} del ${teamLabel} de La Comunidad del Banquillo. Dorsal ${player.number}, altura ${player.height}.`;
  const profileParagraphs = player.profile_text
    ? player.profile_text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [
        `${player.name} se ha consolidado como una pieza fundamental en el esquema del ${teamLabel}. Jugando en la posición de ${player.position.toLowerCase()}, destaca por su visión de juego, intensidad defensiva y capacidad para tomar decisiones en momentos clave del partido.`,
        `Con ${player.height} de estatura, aporta versatilidad y energía a la plantilla, representando a la perfección los valores y el ADN competitivo de La Comunidad del Banquillo.`,
      ];
  const bgImage =
    'https://images.unsplash.com/photo-1587296104393-8db6cda4418d?q=80&w=2070&auto=format&fit=crop';
  const remoteGameStats = remoteStatRows?.map((stat) => ({
    matchId: stat.match_id,
    playerId: stat.player_id,
    minutes: stat.minutes || '-',
    points: stat.points || 0,
  }));
  const remoteAdvancedStats = remoteStatRows?.map((stat) => ({
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
  }));
  const hasRemoteStats = Array.isArray(remoteStatRows) && remoteStatRows.length > 0;
  const activeGameStats = hasRemoteStats ? remoteGameStats : playerGameStats.filter((stat) => stat.playerId === player.id);
  const activeAdvancedStats = hasRemoteStats ? remoteAdvancedStats : playerAdvancedStats.filter((stat) => stat.playerId === player.id);
  const playerMatchIds = [
    ...new Set([
      ...activeGameStats.map((stat) => stat.matchId),
      ...activeAdvancedStats.map((stat) => stat.matchId),
    ]),
  ];
  const seasonStats = playerMatchIds
    .map((matchId) => {
      const [mergedStat] = mergeStatRows({
        gameStats: activeGameStats.filter((stat) => stat.matchId === matchId),
        advancedStats: activeAdvancedStats.filter((stat) => stat.matchId === matchId),
        players: [player],
      });

      const remoteMatch = hasRemoteStats ? remoteStatRows.find((stat) => stat.match_id === matchId)?.match : null;

      return {
        ...mergedStat,
        match: remoteMatch ? {
          id: remoteMatch.id,
          team: remoteMatch.team,
          season: remoteMatch.season,
          phase: remoteMatch.phase,
          date: remoteMatch.match_date,
          time: remoteMatch.match_time ? String(remoteMatch.match_time).slice(0, 5) : '',
          rival: remoteMatch.rival,
          venue: remoteMatch.court || remoteMatch.venue,
          result: remoteMatch.our_score !== null && remoteMatch.rival_score !== null ? `${remoteMatch.our_score}-${remoteMatch.rival_score}` : null,
        } : matches.find((match) => match.id === matchId),
      };
    })
    .filter((stat) => stat.match?.season === selectedSeason)
    .sort((a, b) => new Date(a.match.date) - new Date(b.match.date));
  const minutesToSeconds = (minutes) => {
    const [minutePart, secondPart] = minutes.split(':').map(Number);
    return minutePart * 60 + secondPart;
  };
  const secondsToMinutes = (seconds) => {
    const safeSeconds = Math.round(seconds);
    const minutePart = Math.floor(safeSeconds / 60);
    const secondPart = String(safeSeconds % 60).padStart(2, '0');

    return `${minutePart}:${secondPart}`;
  };
  const playedGames = seasonStats.filter((stat) => minutesToSeconds(stat.minutes) > 0);
  const totalSeconds = playedGames.reduce((total, stat) => total + minutesToSeconds(stat.minutes), 0);
  const totalPoints = playedGames.reduce((total, stat) => total + stat.points, 0);
  const averageMinutes = playedGames.length > 0 ? secondsToMinutes(totalSeconds / playedGames.length) : '0:00';
  const averagePoints = playedGames.length > 0 ? (totalPoints / playedGames.length).toFixed(1) : '0.0';
  const advancedTrackedGames = playedGames.filter((stat) => stat.advanced);
  const advancedTotals = buildAdvancedTotals(advancedTrackedGames);
  const formatAverage = (value, games = advancedTrackedGames.length) => {
    if (!games) return '-';

    return (value / games).toFixed(1);
  };
  const advancedSummary = [
    { label: 'REB media', value: formatAverage(advancedTotals.rebounds) },
    { label: 'TC%', value: formatPercentage(advancedTotals.fgMade, advancedTotals.fgAttempted) },
    { label: 'T3%', value: formatPercentage(advancedTotals.threePtMade, advancedTotals.threePtAttempted) },
    { label: 'TL%', value: formatPercentage(advancedTotals.ftMade, advancedTotals.ftAttempted) },
    { label: 'ROB media', value: formatAverage(advancedTotals.steals) },
    { label: 'AST media', value: formatAverage(advancedTotals.assists) },
    { label: 'FAL media', value: formatAverage(advancedTotals.fouls) },
    { label: 'PER media', value: formatAverage(advancedTotals.turnovers) },
    { label: 'VAL media', value: formatAverage(advancedTotals.valuation) },
  ];

  const formatShortDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#040404] relative overflow-hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={canonicalUrl} />
        <meta name="description" content={pageDescription} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={player.poster} />
        <meta property="og:site_name" content="La Comunidad del Banquillo" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={player.poster} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: player.name,
            url: canonicalUrl,
            image: player.poster,
            memberOf: {
              '@type': 'SportsTeam',
              name: `La Comunidad del Banquillo - ${teamLabel}`,
            },
            athlete: true,
            sport: 'Basketball',
          })}
        </script>
      </Helmet>

      <div
        className="absolute inset-0 opacity-10 pointer-events-none bg-cover bg-center bg-no-repeat mix-blend-luminosity"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[hsl(43_65%_52%)] rounded-full blur-[120px] opacity-[0.03] pointer-events-none" />

      <Header />

      <main className="flex-1 relative z-10 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link
              to={backLink}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-[hsl(43_65%_52%)] transition-smooth mb-10 group"
            >
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-[hsl(43_65%_52%_/_0.1)] transition-smooth">
                <ArrowLeft size={18} />
              </div>
              <span className="font-medium tracking-wide text-sm uppercase">Volver a la plantilla</span>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 relative"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[hsl(43_65%_52%_/_0.3)] gold-glow-strong group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <img
                    src={player.poster}
                    alt={`Fotografía de ${player.name}`}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                    <div className="text-[12rem] leading-none font-black text-stroke-gold opacity-30 absolute -bottom-12 -right-4 pointer-events-none select-none">
                      {player.number}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 flex flex-col"
              >
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveSection('profile')}
                      className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-smooth ${
                        activeSection === 'profile'
                          ? 'bg-[hsl(43_65%_52%_/_0.16)] border-[hsl(43_65%_52%_/_0.55)] text-[hsl(43_65%_52%)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-[hsl(43_65%_52%)] hover:border-[hsl(43_65%_52%_/_0.35)]'
                      }`}
                    >
                      Perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('stats')}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-smooth ${
                        activeSection === 'stats'
                          ? 'bg-[hsl(43_65%_52%_/_0.16)] border-[hsl(43_65%_52%_/_0.55)] text-[hsl(43_65%_52%)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-[hsl(43_65%_52%)] hover:border-[hsl(43_65%_52%_/_0.35)]'
                      }`}
                    >
                      <BarChart3 size={14} /> Estadísticas
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                    <h1 className="text-white text-5xl md:text-7xl font-black tracking-tight">
                      {player.name.split(' ')[0]} <br />
                      <span className="text-[hsl(43_65%_52%)] gold-text-glow">
                        {player.name.split(' ').slice(1).join(' ')}
                      </span>
                    </h1>

                    {player.instagram && (
                      <a
                        href={`https://www.instagram.com/${player.instagram}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-2 inline-flex w-fit items-center gap-2 text-gray-300 hover:text-[hsl(43_65%_52%)] transition-smooth group"
                        aria-label={`Instagram de ${player.name}`}
                      >
                        <span className="p-2 rounded-lg bg-white/5 border border-[hsl(43_65%_52%_/_0.2)] group-hover:border-[hsl(43_65%_52%)] group-hover:bg-[hsl(43_65%_52%_/_0.1)] transition-smooth">
                          <Instagram size={18} className="text-[hsl(43_65%_52%)]" />
                        </span>
                        <span className="text-sm font-semibold">@{player.instagram}</span>
                      </a>
                    )}
                  </div>
                </div>

                {activeSection === 'profile' ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                      <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 text-[hsl(43_65%_52%_/_0.05)] group-hover:text-[hsl(43_65%_52%_/_0.1)] transition-colors duration-500">
                          <Activity size={80} />
                        </div>
                        <span className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Posición</span>
                        <p className="text-white text-xl md:text-2xl font-bold">{player.position}</p>
                      </div>

                      <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 text-[hsl(43_65%_52%_/_0.05)] group-hover:text-[hsl(43_65%_52%_/_0.1)] transition-colors duration-500">
                          <Trophy size={80} />
                        </div>
                        <span className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Altura</span>
                        <p className="text-white text-xl md:text-2xl font-bold">{player.height}</p>
                      </div>

                      <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group col-span-2 md:col-span-1">
                        <div className="absolute -right-4 -top-4 text-[hsl(43_65%_52%_/_0.05)] group-hover:text-[hsl(43_65%_52%_/_0.1)] transition-colors duration-500">
                          <Award size={80} />
                        </div>
                        <span className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Antigüedad</span>
                        <p className="text-white text-xl md:text-2xl font-bold">
                          {formatSeniority(player.antiguedad)}
                        </p>
                      </div>
                    </div>

                    <div className="gold-gradient rounded-2xl p-8 border border-[hsl(43_65%_52%_/_0.15)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(43_65%_52%)] rounded-full blur-[80px] opacity-20" />

                      <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                        <Star className="text-[hsl(43_65%_52%)]" size={20} />
                        Perfil de {player.name}
                      </h3>

                      <div className="space-y-4 text-gray-300 leading-relaxed">
                        {profileParagraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <section id="estadisticas-25-26" className="scroll-mt-28">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2">
                          <BarChart3 size={22} className="text-[hsl(43_65%_52%)]" />
                        </div>
                        <div>
                          <span className="text-[hsl(43_65%_52%)] text-xs font-bold uppercase tracking-wider">
                            Estadísticas
                          </span>
                          <h2 className="text-white text-3xl font-black">Temporada</h2>
                        </div>
                      </div>

                      <label className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200">
                        <Calendar size={15} className="text-[hsl(43_65%_52%)]" />
                        <select
                          value={selectedSeason}
                          onChange={(event) => setSelectedSeason(event.target.value)}
                          className="bg-transparent text-sm font-semibold text-gray-200 outline-none"
                        >
                          <option className="bg-[#111]" value="2025-2026">
                            Temporada 25/26
                          </option>
                        </select>
                      </label>
                    </div>

                    {seasonStats.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div className="glass-panel flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl p-5 text-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">PJ</span>
                            <p className="mt-2 text-white text-3xl font-black">{playedGames.length}</p>
                          </div>
                          <div className="glass-panel flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl p-5 text-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Min. media</span>
                            <p className="mt-2 text-white text-3xl font-black">{averageMinutes}</p>
                          </div>
                          <div className="glass-panel flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl p-5 text-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">PTS media</span>
                            <p className="mt-2 text-white text-3xl font-black">{averagePoints}</p>
                          </div>
                          <div className="glass-panel flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl p-5 text-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">PTS totales</span>
                            <p className="mt-2 text-white text-3xl font-black">{totalPoints}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))] gap-4">
                          {advancedSummary.map((item) => (
                            <div
                              key={item.label}
                              className="flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl border border-[hsl(43_65%_52%_/_0.16)] bg-white/[0.03] p-4 text-center"
                            >
                              <span className="block text-gray-400 text-[0.68rem] font-bold uppercase tracking-wider leading-relaxed">
                                {item.label}
                              </span>
                              <p className="mt-2 text-white text-2xl font-black">{item.value}</p>
                            </div>
                          ))}
                        </div>

                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[hsl(43_65%_52%_/_0.35)] bg-[#111]/90 p-8 text-center">
                        <p className="text-gray-400">Todavía no hay estadísticas registradas para esta temporada.</p>
                      </div>
                    )}
                  </section>
                )}
	              </motion.div>
	            </div>

              {activeSection === 'stats' && seasonStats.length > 0 && (
                <section className="mt-12 rounded-2xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#0b0b0b]/95 p-4 shadow-2xl shadow-black/30 md:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2">
                      <BarChart3 size={20} className="text-[hsl(43_65%_52%)]" />
                    </div>
                    <div>
                      <span className="text-[hsl(43_65%_52%)] text-xs font-bold uppercase tracking-wider">
                        Estadísticas
                      </span>
                      <h2 className="text-white text-2xl font-black">Desglose por partido</h2>
                    </div>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {seasonStats.map((stat) => (
                      <div
                        key={`${stat.matchId}-${stat.playerId}-mobile`}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"
                      >
                        <div className="mb-3 grid grid-cols-[4.8rem_1fr] gap-3">
                          <span className="font-mono text-[10px] font-semibold leading-tight text-[hsl(43_65%_52%)]">
                            {formatShortDate(stat.match.date)}
                          </span>
                          <span className="text-xs font-bold leading-tight text-white">vs {stat.match.rival}</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Min.', value: stat.minutes },
                            { label: 'PTS', value: stat.points },
                            { label: 'REB', value: stat.rebounds ?? '-' },
                            { label: 'VAL', value: stat.valuation ?? '-' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg bg-black/25 px-2 py-2 text-center">
                              <span className="block text-[0.58rem] font-bold uppercase tracking-wider text-gray-500">
                                {item.label}
                              </span>
                              <span className="mt-1 block font-mono text-xs font-black leading-none text-white">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 grid grid-cols-6 gap-1.5">
                          {[
                            { label: 'TC', value: stat.fgPct },
                            { label: 'T3', value: stat.threePtPct },
                            { label: 'TL', value: stat.ftPct },
                            { label: 'ROB', value: stat.steals ?? '-' },
                            { label: 'AST', value: stat.assists ?? '-' },
                            { label: 'FAL', value: stat.fouls ?? '-' },
                            { label: 'PER', value: stat.turnovers ?? '-' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-md border border-white/5 bg-black/15 px-1 py-1.5 text-center">
                              <span className="block text-[0.52rem] font-bold uppercase tracking-wider text-gray-500">
                                {item.label}
                              </span>
                              <span className="mt-1 block font-mono text-[10px] font-bold leading-none text-gray-200">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <table className="hidden w-full table-fixed border-collapse text-left text-sm text-gray-200 md:table">
                    <colgroup>
                      <col className="w-[8%]" />
                      <col className="w-[20%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.04] text-[0.65rem] uppercase tracking-wider text-gray-400">
                        <th className="px-2 py-3 font-bold md:px-3">Fecha</th>
                        <th className="px-2 py-3 font-bold md:px-3">Partido</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">Min.</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">PTS</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">REB</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">TC%</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">T3%</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">TL%</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">ROB</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">AST</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">FAL</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">PER</th>
                        <th className="px-2 py-3 text-center font-bold md:px-3">VAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonStats.map((stat) => (
                        <tr
                          key={`${stat.matchId}-${stat.playerId}`}
                          className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-2 py-3 font-mono text-[10px] font-semibold leading-none text-[hsl(43_65%_52%)] md:px-3 md:text-xs">
                            {formatShortDate(stat.match.date)}
                          </td>
                          <td className="break-words px-2 py-3 text-xs font-semibold leading-tight text-white md:px-3 md:text-sm">
                            vs {stat.match.rival}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.minutes}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.points}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.rebounds ?? '-'}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.fgPct}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.threePtPct}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.ftPct}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.steals ?? '-'}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.assists ?? '-'}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.fouls ?? '-'}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-bold leading-none md:px-3 md:text-xs">
                            {stat.turnovers ?? '-'}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-[11px] font-black leading-none text-[hsl(43_65%_52%)] md:px-3 md:text-xs">
                            {stat.valuation ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
	          </motion.div>
	        </div>
	      </main>

      <Footer />
    </div>
  );
};

export default PlayerDetailPage;
