import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { matches } from '@/data/data.js';

const seasons = [
  {
    id: '2025-2026',
    label: 'Temporada 2025/2026',
  },
  {
    id: '2026-2027',
    label: 'Temporada 2026/2027',
  },
];

const CalendarioPage = () => {
  const getMatches = (team, season) => {
    return matches.filter((match) => match.team === team && match.season === season);
  };

  const renderSeasonCards = (team) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {seasons
        .filter((season) => team === 'masculine' || season.id !== '2025-2026')
        .map((season, seasonIndex) => {
          const seasonMatches = getMatches(team, season.id);
          const teamPath = team === 'masculine' ? 'masculino' : 'femenino';

          return (
            <motion.div
              key={`${team}-${season.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 + seasonIndex * 0.1 }}
            >
              <Link
                to={`/calendario/${teamPath}/${season.id}`}
                className="group block h-full rounded-2xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/90 p-6 transition-smooth hover:-translate-y-1 hover:border-[hsl(43_65%_52%)] hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.12)]"
              >
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-[hsl(43_65%_52%_/_0.1)] border border-[hsl(43_65%_52%_/_0.2)] p-3">
                    <CalendarDays className="text-[hsl(43_65%_52%)]" size={28} />
                  </div>
                  <ArrowRight
                    className="mt-2 text-[hsl(43_65%_52%)] transition-smooth group-hover:translate-x-1"
                    size={22}
                  />
                </div>

                <div>
                  <span className="text-[hsl(43_65%_52%)] text-sm font-bold uppercase tracking-wider">
                    {season.label}
                  </span>
                </div>

                <div className="mt-8 rounded-xl bg-black/40 border border-[hsl(43_65%_52%_/_0.15)] p-4">
                  <p className="text-sm font-semibold text-white">
                    {seasonMatches.length > 0
                      ? `${seasonMatches.length} partido${seasonMatches.length !== 1 ? 's' : ''} registrado${
                          seasonMatches.length !== 1 ? 's' : ''
                        }`
                      : 'Calendario pendiente'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Pincha para ver la temporada</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Calendario - La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Consulta el calendario de partidos de La Comunidad del Banquillo. Próximos encuentros y resultados de la temporada."
        />
      </Helmet>

      <Header />

      <main className="flex-1 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-white mb-4">Calendario de partidos</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Consulta los partidos y resultados por temporada de nuestros equipos masculino y femenino.
            </p>
          </motion.div>

          <div className="space-y-12">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-[hsl(43_65%_52%)] text-2xl font-bold mb-6">Equipo masculino</h2>
              {renderSeasonCards('masculine')}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-[hsl(43_65%_52%)] text-2xl font-bold mb-6">Equipo femenino</h2>
              {renderSeasonCards('feminine')}
            </motion.section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CalendarioPage;
