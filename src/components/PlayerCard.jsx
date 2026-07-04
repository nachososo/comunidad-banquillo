import React from 'react';
import { Link } from 'react-router-dom';

const PlayerCard = ({ player }) => {
  return (
    <Link
      to={`/jugador/${player.id}`}
      className="group block bg-[#1a1a1a] rounded-xl overflow-hidden border border-[hsl(43_65%_52%_/_0.2)] hover:border-[hsl(43_65%_52%)] transition-smooth hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.2)] hover:-translate-y-1"
    >
      <div className="aspect-[2/3] overflow-hidden bg-black">
        <img
          src={player.poster}
          alt={player.name}
          className="w-full h-full object-cover transition-smooth group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-bold text-lg group-hover:text-[hsl(43_65%_52%)] transition-smooth">
            {player.name}
          </h3>
          <span className="text-[hsl(43_65%_52%)] font-bold text-2xl">#{player.number}</span>
        </div>

        <div className="space-y-1">
          <p className="text-gray-400 text-sm">
            <span className="text-[hsl(43_65%_52%)] font-medium">Posición:</span> {player.position}
          </p>
          <p className="text-gray-400 text-sm">
            <span className="text-[hsl(43_65%_52%)] font-medium">Altura:</span> {player.height}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default PlayerCard;
