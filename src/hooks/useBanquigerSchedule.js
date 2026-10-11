import { useEffect, useState } from 'react';
import { resolveBanquigerSchedule } from '../utils/banquigerSchedule.js';

export const useBanquigerSchedule = (settings, rounds) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return resolveBanquigerSchedule(settings, rounds, now);
};
