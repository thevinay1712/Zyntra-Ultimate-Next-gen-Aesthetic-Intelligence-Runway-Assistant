import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Outfits from './pages/Outfits';
import Recommend from './pages/Recommend';
import Avatar from './pages/Avatar';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import ParticleCanvas from './components/ParticleCanvas';
import { ToastProvider } from './context/ToastContext';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="loader-spinner" /></div>;
  return user ? children : <Navigate to="/" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="loader-spinner" /></div>;
  return !user ? children : <Navigate to="/dashboard" />;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <>
      <ParticleCanvas />
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/outfits" element={<ProtectedRoute><Outfits /></ProtectedRoute>} />
        <Route path="/recommend" element={<ProtectedRoute><Recommend /></ProtectedRoute>} />
        <Route path="/avatar" element={<ProtectedRoute><Avatar /></ProtectedRoute>} />
      </Routes>
      {!isLandingPage && (
        <footer className="app-footer">
          © 2026 Zyntra. Built with ❤️ by Vinay Sinnur
        </footer>
      )}
      <Toast />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
