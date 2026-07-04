import React from 'react';
import { ClipboardList } from 'lucide-react';

const CoachSelection = ({ coaches, onSelect }) => (
  <section className="rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#111]/90 p-6 sm:p-8">
    <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]"><ClipboardList size={18} /> Última elección</p>
    <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Elige entrenador</h1>
    <p className="mt-3 max-w-2xl text-gray-400">Su evento aparecerá siempre. Después se sortearán otros tres eventos compatibles con tu quinteto.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {coaches.map((coach) => (
        <button key={coach.id} type="button" onClick={() => onSelect(coach)} className="group rounded-xl border border-white/10 bg-black/35 p-5 text-left transition hover:-translate-y-1 hover:border-[hsl(43_65%_52%_/_0.65)]">
          <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">{coach.role}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{coach.name}</h2>
          <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-bold uppercase text-gray-500">Evento garantizado</p><p className="mt-1 text-sm font-bold text-gray-300">{coach.event.name}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{coach.event.description}</p></div>
        </button>
      ))}
    </div>
  </section>
);

export default CoachSelection;
