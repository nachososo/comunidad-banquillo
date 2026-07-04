import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, Settings, UserRound, X } from 'lucide-react';
import { LOGO_SRC, ADN_BANQUILLER_SRC, goldDropShadow } from '@/constants/brand.js';
import { useAuth } from '@/auth/AuthContext.jsx';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth();

  const navLinks = [
    { path: '/plantilla-masculina', label: 'Plantilla Masculina' },
    { path: '/plantilla-femenina', label: 'Plantilla Femenina' },
    { path: '/staff', label: 'Staff' },
    { path: '/calendario', label: 'Calendario' },
    { path: '/app-estadisticas', label: 'App de estadísticas' },
    { path: '/noticias', label: 'Noticias' },
    { path: '/contacto', label: 'Contacto', mobileLabel: 'Ponte en contacto con nosotros' },
    { path: isAuthenticated ? '/banquiger/panel' : '/banquiger', label: 'Banquiger' },
    { path: '/18-0', label: '18-0' },
  ];

  const isActive = (path) => location.pathname === path;
  const accountPath = isAuthenticated ? '/mi-cuenta' : '/login';

  return (
    <header className="bg-[#1a1a1a] border-b border-[hsl(43_65%_52%_/_0.2)] sticky top-0 z-50">
      <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
        <div className="flex h-20 items-center gap-3 xl:gap-4">
          <Link to="/" className="group flex shrink-0 items-center gap-2 xl:gap-3">
            <img
              src={LOGO_SRC}
              alt="La Comunidad del Banquillo"
              className="h-12 w-auto transition-smooth group-hover:scale-105 xl:h-14"
            />
            <img
              src={ADN_BANQUILLER_SRC}
              alt="ADN Banquiller"
              className="hidden h-6 w-auto transition-smooth group-hover:opacity-90 sm:block xl:h-7 2xl:h-8"
              style={{ filter: goldDropShadow }}
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex xl:gap-4 2xl:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative whitespace-nowrap text-[12px] font-medium transition-smooth xl:text-[13px] 2xl:text-sm ${
                  isActive(link.path)
                    ? 'text-[hsl(43_65%_52%)]'
                    : 'text-gray-300 hover:text-[hsl(43_65%_52%)]'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute -bottom-[1.35rem] left-0 right-0 h-0.5 bg-[hsl(43_65%_52%)]" />
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {isAdmin && (
              <Link
                to="/panel-control"
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black uppercase transition xl:h-10 xl:gap-2 xl:px-3 xl:text-xs ${
                  isActive('/panel-control')
                    ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%)] text-black'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-[hsl(43_65%_52%)] hover:text-[hsl(43_65%_52%)]'
                }`}
              >
                <Settings size={15} />
                Panel
              </Link>
            )}
            <Link
              to={accountPath}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black uppercase transition xl:h-10 xl:gap-2 xl:px-3 xl:text-xs ${
                isActive(accountPath)
                  ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%)] text-black'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:border-[hsl(43_65%_52%)] hover:text-[hsl(43_65%_52%)]'
              }`}
            >
              {isAuthenticated ? <UserRound size={15} /> : <LogIn size={15} />}
              {isAuthenticated ? user.name : 'Entrar'}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[hsl(43_65%_52%)] p-2 hover:bg-white/5 rounded-lg transition-smooth"
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-[hsl(43_65%_52%_/_0.2)]">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 text-sm font-medium transition-smooth ${
                  isActive(link.path)
                    ? 'text-[hsl(43_65%_52%)] bg-white/5'
                    : 'text-gray-300 hover:text-[hsl(43_65%_52%)] hover:bg-white/5'
                }`}
              >
                {link.mobileLabel || link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/panel-control"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 text-sm font-medium transition-smooth ${
                  isActive('/panel-control')
                    ? 'text-[hsl(43_65%_52%)] bg-white/5'
                    : 'text-gray-300 hover:text-[hsl(43_65%_52%)] hover:bg-white/5'
                }`}
              >
                Panel de control
              </Link>
            )}
            <Link
              to={accountPath}
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-3 px-4 text-sm font-medium transition-smooth ${
                isActive(accountPath)
                  ? 'text-[hsl(43_65%_52%)] bg-white/5'
                  : 'text-gray-300 hover:text-[hsl(43_65%_52%)] hover:bg-white/5'
              }`}
            >
              {isAuthenticated ? `Mi cuenta (${user.name})` : 'Iniciar sesión'}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
