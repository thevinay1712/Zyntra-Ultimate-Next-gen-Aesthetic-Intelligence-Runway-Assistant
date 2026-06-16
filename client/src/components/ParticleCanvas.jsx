import { useEffect, useRef } from 'react';

export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Mouse position — starts far off-screen so no effect until moved
    let mouseX = -9999;
    let mouseY = -9999;

    // ── Particle factory ──────────────────────────────────────────────
    function make() {
      return {
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        size:  0.8 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      };
    }

    const N = 150;
    const pts = Array.from({ length: N }, make);

    // ── Constants ─────────────────────────────────────────────────────
    const ATTRACT_R = 200;   // outer attraction radius (px)
    const REPEL_R   = 40;    // inner repulsion radius (px)
    const F_ATTRACT = 0.22;  // attraction strength
    const F_REPEL   = 0.55;  // repulsion strength (must beat attraction)
    const FRICTION  = 0.94;  // per-frame velocity multiplier (higher = less damping)

    let frame = 0;
    let animId;

    function tick() {
      animId = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      frame++;

      for (let i = 0; i < N; i++) {
        const p = pts[i];

        // Direction to mouse
        const dx   = mouseX - p.x;
        const dy   = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < REPEL_R) {
          // Inside dead-zone → push away so particles never pile up
          const f = (1 - dist / REPEL_R) * F_REPEL;
          p.vx -= (dx / dist) * f;
          p.vy -= (dy / dist) * f;
        } else if (dist < ATTRACT_R) {
          // In attraction ring → pull toward cursor
          const f = (1 - dist / ATTRACT_R) * F_ATTRACT;
          p.vx += (dx / dist) * f;
          p.vy += (dy / dist) * f;
        }

        // Random jitter — keeps particles in constant gentle motion
        p.vx += (Math.random() - 0.5) * 0.09;
        p.vy += (Math.random() - 0.5) * 0.09;

        // Apply friction & move
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x  += p.vx;
        p.y  += p.vy;

        // Wrap edges
        if (p.x < -5) p.x = W + 5;
        else if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5;
        else if (p.y > H + 5) p.y = -5;

        // Twinkle alpha
        const a = p.alpha + Math.sin(frame * 0.02 + p.phase) * 0.1;
        const alpha = Math.max(0.05, Math.min(0.9, a));

        // Draw — glow halo + sharp core
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `rgba(255,255,255,${(alpha * 0.45).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    tick();

    // ── Events ────────────────────────────────────────────────────────
    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize',    onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize',    onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}
