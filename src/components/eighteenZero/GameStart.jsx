import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy } from 'lucide-react';

const GameStart = ({ onStart }) => (
  <section className="relative overflow-hidden rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#111]/90 p-6 shadow-2xl sm:p-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)]" />
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative max-w-3xl"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-black/35 px-3 py-2 text-xs font-black uppercase text-[hsl(43_65%_52%)]">
        <Trophy size={16} />
        Nuevo juego CDB
      </div>
      <h1 className="text-6xl font-black text-white gold-text-glow sm:text-8xl">18-0</h1>
      <h2 className="mt-4 max-w-2xl text-2xl font-black text-[hsl(43_65%_52%)] sm:text-4xl">
        ¿Podrás ganar la liga con el quinteto perfecto del CDB?
      </h2>
      <p className="mt-5 text-base text-gray-300 sm:text-lg">
        Elige 5 jugadores y un entrenador, combina talento y química, y demuestra que tienes ADN Banquiller.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-6 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_75%_58%)]"
      >
        <Play size={18} />
        Empezar draft
      </button>
    </motion.div>
  </section>
);

export default GameStart;
