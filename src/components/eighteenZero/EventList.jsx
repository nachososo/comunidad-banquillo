import React from 'react';
import { Zap } from 'lucide-react';

const EventList = ({ events }) => (
  <section className="rounded-lg border border-[hsl(43_65%_52%_/_0.22)] bg-[#111]/85 p-5">
    <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-black text-white">
      <Zap className="text-[hsl(43_65%_52%)]" size={20} />
      Eventos de la temporada
    </h2>
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{event.name}</h3>{event.guaranteedByCoach && <span className="rounded-full bg-[hsl(43_65%_52%_/_0.14)] px-2 py-1 text-[9px] font-black uppercase text-[hsl(43_65%_62%)]">Entrenador</span>}</div>
              {event.description && <p className="mt-2 text-sm leading-relaxed text-gray-400">{event.description}</p>}
              {event.affectedSectionLabels?.length > 0 && <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-[hsl(43_65%_62%)]">Afecta a: {event.affectedSectionLabels.join(' · ')}</p>}
              <p className="mt-2 text-sm font-semibold text-gray-200">{event.result}</p>
            </div>
            <span
              className={`rounded-lg px-3 py-1 text-sm font-black ${
                event.modifier >= 0 ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'
              }`}
            >
              {event.modifier >= 0 ? '+' : ''}
              {event.modifier}
            </span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default EventList;
