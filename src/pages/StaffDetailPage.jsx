import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, Instagram, Star, UserRoundCog } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { staff } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const formatSeniority = (seniority) => {
  if (!seniority) return 'Por definir';
  const value = String(seniority).trim();
  const numeric = value.match(/^(\d+)(?:\s*años?)?$/i);
  if (!numeric) return value;
  const years = Number(numeric[1]);
  return `${years} año${years === 1 ? '' : 's'}`;
};

const StaffDetailPage = () => {
  const { id } = useParams();
  const numericId = Number(id);
  const baseMember = staff.find((member) => Number(member.id) === numericId || 900 + Number(member.id) === numericId);
  const [remoteMember, setRemoteMember] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(isSupabaseConfigured);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured || !numericId) {
      setLoadingProfile(false);
      return undefined;
    }

    const remoteId = numericId < 900 && baseMember ? 900 + numericId : numericId;
    supabase
      .from('players')
      .select('id,name,team,position,seniority,instagram,poster_url,profile_text,active')
      .eq('id', remoteId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data?.active !== false) setRemoteMember(data);
        setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [baseMember, numericId]);

  const member = useMemo(() => {
    if (!baseMember && !remoteMember) return null;
    return {
      ...baseMember,
      id: remoteMember?.id || baseMember?.id,
      name: remoteMember?.name || baseMember?.name,
      role: remoteMember?.position || baseMember?.role || 'Staff',
      antiguedad: remoteMember?.seniority || baseMember?.antiguedad,
      instagram: remoteMember?.instagram || baseMember?.instagram,
      poster: remoteMember?.poster_url || baseMember?.poster,
      profile_text: remoteMember?.profile_text || baseMember?.profile_text,
    };
  }, [baseMember, remoteMember]);

  if (loadingProfile) {
    return <div className="min-h-screen bg-[#040404] text-white"><Header /><main className="grid min-h-[60vh] place-items-center text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando perfil...</main></div>;
  }

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col bg-[#040404]">
        <Header />
        <main className="grid flex-1 place-items-center px-4 text-center">
          <div><h1 className="text-white">Miembro del staff no encontrado</h1><Link to="/staff" className="mt-4 inline-block text-[hsl(43_65%_52%)]">Volver al staff</Link></div>
        </main>
        <Footer />
      </div>
    );
  }

  const profileParagraphs = member.profile_text
    ? member.profile_text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [`${member.name} forma parte del staff de La Comunidad del Banquillo como ${member.role.toLowerCase()}.`];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#040404]">
      <Helmet>
        <title>{`${member.name} - Staff de La Comunidad del Banquillo`}</title>
        <meta name="description" content={`Perfil de ${member.name}, ${member.role} de La Comunidad del Banquillo.`} />
      </Helmet>
      <div className="pointer-events-none absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[hsl(43_65%_52%)] opacity-[0.035] blur-[120px]" />
      <Header />

      <main className="relative z-10 flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/staff" className="group mb-10 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-gray-400 transition-smooth hover:text-[hsl(43_65%_52%)]">
            <span className="rounded-full bg-white/5 p-2 transition-smooth group-hover:bg-[hsl(43_65%_52%_/_0.1)]"><ArrowLeft size={18} /></span>
            Volver al staff
          </Link>

          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-5">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-[hsl(43_65%_52%_/_0.3)] bg-[#111] gold-glow-strong">
                {member.poster ? <img src={member.poster} alt={member.name} className="h-full w-full object-cover object-top" /> : <div className="grid h-full place-items-center"><UserRoundCog size={100} className="text-[hsl(43_65%_52%)]" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              </div>
            </motion.div>

            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[hsl(43_65%_52%)]">Staff técnico</p>
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">{member.name}</h1>
                {member.instagram && (
                  <a href={`https://www.instagram.com/${member.instagram}/`} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-300 transition hover:text-[hsl(43_65%_52%)]">
                    <span className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-white/5 p-2"><Instagram size={18} className="text-[hsl(43_65%_52%)]" /></span>
                    @{member.instagram}
                  </a>
                )}
              </div>

              <div className="my-10 grid gap-4 sm:grid-cols-2">
                <article className="glass-panel relative flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center">
                  <UserRoundCog size={82} className="absolute -right-3 -top-3 text-[hsl(43_65%_52%_/_0.07)]" />
                  <span className="text-sm font-medium uppercase tracking-wider text-gray-400">Puesto</span>
                  <p className="mt-2 text-2xl font-bold text-white">{member.role}</p>
                </article>
                <article className="glass-panel relative flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center">
                  <Award size={82} className="absolute -right-3 -top-3 text-[hsl(43_65%_52%_/_0.07)]" />
                  <span className="text-sm font-medium uppercase tracking-wider text-gray-400">Antigüedad</span>
                  <p className="mt-2 text-2xl font-bold text-white">{formatSeniority(member.antiguedad)}</p>
                </article>
              </div>

              <article className="gold-gradient relative overflow-hidden rounded-2xl border border-[hsl(43_65%_52%_/_0.15)] p-8">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[hsl(43_65%_52%)] opacity-20 blur-[80px]" />
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white"><Star size={20} className="text-[hsl(43_65%_52%)]" />Perfil de {member.name}</h2>
                <div className="space-y-4 leading-relaxed text-gray-300">
                  {profileParagraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
                </div>
              </article>
            </motion.section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffDetailPage;
