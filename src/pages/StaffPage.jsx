import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import StaffCard from '@/components/StaffCard.jsx';
import { staff } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const StaffPage = () => {
  const [staffMembers, setStaffMembers] = useState(staff);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) return undefined;

    supabase
      .from('players')
      .select('id,name,position,seniority,instagram,poster_url,profile_text,active')
      .eq('team', 'staff')
      .then(({ data, error }) => {
        if (!mounted || error || !data) return;
        const remoteById = new Map(data.map((member) => [Number(member.id), member]));
        const baseIds = new Set(staff.map((member) => 900 + Number(member.id)));
        const mergedBase = staff.flatMap((member) => {
          const remote = remoteById.get(900 + Number(member.id));
          if (remote?.active === false) return [];
          if (!remote) return [member];
          return [{
            ...member,
            profileId: remote.id,
            name: remote.name || member.name,
            role: remote.position || member.role,
            antiguedad: remote.seniority || member.antiguedad,
            instagram: remote.instagram || member.instagram,
            poster: remote.poster_url || member.poster,
            profile_text: remote.profile_text || member.profile_text,
          }];
        });
        const extraMembers = data
          .filter((member) => member.active !== false && !baseIds.has(Number(member.id)))
          .map((member) => ({
            id: member.id,
            profileId: member.id,
            name: member.name,
            role: member.position || 'Staff',
            team: 'masculine',
            antiguedad: member.seniority,
            instagram: member.instagram,
            poster: member.poster_url,
            profile_text: member.profile_text,
          }));
        setStaffMembers([...mergedBase, ...extraMembers]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const masculineStaff = staffMembers.filter((member) => member.team === 'masculine' || member.team === 'both');
  const feminineStaff = staffMembers.filter((member) => member.team === 'feminine' || member.team === 'both');

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Staff Técnico - La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Conoce al equipo técnico de La Comunidad del Banquillo. Profesionales dedicados al desarrollo y éxito de nuestros jugadores."
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
            <h1 className="text-white mb-4">Staff técnico</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Nuestro equipo de profesionales dedicados al desarrollo y éxito de nuestros jugadores.
            </p>
          </motion.div>

          <div className="space-y-12">
            {masculineStaff.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-[hsl(43_65%_52%)] text-2xl font-bold mb-6">Equipo masculino</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
                  {masculineStaff.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    >
                      <StaffCard member={member} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-[hsl(43_65%_52%)] text-2xl font-bold mb-6">Equipo femenino</h2>
              {feminineStaff.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
                  {feminineStaff.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    >
                      <StaffCard member={member} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[hsl(43_65%_52%_/_0.35)] bg-[#1a1a1a]/70 p-6 text-center">
                  <p className="mx-auto text-sm font-medium text-gray-400">
                    Staff pendiente de asignar para el equipo femenino.
                  </p>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StaffPage;
