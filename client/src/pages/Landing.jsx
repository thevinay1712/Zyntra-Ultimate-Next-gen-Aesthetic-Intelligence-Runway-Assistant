import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './Landing.css';

/* SVG Icons as components */
const IconCamera = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IconCpu = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" className="icon icon-xl"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    duration: `${Math.random() * 4 + 2}s`,
    delay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.5 + 0.1,
  }));

  return (
    <div className="star-field">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            '--duration': s.duration,
            '--delay': s.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing" id="landing-page">
      <StarField />

      {/* Morphing background orbs */}
      <div className="landing-bg">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <div className="container landing-header-inner">
          <Link to="/" className="logo-link">
            <div className="logo-mark">Z</div>
            <span className="logo-text">Zyntra</span>
          </Link>
          <div className="landing-header-actions">
            <Link to="/login" className="btn btn-ghost" id="btn-header-login">Log In</Link>
            <Link to="/signup" className="btn btn-primary" id="btn-header-signup">
              Get Started <IconArrowRight />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" ref={heroRef}>
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="hero-badge animate-fade-in">
              <span className="badge-pulse" />
              <span>AI-Powered Wardrobe Manager</span>
            </div>

            <h1 className="hero-title animate-fade-in delay-1">
              Your Closet,<br />
              <span className="text-gradient">Reimagined.</span>
            </h1>

            <p className="hero-subtitle animate-fade-in delay-2">
              Digitize your wardrobe, get AI outfit recommendations, and never wonder what to wear again.
              Your personal stylist, powered by intelligence.
            </p>

            <div className="hero-actions animate-fade-in delay-3">
              <Link to="/signup" className="btn btn-primary btn-lg hero-cta" id="btn-hero-signup">
                Start For Free
                <IconArrowRight />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg" id="btn-hero-login">
                I Have an Account
              </Link>
            </div>

            <div className="hero-stats animate-fade-in delay-4">
              <div className="hero-stat">
                <span className="hero-stat-icon">⚡</span>
                <div>
                  <span className="hero-stat-value">Smart</span>
                  <span className="hero-stat-label">AI Matching</span>
                </div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-icon">🎨</span>
                <div>
                  <span className="hero-stat-value">Color</span>
                  <span className="hero-stat-label">Harmony Engine</span>
                </div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-icon">✨</span>
                <div>
                  <span className="hero-stat-value">Instant</span>
                  <span className="hero-stat-label">Outfit Builder</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual animate-fade-in delay-2">
            <div className="hero-showcase">
              {/* Orbiting ring */}
              <div className="showcase-ring" />
              <div className="showcase-ring showcase-ring-2" />

              {/* Center "avatar" */}
              <div className="showcase-center">
                <div className="showcase-avatar">
                  <div className="avatar-silhouette">
                    <svg viewBox="0 0 120 200" fill="none">
                      <circle cx="60" cy="35" r="25" fill="url(#avGrad)" />
                      <path d="M25 85 C25 65 95 65 95 85 L100 135 L20 135 Z" fill="url(#avGrad2)" />
                      <rect x="30" y="135" width="25" height="60" rx="8" fill="url(#avGrad3)" />
                      <rect x="65" y="135" width="25" height="60" rx="8" fill="url(#avGrad3)" />
                      <defs>
                        <linearGradient id="avGrad" x1="35" y1="10" x2="85" y2="60">
                          <stop stopColor="#a78bfa" /><stop offset="1" stopColor="#818cf8" />
                        </linearGradient>
                        <linearGradient id="avGrad2" x1="20" y1="65" x2="100" y2="135">
                          <stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#6d28d9" />
                        </linearGradient>
                        <linearGradient id="avGrad3" x1="30" y1="135" x2="90" y2="195">
                          <stop stopColor="#4f46e5" /><stop offset="1" stopColor="#3730a3" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating clothing cards */}
              <div className="showcase-card sc-1 animate-float">
                <div className="sc-img" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
                <div className="sc-info">
                  <span className="sc-name">Casual Tee</span>
                  <span className="sc-cat">Tops</span>
                </div>
              </div>

              <div className="showcase-card sc-2 animate-float-reverse">
                <div className="sc-img" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }} />
                <div className="sc-info">
                  <span className="sc-name">Denim Jacket</span>
                  <span className="sc-cat">Outerwear</span>
                </div>
              </div>

              <div className="showcase-card sc-3 animate-float delay-3">
                <div className="sc-img" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }} />
                <div className="sc-info">
                  <span className="sc-name">Slim Jeans</span>
                  <span className="sc-cat">Bottoms</span>
                </div>
              </div>

              {/* Match badge */}
              <div className="showcase-match animate-float delay-4">
                <svg viewBox="0 0 24 24" className="icon icon-sm" style={{ color: '#10b981' }}><polyline points="20 6 9 17 4 12"/></svg>
                <span>AI Match · <strong>94%</strong></span>
              </div>

              {/* Color dots */}
              <div className="showcase-colors animate-float-reverse delay-2">
                <div className="sc-dot" style={{ background: '#667eea' }} />
                <div className="sc-dot" style={{ background: '#f5576c' }} />
                <div className="sc-dot" style={{ background: '#4facfe' }} />
                <span>Harmony</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Features</span>
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-subtitle">
              From upload to outfit — Zyntra handles it all with intelligence and style.
            </p>
          </div>

          <div className="features-grid">
            {[
              { Icon: IconCamera, title: 'Smart Upload', desc: 'Snap a photo, and Zyntra auto-detects colors, category, and season. Your wardrobe, digitized in seconds.', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
              { Icon: IconSearch, title: 'Filter & Search', desc: 'Find any piece instantly. Filter by color, category, season, occasion — or search by name.', color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
              { Icon: IconCpu, title: 'AI Recommendations', desc: 'Get outfit suggestions based on color theory and occasion matching. Never overdress or underdress.', color: '#f43f5e', glow: 'rgba(244,63,94,0.15)' },
              { Icon: IconUser, title: 'Virtual Avatar', desc: 'Preview outfits on a simple avatar before getting dressed. Mix and match to find the perfect look.', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
              { Icon: IconHeart, title: 'Save Outfits', desc: 'Love a combo? Save it. Build a library of go-to outfits for any occasion.', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
              { Icon: IconSun, title: 'Weather Aware', desc: 'Zyntra checks local weather and adapts suggestions — light layers for spring, cozy picks for winter.', color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
            ].map((feature, i) => (
              <div key={i} className="feature-card glass-card reveal" style={{ '--accent': feature.color, '--glow': feature.glow, animationDelay: `${i * 0.08}s` }}>
                <div className="feature-icon-wrap">
                  <div className="feature-glow" />
                  <div className="feature-icon" style={{ color: feature.color }}>
                    <feature.Icon />
                  </div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
                <div className="feature-line" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-eyebrow">How It Works</span>
            <h2 className="section-title">Three Simple Steps</h2>
          </div>
          <div className="steps-grid">
            {[
              { num: '01', title: 'Upload', desc: 'Take a photo of your clothing. Zyntra extracts colors and metadata automatically.', color: '#8b5cf6' },
              { num: '02', title: 'Organize', desc: 'Your wardrobe is digitized. Filter, search, and browse by category, season, or color.', color: '#f43f5e' },
              { num: '03', title: 'Get Styled', desc: 'AI picks the best outfits using color harmony and occasion matching. Save your favorites.', color: '#10b981' },
            ].map((step, i) => (
              <div key={i} className="step-card reveal" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="step-num" style={{ color: step.color }}>{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < 2 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-card reveal">
            <div className="cta-bg-effects">
              <div className="cta-orb cta-orb-1" />
              <div className="cta-orb cta-orb-2" />
            </div>
            <div className="cta-content">
              <h2 className="cta-title">Ready to Rethink<br/>Your Closet?</h2>
              <p className="cta-subtitle">
                Join Zyntra and transform how you dress — every single day.
              </p>
              <Link to="/signup" className="btn btn-primary btn-lg cta-btn" id="btn-cta-signup">
                Get Started Free <IconArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div className="footer-left">
            <div className="logo-link">
              <div className="logo-mark" style={{ width: 28, height: 28, fontSize: '0.813rem' }}>Z</div>
              <span className="logo-text" style={{ fontSize: '1.125rem' }}>Zyntra</span>
            </div>
            <p className="footer-tagline">Your AI-powered wardrobe manager.</p>
          </div>
          <span className="footer-copy">© 2026 Zyntra. Built with ❤️ by Vinay Sinnur</span>
        </div>
      </footer>
    </div>
  );
}
