import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analyticsRepository.js';

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const privatePrefixes = ['/panel-control', '/login', '/registro', '/mi-cuenta'];
    if (privatePrefixes.some((prefix) => location.pathname.startsWith(prefix))) return undefined;

    const path = `${location.pathname}${location.search || ''}`;
    const timer = window.setTimeout(() => {
      void trackPageView({ path, title: document.title });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;
