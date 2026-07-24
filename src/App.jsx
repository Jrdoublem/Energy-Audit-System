import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FactoryProvider } from './context/FactoryContext';
import { ThemeProvider } from './context/ThemeProvider';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/equipment/Equipment';
import History from './pages/history/History';
import Report from './pages/report/Report';
import Factories from './pages/Factories';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </FactoryProvider>
    </BrowserRouter>
  );
}

export default App;
