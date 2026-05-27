import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const IconAlert = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [noAccountError, setNoAccountError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNoAccountError(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.message === 'No account exists') {
        setNoAccountError(true);
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-container animate-slide-up">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-brand">
              <div className="logo-mark">Z</div>
            </Link>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Log in to access your wardrobe</p>
          </div>

          {error && (
            <div className="auth-error animate-fade-in">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
              id="btn-login"
            >
              {loading ? <span className="loader-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Log In'}
            </button>
          </form>

          {noAccountError && (
            <div className="no-account-notice" style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px dashed rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.875rem',
              textAlign: 'center',
              lineHeight: '1.4',
              animation: 'fadeIn 0.3s ease'
            }}>
              No account exists, <Link to="/signup" style={{ color: 'var(--accent-violet-light)', fontWeight: 600, textDecoration: 'underline' }}>create one</Link> to refresh your styling
            </div>
          )}

          <p className="auth-footer">
            Don't have an account?
            <Link to="/signup" className="auth-link" id="link-to-signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
