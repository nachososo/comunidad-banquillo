import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserRound, Calendar } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { LOGO_SRC, goldDropShadow } from '@/constants/brand.js';
import { defaultSiteContent, getSiteContentItem, mergeSiteContent } from '@/data/siteContent.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const HomePage = () => {
  const [contentItems, setContentItems] = useState(defaultSiteContent);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let isMounted = true;

    const loadContent = async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key,section,label,href,type,visible,sort_order')
        .in('section', ['home_highlights', 'home_intro', 'home_cards'])
        .order('sort_order', { ascending: true });

      if (!isMounted) return;
      if (!error && data) setContentItems(mergeSiteContent(data));
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const homeText = useMemo(() => ({
    notice: getSiteContentItem(contentItems, 'home_notice', ''),
    communityTitle: getSiteContentItem(contentItems, 'home_community_title', 'Nuestra comunidad'),
    communityDescription: getSiteContentItem(
      contentItems,
      'home_community_description',
      'Descubre todo lo que La Comunidad del Banquillo tiene para ofrecer',
    ),
    masculinaTitle: getSiteContentItem(contentItems, 'home_card_masculina_title', 'Plantilla Masculina'),
    masculinaDescription: getSiteContentItem(
      contentItems,
      'home_card_masculina_description',
      'Conoce a los jugadores que defienden nuestros colores en el equipo masculino.',
    ),
    femeninaTitle: getSiteContentItem(contentItems, 'home_card_femenina_title', 'Plantilla Femenina'),
    femeninaDescription: getSiteContentItem(
      contentItems,
      'home_card_femenina_description',
      'Conoce a las jugadoras que defienden nuestros colores en el equipo femenino.',
    ),
    calendarioTitle: getSiteContentItem(contentItems, 'home_card_calendario_title', 'Calendario'),
    calendarioDescription: getSiteContentItem(
      contentItems,
      'home_card_calendario_description',
      'Consulta todos nuestros próximos partidos y resultados de la temporada actual.',
    ),
  }), [contentItems]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>La Comunidad del Banquillo - ADNBanquiller</title>
        <meta
          name="description"
          content="La Comunidad del Banquillo - Pasión por el baloncesto. Equipos masculino y femenino comprometidos con la excelencia deportiva."
        />
      </Helmet>

      <Header />

      <main className="flex-1">
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gold-gradient">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-soft-light"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1
                className="college-title mx-auto mb-10 max-w-5xl uppercase leading-[0.92] text-[hsl(43_65%_52%)]"
                style={{ filter: goldDropShadow }}
              >
                <span className="block text-[clamp(2.55rem,8.7vw,7.4rem)]">La Comunidad</span>
                <span className="block text-[clamp(1.65rem,5.15vw,4.35rem)]">Del Banquillo</span>
              </h1>

              <img
                src={LOGO_SRC}
                alt="La Comunidad del Banquillo"
                className="h-40 md:h-52 w-auto mx-auto"
                style={{ filter: goldDropShadow }}
              />

              {homeText.notice && (
                <p className="mx-auto mt-8 max-w-2xl rounded-xl border border-[hsl(43_65%_52%_/_0.35)] bg-black/45 px-5 py-3 text-sm font-black uppercase tracking-wide text-[hsl(43_65%_62%)]">
                  {homeText.notice}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden py-24 bg-[#1a1a1a]">
          <img
            src="/img/jersey-ring-watermark.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-44 top-28 h-[42rem] w-auto opacity-20 mix-blend-screen md:-right-24 md:top-8 md:h-[62rem]"
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-white mb-4">{homeText.communityTitle}</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                {homeText.communityDescription}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Link
                  to="/plantilla-masculina"
                  className="block bg-black/70 backdrop-blur-sm rounded-2xl p-8 border border-[hsl(43_65%_52%_/_0.2)] hover:border-[hsl(43_65%_52%)] transition-smooth hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.2)] group h-full"
                >
                  <Users className="text-[hsl(43_65%_52%)] mb-4 group-hover:scale-110 transition-smooth" size={48} />
                  <h3 className="text-white text-2xl font-semibold mb-3">{homeText.masculinaTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {homeText.masculinaDescription}
                  </p>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <Link
                  to="/plantilla-femenina"
                  className="block bg-black/70 backdrop-blur-sm rounded-2xl p-8 border border-[hsl(43_65%_52%_/_0.2)] hover:border-[hsl(43_65%_52%)] transition-smooth hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.2)] group h-full"
                >
                  <UserRound className="text-[hsl(43_65%_52%)] mb-4 group-hover:scale-110 transition-smooth" size={48} />
                  <h3 className="text-white text-2xl font-semibold mb-3">{homeText.femeninaTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {homeText.femeninaDescription}
                  </p>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link
                  to="/calendario"
                  className="block bg-black/70 backdrop-blur-sm rounded-2xl p-8 border border-[hsl(43_65%_52%_/_0.2)] hover:border-[hsl(43_65%_52%)] transition-smooth hover:shadow-lg hover:shadow-[hsl(43_65%_52%_/_0.2)] group h-full"
                >
                  <Calendar className="text-[hsl(43_65%_52%)] mb-4 group-hover:scale-110 transition-smooth" size={48} />
                  <h3 className="text-white text-2xl font-semibold mb-3">{homeText.calendarioTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {homeText.calendarioDescription}
                  </p>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
