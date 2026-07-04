import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, User } from 'lucide-react';

const StaffCard = ({ member }) => {
  const profileId = member.profileId || 900 + Number(member.id);

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl border border-[hsl(43_65%_52%_/_0.2)] bg-[#1a1a1a] transition-smooth hover:-translate-y-1 hover:border-[hsl(43_65%_52%)] hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.2)]">
      <Link to={`/staff/${profileId}`} className="absolute inset-0 z-[1]" aria-label={`Ver perfil de ${member.name}`} />
      {member.poster ? (
        <div className="aspect-[2/3] bg-black">
          <img src={member.poster} alt={`${member.name} - ${member.role}`} className="h-full w-full object-cover transition-smooth group-hover:scale-105" />
        </div>
      ) : (
        <div className="aspect-[2/3] flex items-center justify-center bg-black">
          <div className="p-4 rounded-full bg-[hsl(43_65%_52%_/_0.1)] border border-[hsl(43_65%_52%_/_0.2)]">
            <User className="text-[hsl(43_65%_52%)]" size={36} />
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-bold leading-tight text-white transition-smooth group-hover:text-[hsl(43_65%_52%)]">{member.name}</h3>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-[hsl(43_65%_52%)]">
          {member.role}
        </p>
        {member.instagram && (
          <a
            href={`https://www.instagram.com/${member.instagram}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-3 inline-flex items-center gap-1.5 text-gray-300 hover:text-[hsl(43_65%_52%)] transition-smooth group"
            aria-label={`Instagram de ${member.name}`}
          >
            <Instagram size={14} className="text-[hsl(43_65%_52%)]" />
            <span className="break-all text-sm font-semibold">@{member.instagram}</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default StaffCard;
