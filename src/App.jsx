import React from 'react';
import { Navigate, Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import PlantillaMasculinaPage from './pages/PlantillaMasculinaPage';
import PlantillaFemeninaPage from './pages/PlantillaFemeninaPage';
import StaffPage from './pages/StaffPage';
import StaffDetailPage from './pages/StaffDetailPage';
import CalendarioPage from './pages/CalendarioPage';
import SeasonCalendarPage from './pages/SeasonCalendarPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import ContactPage from './pages/ContactPage';
import BanquigerPage from './pages/BanquigerPage';
import EighteenZeroPage from './pages/EighteenZeroPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import ControlPanelPage from './pages/ControlPanelPage';
import ControlPanelModulePage from './pages/ControlPanelModulePage';
import UserManagementPage from './pages/UserManagementPage';
import AnalyticsAdminPage from './pages/AnalyticsAdminPage';
import PlayersAdminPage from './pages/PlayersAdminPage';
import ContentAdminPage from './pages/ContentAdminPage';
import CalendarAdminPage from './pages/CalendarAdminPage';
import StatsAdminPage from './pages/StatsAdminPage';
import StatsCapturePage from './pages/StatsCapturePage';
import StatsCaptureAdminPage from './pages/StatsCaptureAdminPage';
import EighteenZeroAdminPage from './pages/EighteenZeroAdminPage';
import BanquigerAdminPage from './pages/BanquigerAdminPage';
import ContactAdminPage from './pages/ContactAdminPage';
import NewsAdminPage from './pages/NewsAdminPage';
import { AuthProvider } from './auth/AuthContext.jsx';
import AnalyticsTracker from './components/AnalyticsTracker.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plantilla-masculina" element={<PlantillaMasculinaPage />} />
          <Route path="/plantilla-femenina" element={<PlantillaFemeninaPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff/:id" element={<StaffDetailPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/calendario/:team/:season" element={<SeasonCalendarPage />} />
          <Route path="/noticias" element={<NewsPage />} />
          <Route path="/noticias/:slug" element={<NewsDetailPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/banquiger" element={<BanquigerPage />} />
          <Route path="/banquiger/panel" element={<BanquigerPage />} />
          <Route path="/18-0" element={<EighteenZeroPage />} />
          <Route path="/app-estadisticas" element={<StatsCapturePage />} />
          <Route path="/estadisticas" element={<Navigate to="/app-estadisticas" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/mi-cuenta" element={<AccountPage />} />
          <Route path="/panel-control" element={<ControlPanelPage />} />
          <Route path="/panel-control/contenido" element={<ContentAdminPage />} />
          <Route path="/panel-control/usuarios" element={<UserManagementPage />} />
          <Route path="/panel-control/analiticas" element={<AnalyticsAdminPage />} />
          <Route path="/panel-control/plantillas" element={<PlayersAdminPage />} />
          <Route path="/panel-control/calendario" element={<CalendarAdminPage />} />
          <Route path="/panel-control/noticias" element={<NewsAdminPage />} />
          <Route path="/panel-control/estadisticas" element={<StatsAdminPage />} />
          <Route path="/panel-control/toma-estadisticas" element={<StatsCaptureAdminPage />} />
          <Route path="/panel-control/18-0" element={<EighteenZeroAdminPage />} />
          <Route path="/panel-control/banquiger" element={<BanquigerAdminPage />} />
          <Route path="/panel-control/mensajes" element={<ContactAdminPage />} />
          <Route path="/panel-control/:moduleId" element={<ControlPanelModulePage />} />
          <Route path="/jugador/:id" element={<PlayerDetailPage />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="text-center">
                  <h1 className="text-white mb-4">Página no encontrada</h1>
                  <a href="/" className="text-[hsl(43_65%_52%)] hover:underline">
                    Volver al inicio
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
