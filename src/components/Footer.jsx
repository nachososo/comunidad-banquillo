import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Instagram, Twitch, Youtube } from 'lucide-react';
import { LOGO_SRC, ADN_BANQUILLER_SRC, goldDropShadow } from '@/constants/brand.js';
import { defaultSiteContent, getSiteContentItem, mergeSiteContent } from '@/data/siteContent.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const MATRICE_WEBSITE_URL = 'https://www.matricestudio.com/';

const iconByType = {
  instagram: Instagram,
  youtube: Youtube,
  twitch: Twitch,
  website: Globe,
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [contentItems, setContentItems] = useState(defaultSiteContent);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let isMounted = true;

    const loadContent = async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key,section,label,href,type,visible,sort_order')
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (!error && data) {
        setContentItems(mergeSiteContent(data));
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedContent = useMemo(() => {
    const visibleItems = contentItems.filter((item) => item.visible !== false);

    return {
      quickLinks: visibleItems.filter((item) => item.section === 'quick_links'),
      social: visibleItems.filter((item) => item.section === 'social'),
      sponsor: visibleItems.filter((item) => item.section === 'sponsor'),
      footerClaim: getSiteContentItem(contentItems, 'footer_claim', 'La Comunidad del Banquillo - pasión por el baloncesto en Liga Barajas y más allá.'),
    };
  }, [contentItems]);

  const renderExternalLink = (item) => {
    const Icon = iconByType[item.type] || Globe;

    return (
      <a
        key={item.key}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 items-start gap-2 text-gray-300 hover:text-[hsl(43_65%_52%)] transition-smooth group"
        aria-label={item.label}
      >
        <span className="shrink-0 p-2 rounded-lg bg-white/5 border border-[hsl(43_65%_52%_/_0.2)] group-hover:border-[hsl(43_65%_52%)] group-hover:bg-[hsl(43_65%_52%_/_0.1)] transition-smooth">
          <Icon size={18} className="text-[hsl(43_65%_52%)]" />
        </span>
        <span className="min-w-0 break-all text-xs font-medium sm:text-sm">{item.label}</span>
      </a>
    );
  };

  return (
    <footer className="bg-[#1a1a1a] border-t border-[hsl(43_65%_52%_/_0.2)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:gap-10">
            <div className="min-w-0">
              <span className="text-[hsl(43_65%_52%)] font-semibold text-sm tracking-wider uppercase mb-3 block">
                Enlaces rápidos
              </span>
              <nav className="flex flex-col gap-1.5">
                {groupedContent.quickLinks.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="text-xs text-gray-300 hover:text-[hsl(43_65%_52%)] transition-smooth sm:text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="min-w-0">
              <span className="text-[hsl(43_65%_52%)] font-semibold text-sm tracking-wider uppercase mb-3 block">
                Redes
              </span>
              <div className="flex flex-col gap-2">
                {groupedContent.social.map(renderExternalLink)}
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-[hsl(43_65%_52%)] font-semibold text-sm tracking-wider uppercase mb-3 block">
                Patrocinador
              </span>
              <div className="flex flex-col gap-2">
                {groupedContent.sponsor.map(renderExternalLink)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[hsl(43_65%_52%_/_0.2)] pt-6">
            <img src={LOGO_SRC} alt="La Comunidad del Banquillo" className="h-14 w-auto" />
            <a href={MATRICE_WEBSITE_URL} target="_blank" rel="noopener noreferrer" aria-label="Web de Matrice">
              <img
                src="/img/matrice-logo.png"
                alt="Matrice"
                className="h-14 w-14 rounded-lg object-cover border border-[hsl(43_65%_52%_/_0.25)] transition-smooth hover:border-[hsl(43_65%_52%)]"
              />
            </a>
            <img
              src={ADN_BANQUILLER_SRC}
              alt="ADN Banquiller"
              className="h-8 w-auto"
              style={{ filter: goldDropShadow }}
            />
          </div>

          <div className="flex w-full flex-col items-center border-t border-[hsl(43_65%_52%_/_0.2)] pt-6 text-center">
            <p className="w-full text-center text-sm text-gray-400">
              {groupedContent.footerClaim}
            </p>
            <p className="mt-3 w-full text-center text-sm text-gray-500">
              © {currentYear} La Comunidad del Banquillo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
