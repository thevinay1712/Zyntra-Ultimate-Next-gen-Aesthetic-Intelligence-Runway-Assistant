import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/* SVG Icons */
const IconWardrobe = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20.38 3.46L16 2a8 8 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></svg>
);
const IconCamera = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
);
const IconCpu = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
);
const IconLogOut = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
const IconGlassesAR = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10z" />
    <path d="M16 10h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V10z" />
    <path d="M8 12h8" />
    <path d="M4 10V6" />
    <path d="M20 10V6" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Wardrobe', Icon: IconWardrobe },
    { path: '/upload', label: 'Upload', Icon: IconCamera },
    { path: '/outfits', label: 'Outfits', Icon: IconSparkles },
    { path: '/recommend', label: 'AI Stylist', Icon: IconCpu },
    { path: '/avatar', label: 'AR Try-On', Icon: IconGlassesAR },
  ];

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        <Link to="/dashboard" className="logo-link">
          <div className="logo-mark" style={{ width: 32, height: 32, fontSize: '1rem' }}>Z</div>
          <span className="logo-text" style={{ fontSize: '1.25rem' }}>Zyntra</span>
        </Link>

        <div className="navbar-links">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/avatar' && location.pathname === '/tryon');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                id={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <item.Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="navbar-actions">
          {user && (
            <div className="user-profile">
              <span className="user-greeting">Hi, {user.name}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                id="btn-logout"
                title="Log out"
              >
                <IconLogOut />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
