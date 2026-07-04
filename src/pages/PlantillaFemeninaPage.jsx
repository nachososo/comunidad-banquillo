import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PlayerCard from '@/components/PlayerCard.jsx';
import { femalePlayers } from '@/data/data.js';

const PlantillaFemeninaPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Plantilla Femenina - La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Conoce a las jugadoras del equipo femenino de La Comunidad del Banquillo. Talento, dedicación y pasión por el baloncesto."
        />
      </Helmet>

      <Header />

      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-white mb-6">Plantilla Femenina</h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Conoce a las jugadoras que defienden nuestros colores esta temporada. Talento, dedicación y pasión por el
              baloncesto en cada partido.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {femalePlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <PlayerCard player={player} />
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlantillaFemeninaPage;
