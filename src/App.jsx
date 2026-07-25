import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FactoryProvider } from './context/FactoryContext';
import { ThemeProvider } from './context/ThemeProvider';
import { LanguageProvider } from './context/LanguageProvider';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/equipment/Equipment';
import History from './pages/history/History';
import Report from './pages/report/Report';
import Factories from './pages/Factories';
import FactoryDetail from './pages/FactoryDetail';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <FactoryProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/home" element={<Dashboard />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/history" element={<History />} />
              <Route path="/reports" element={<Report />} />
              <Route path="/factories" element={<Factories />} />
              <Route path="/factories/:name" element={<FactoryDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </FactoryProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
