import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FactoryProvider } from './context/FactoryContext';
import { ThemeProvider } from './context/ThemeProvider';
import { LanguageProvider } from './context/LanguageProvider';
import { getSession } from './context/authStore.js';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/equipment/Equipment';
import Catalog from './pages/Catalog';
import History from './pages/history/History';
import Report from './pages/report/Report';
import Calculator from './pages/Calculator';
import Factories from './pages/Factories';
import FactoryDetail from './pages/FactoryDetail';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// getSession() has no fallback session once logged out/expired — without
// this, pages would silently render with no user instead of sending people
// back to /login to get a fresh (correctly-authenticated) session.
function RequireAuth({ children }) {
  return getSession().id ? children : <Navigate to="/login" replace />;
}

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
              <Route path="/home" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/equipment" element={<RequireAuth><Equipment /></RequireAuth>} />
              <Route path="/catalog" element={<RequireAuth><Catalog /></RequireAuth>} />
              <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
              <Route path="/reports" element={<RequireAuth><Report /></RequireAuth>} />
              <Route path="/calculator" element={<RequireAuth><Calculator /></RequireAuth>} />
              <Route path="/factories" element={<RequireAuth><Factories /></RequireAuth>} />
              <Route path="/factories/:name" element={<RequireAuth><FactoryDetail /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><AdminPanel /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </FactoryProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
