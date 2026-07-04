import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import MatchCard from '@/components/MatchCard.jsx';
import { allPlayers, matches } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const teamMap = {
  masculino: { id: 'masculine', label: 'Equipo masculino' },
  femenino: { id: 'feminine', label: 'Equipo femenino' },
};

const SeasonCalendarPage = () => {
  const { team, season } = useParams();
  const selectedTeam = teamMap[team];
  const seasonLabel = season?.replace('-', '/');
  const localSeasonMatches = selectedTeam && season
    ? matches.filter((match) => match.team === selectedTeam.id && match.season === season)
    : [];
  const [seasonMatches, setSeasonMatches] = useState(localSeasonMatches);
  const [statsByMatch, setStatsByMatch] = useState(new Map());
  const [calendarPlayers, setCalendarPlayers] = useState(allPlayers);

  useEffect(() => {
    let mounted = true;
    setSeasonMatches(localSeasonMatches);
    setStatsByMatch(new Map());
    if (!isSupabaseConfigured || !selectedTeam || !season) return undefined;

    const loadRemoteCalendar = async () => {
      const { data: remoteMatches, error: matchesError } = await supabase
        .from('matches')
        .select('id,team,season,phase,match_date,match_time,rival,venue,court,our_score,rival_score,status')
        .eq('team', selectedTeam.id)
        .eq('season', season)
        .order('match_date', { ascending: true });
      if (!mounted || matchesError || !remoteMatches?.length) return;

      const matchIds = remoteMatches.map((match) => match.id);
      const [{ data: remoteStats }, { data: remotePlayers }] = await Promise.all([
        supabase.from('player_stats').select('*').in('match_id', matchIds),
        supabase.from('players').select('id,name,number,team,position,height,seniority,instagram,poster_url,active').eq('active', true),
      ]);
      if (!mounted) return;

      setSeasonMatches(remoteMatches.map((match) => ({
        id: match.id,
        team: match.team,
        season: match.season,
        phase: match.phase || 'Fase 1',
        date: match.match_date,
        time: match.match_time ? String(match.match_time).slice(0, 5) : '00:00',
        rival: match.rival,
        location: match.venue || '',
        venue: match.court || match.venue || '',
        result: match.our_score !== null && match.rival_score !== null ? `${match.our_score}-${match.rival_score}` : null,
      })));
      const groupedStats = new Map();
      (remoteStats || []).forEach((stat) => groupedStats.set(stat.match_id, [...(groupedStats.get(stat.match_id) || []), stat]));
      setStatsByMatch(groupedStats);
      if (remotePlayers?.length) {
        setCalendarPlayers(remotePlayers.map((player) => ({
          id: player.id,
          name: player.name,
          number: player.number,
          team: player.team,
          position: player.position,
          height: player.height,
          antiguedad: player.seniority,
          instagram: player.instagram,
          poster: player.poster_url,
        })));
      }
    };

    loadRemoteCalendar();
    return () => { mounted = false; };
  }, [selectedTeam?.id, season]);

  if (!selectedTeam || !season) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-white mb-4">Calendario no encontrado</h1>
            <Link to="/calendario" className="text-[hsl(43_65%_52%)] hover:underline">
              Volver al calendario
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const groupedMatches = seasonMatches.reduce((groups, match) => {
    const phase = match.phase || 'Fase 1';
    const existingGroup = groups.find((group) => group.phase === phase);

    if (existingGroup) {
      existingGroup.matches.push(match);
      return groups;
    }

    return [...groups, { phase, matches: [match] }];
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>{`${selectedTeam.label} ${seasonLabel} - Calendario`}</title>
        <meta
          name="description"
          content={`Partidos del ${selectedTeam.label.toLowerCase()} en la temporada ${seasonLabel}.`}
        />
      </Helmet>

      <Header />

      <main className="flex-1 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link
              to="/calendario"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-[hsl(43_65%_52%)] transition-smooth mb-10 group"
            >
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-[hsl(43_65%_52%_/_0.1)] transition-smooth">
                <ArrowLeft size={18} />
              </div>
              <span className="font-medium tracking-wide text-sm uppercase">Volver al calendario</span>
            </Link>

            <div className="mb-12">
              <span className="text-[hsl(43_65%_52%)] text-sm font-bold uppercase tracking-wider">
                {selectedTeam.label}
              </span>
              <h1 className="mt-3 text-white">Temporada {seasonLabel}</h1>
              <p className="mt-4 text-gray-400 text-lg max-w-2xl">
                {seasonMatches.length > 0
                  ? 'Partidos y resultados registrados para esta temporada.'
                  : 'Calendario pendiente de completar para esta temporada.'}
              </p>
            </div>

            {seasonMatches.length > 0 ? (
              <div className="space-y-12">
                {groupedMatches.map((group, groupIndex) => (
                  <section key={group.phase}>
                    <div className="mb-6 flex items-center gap-4">
                      <h2 className="text-[hsl(43_65%_52%)] text-2xl font-black uppercase tracking-wide">
                        {group.phase}
                      </h2>
                      <div className="h-px flex-1 bg-[hsl(43_65%_52%_/_0.28)]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {group.matches.map((match, index) => (
                        <motion.div
                          key={match.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: (groupIndex + index) * 0.06 }}
                        >
                          <MatchCard match={match} stats={statsByMatch.get(match.id) || null} players={calendarPlayers} />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[hsl(43_65%_52%_/_0.35)] bg-[#111]/90 p-8 text-center">
                <p className="mx-auto text-gray-400">
                  Todavía no hay partidos asignados. Los añadiremos cuando esté cerrado el calendario.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SeasonCalendarPage;
