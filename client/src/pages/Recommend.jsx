import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recommendAPI, clothingAPI } from '../lib/api';
import { useToast } from '../context/ToastContext';
import TryOn from './TryOn';
import './Recommend.css';

/* SVG Icons */
const IconCpu = () => <svg viewBox="0 0 24 24" className="icon"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>;
const IconStar = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconRefresh = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24" className="icon"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconSettings = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

/* E-Commerce Brand Logos */
const LogoAmazon = () => (
  <svg viewBox="0 0 100 30" className="brand-logo-svg" height="20">
    <text x="0" y="18" fill="currentColor" fontWeight="800" fontSize="16" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.5">amazon</text>
    <path d="M12 21 C25 25, 42 25, 52 21 C54 20, 55 21, 53 22 C44 27, 21 27, 10 22 C9 21, 10 20, 12 21 Z" fill="#ff9900" />
    <path d="M51 18 C52 19, 51 20, 50 20 C47 21, 44 18, 44 16 C44 15, 45 15, 46 16 C47 17, 50 18, 51 18 Z" fill="#ff9900" />
  </svg>
);

const LogoFlipkart = () => (
  <svg viewBox="0 0 100 30" className="brand-logo-svg" height="20">
    <rect x="0" y="3" width="18" height="18" rx="3" fill="#2874f0" />
    <path d="M4 10 L8 14 L14 8" stroke="#ffe11b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <text x="23" y="18" fill="currentColor" fontWeight="bold" fontSize="14" fontFamily="system-ui, -apple-system, sans-serif">Flipkart</text>
  </svg>
);

const LogoMyntra = () => (
  <svg viewBox="0 0 100 30" className="brand-logo-svg" height="20">
    <path d="M5 21 L5 5 L11 15 L17 5 L17 21" stroke="url(#myntraGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <defs>
      <linearGradient id="myntraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff3f6c" />
        <stop offset="100%" stopColor="#f7a228" />
      </linearGradient>
    </defs>
    <text x="25" y="18" fill="currentColor" fontWeight="bold" fontSize="14" fontFamily="system-ui, -apple-system, sans-serif">Myntra</text>
  </svg>
);

const LogoAjio = () => (
  <svg viewBox="0 0 80 30" className="brand-logo-svg" height="20">
    <text x="0" y="18" fill="currentColor" fontWeight="bold" fontSize="16" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">AJIO</text>
    <circle cx="50" cy="16" r="2.5" fill="#2fdab8" />
  </svg>
);


const DESTINATIONS = [
  { id: 'casual', label: 'Cafe & Friends', icon: '☕', desc: 'Relaxed hangout, casual lunches, daily runs' },
  { id: 'formal', label: 'Office & Business', icon: '💼', desc: 'Meetings, work, interviews, classic dinners' },
  { id: 'sport', label: 'Active & Gym', icon: '🏋️', desc: 'Workout, outdoor running, sport training' },
  { id: 'party', label: 'Night Out & Club', icon: '🎉', desc: 'Festive celebrations, parties, date nights' }
];

/*
const WEATHER_MOCK = {
  sunny: { temp: 29, condition: 'Clear Sky ☀️', color: '#f59e0b' },
  rainy: { temp: 15, condition: 'Heavy Showers 🌧️', color: '#3b82f6' },
  cold: { temp: 2, condition: 'Freezing Snow ❄️', color: '#06b6d4' },
  windy: { temp: 12, condition: 'Chilly Gale 💨', color: '#10b981' }
};
*/

/* ========================================================
   DYNAMIC ON-THE-FLY CANVAS BACKGROUND REMOVER COMPONENT
   ======================================================== */
function DressingItemImage({ src, className, alt, style }) {
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // dominant pixel check (corner 0,0)
      const rTarget = data[0];
      const gTarget = data[1];
      const bTarget = data[2];
      const aTarget = data[3];

      // Avoid keying if already fully transparent or empty
      if (aTarget === 0) {
        setProcessedSrc(src);
        return;
      }

      let removed = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const dist = Math.sqrt(
          (r - rTarget) ** 2 +
          (g - gTarget) ** 2 +
          (b - bTarget) ** 2
        );

        // Tolerance key-out on-the-fly
        if (dist < 42) {
          data[i + 3] = 0;
          removed++;
        } else if (dist < 42 + 10) {
          const factor = (dist - 42) / 10;
          data[i + 3] = Math.round(factor * a);
        }
      }

      if (removed > 20) {
        setProcessedSrc(canvas.toDataURL('image/png'));
      } else {
        setProcessedSrc(src);
      }
    };
    img.onerror = () => setProcessedSrc(src);
    img.src = src;
  }, [src]);

  return <img src={processedSrc} className={className} alt={alt} style={style} />;
}

/* ========================================================
   RENDER CUSTOM VECTOR AVATAR LAYER (With Clamped 3D Rotate)
   ======================================================== */
function RenderAvatarVector({ styleProps, rotation = 0, currentOutfit = null, fitSettings = {} }) {
  const { gender = 'male', skin = 'olive', hair = 'messy', hairColor = 'black', expression = 'smile', hasBeard = true } = styleProps;

  // Visual skin/hair colors configuration with rich dual-gradient hues
  const skinColors = {
    pale: { primary: '#fff0eb', shadow: '#ffdcd0', highlight: '#ffffff' },
    fair: { primary: '#ffd6c9', shadow: '#fca690', highlight: '#ffe8e2' },
    olive: { primary: '#eca786', shadow: '#d28b66', highlight: '#fcd3c1' },
    bronze: { primary: '#c8855f', shadow: '#aa6943', highlight: '#dfa683' },
    dark: { primary: '#724933', shadow: '#54311e', highlight: '#8f6149' }
  };

  const hairColors = {
    black: '#121212',
    brown: '#5a3d2e',
    blonde: '#dcb66c',
    red: '#962b1a',
    purple: '#5d2366',
    cyan: '#0f7378'
  };

  const skinPalette = skinColors[skin] || skinColors.olive;
  const hColor = hairColors[hairColor] || hairColors.black;

  // Immersive continuous 360-degree math:
  // We compute a perfect visual Y-rotation tilt using a continuous sine wave,
  // and dynamically toggle activeView between 'front' and 'back' based on rotation ranges.
  const normRot = (rotation + 360) % 360;
  const activeView = (normRot >= 90 && normRot < 270) ? 'back' : 'front';
  const visualY = Math.sin((normRot * Math.PI) / 180) * 35;

  return (
    <div
      className="avatar-wrapper"
      style={{
        transform: `rotateY(${visualY}deg) rotateX(1.5deg)`,
        transition: 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transformStyle: 'preserve-3d'
      }}
    >
      <svg viewBox="0 0 200 320" className="avatar-svg-canvas">
        <defs>
          {/* Skin primary gradient to give photorealistic depth */}
          <linearGradient id="avatarSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={skinPalette.highlight} />
            <stop offset="40%" stopColor={skinPalette.primary} />
            <stop offset="100%" stopColor={skinPalette.shadow} />
          </linearGradient>

          {/* 3D clay head radial gradient */}
          <radialGradient id="clayHeadGrad" cx="35%" cy="30%" r="60%" fx="30%" fy="25%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="20%" stopColor={skinPalette.primary} />
            <stop offset="100%" stopColor={skinPalette.shadow} />
          </radialGradient>

          {/* 3D clay bulbous nose radial gradient */}
          <radialGradient id="clayNoseGrad" cx="30%" cy="30%" r="70%" fx="25%" fy="20%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="35%" stopColor={skinPalette.primary} />
            <stop offset="100%" stopColor={skinPalette.shadow} />
          </radialGradient>

          {/* Skin shadow gradient */}
          <linearGradient id="avatarSkinShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skinPalette.shadow} />
            <stop offset="100%" stopColor={skinPalette.shadow} opacity="0" />
          </linearGradient>

          {/* Underwear metallic grey gradient */}
          <linearGradient id="underwearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c303f" />
            <stop offset="100%" stopColor="#15171f" />
          </linearGradient>
        </defs>

        {/* Shadow floor */}
        <ellipse cx="100" cy="305" rx="55" ry="11" fill="rgba(0,0,0,0.3)" />

        {gender === 'female' ? (
          <>
            {/* ========================================================
               3D CLAYMATION FEMALE MODEL (Organic Silhouettes)
               ======================================================== */}

            {/* Slender Curved Neck */}
            <path d="M 94,62 C 94,62 93,85 93,85 L 107,85 C 107,85 106,62 106,62 Z" fill="url(#avatarSkinGrad)" />
            <path d="M 94,62 L 95,85 L 100,85 Z" fill={skinPalette.shadow} opacity="0.3" />

            {/* Slender Torso curves */}
            <path d="M 76,85 C 65,85 62,97 62,109 C 62,125 70,141 73,156 C 76,171 76,195 76,195 L 124,195 C 124,195 124,171 127,156 C 130,141 138,125 138,109 C 138,97 135,85 124,85 Z" fill="url(#avatarSkinGrad)" />

            {/* Female slender elegant legs */}
            <rect x="76" y="195" width="16" height="85" rx="8" fill="url(#avatarSkinGrad)" />
            <rect x="108" y="195" width="16" height="85" rx="8" fill="url(#avatarSkinGrad)" />

            {/* Legs muscle shading lines */}
            <path d="M 84,195 L 84,260" stroke={skinPalette.shadow} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <path d="M 116,195 L 116,260" stroke={skinPalette.shadow} strokeWidth="1" opacity="0.4" strokeLinecap="round" />

            {/* Undergarments */}
            {activeView === 'front' ? (
              <>
                {/* Crop Top (Sports bra) */}
                <path d="M 70,105 C 70,105 77,138 100,138 C 123,138 130,105 130,105 L 126,90 L 74,90 Z" fill="url(#underwearGrad)" />
                <path d="M 74,90 L 77,105" stroke="url(#underwearGrad)" strokeWidth="4" />
                <path d="M 126,90 L 123,105" stroke="url(#underwearGrad)" strokeWidth="4" />
                {/* High Waist Shorts */}
                <path d="M 76,170 C 76,170 75,195 75,198 L 125,198 C 125,195 124,170 124,170 Z" fill="url(#underwearGrad)" />
              </>
            ) : (
              <>
                {/* Back Crop Top */}
                <path d="M 70,105 C 70,105 77,125 100,125 C 123,125 130,105 130,105 L 126,88 L 74,88 Z" fill="url(#underwearGrad)" />
                <path d="M 80,88 L 81,105" stroke="url(#underwearGrad)" strokeWidth="3" />
                <path d="M 120,88 L 119,105" stroke="url(#underwearGrad)" strokeWidth="3" />
                {/* Back Shorts */}
                <path d="M 76,170 C 76,170 75,195 75,198 L 125,198 C 125,195 124,170 124,170 Z" fill="url(#underwearGrad)" />
              </>
            )}

            {/* Rounded side ears */}
            <circle cx="74" cy="46" r="5" fill={skinPalette.primary} stroke={skinPalette.shadow} strokeWidth="0.5" />
            <circle cx="74" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />
            <circle cx="126" cy="46" r="5" fill={skinPalette.primary} stroke={skinPalette.shadow} strokeWidth="0.5" />
            <circle cx="126" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />

            {/* Head */}
            <circle cx="100" cy="45" r="24" fill="url(#clayHeadGrad)" />

            {activeView === 'front' ? (
              <>
                {/* Closed Crescent Smiling Eyes */}
                <path d="M 83,41 Q 90,34 97,41" fill="none" stroke="#1c1c24" strokeWidth="3" strokeLinecap="round" />
                <path d="M 103,41 Q 110,34 117,41" fill="none" stroke="#1c1c24" strokeWidth="3" strokeLinecap="round" />

                {/* Bulbous Glossy Nose */}
                <ellipse cx="100" cy="46" rx="7" ry="6" fill="url(#clayNoseGrad)" />

                {/* Eyebrows */}
                <path d="M 80,33 Q 88,29 95,33.5" stroke="#121212" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <path d="M 120,33 Q 112,29 105,33.5" stroke="#121212" strokeWidth="1.2" fill="none" strokeLinecap="round" />

                {/* Smiling Mouth */}
                {expression === 'smile' && (
                  <path d="M 94,56 Q 100,61 106,56" stroke="#4c0519" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                )}
                {expression === 'cool' && (
                  <>
                    {/* Glossy Clay Sunglasses */}
                    <path d="M 76,35 L 124,35 C 124,35 124,46 119,48 C 114,50 104,50 102,44 C 100,50 90,50 85,48 C 80,46 76,35 76,35 Z" fill="#1c1c24" rx="2" />
                    <path d="M 79,37 L 93,39" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 107,37 L 121,39" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    {/* Smiling lips underneath */}
                    <path d="M 95,54 Q 100,58 105,54" stroke="#4c0519" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </>
                )}
                {expression === 'neutral' && (
                  <line x1="94" y1="56" x2="106" y2="56" stroke="#4c0519" strokeWidth="2" strokeLinecap="round" />
                )}
              </>
            ) : null}

            {/* Hairstyles with textured lines */}
            {hair === 'messy' && (
              <path d="M 70,36 C 68,10 132,10 130,36 C 137,30 120,2 100,2 C 80,2 63,30 70,36 Z M 65,30 C 65,30 74,18 84,20 C 74,20 67,26 65,30 Z" fill={hColor} />
            )}
            {hair === 'waves' && (
              <path d="M 70,38 C 65,25 72,8 100,8 C 128,8 135,25 130,38 C 142,50 140,85 138,98 C 132,80 126,50 126,50 C 122,44 100,38 100,38 C 100,38 78,44 74,50 C 74,50 68,80 62,98 C 60,85 58,50 70,38 Z" fill={hColor} />
            )}
            {hair === 'crop' && (
              <path d="M 72,36 C 72,16 128,16 128,36 C 131,28 124,10 100,10 C 76,10 69,28 72,36 Z" fill={hColor} />
            )}
            {hair === 'curly' && (
              <path d="M 72,36 C 58,20 70,2 100,2 C 130,2 142,20 128,36 C 136,29 135,16 124,8 C 113,1 87,1 76,8 C 65,16 64,29 72,36 Z" fill={hColor} />
            )}
            {hair === 'sidepart' && (
              <path d="M 70,38 C 70,16 120,10 130,32 C 128,20 115,14 100,16 C 84,18 73,28 70,38 Z" fill={hColor} />
            )}
          </>
        ) : (
          <>
            {/* ========================================================
               3D CLAYMATION MASCULINE MODEL (Organic Silhouettes)
               ======================================================== */}

            {/* Thick Athletic Neck */}
            <path d="M 92,62 C 92,62 92,85 92,85 L 108,85 C 108,85 108,62 108,62 Z" fill="url(#avatarSkinGrad)" />
            <path d="M 92,62 L 93,85 L 100,85 Z" fill={skinPalette.shadow} opacity="0.35" />

            {/* Broad shoulders curved athletic torso */}
            <path d="M 76,82 C 62,82 56,94 56,106 C 56,122 64,138 68,156 C 72,174 74,195 74,195 L 126,195 C 126,195 128,174 132,156 C 136,138 144,122 144,106 C 144,94 138,82 124,82 Z" fill="url(#avatarSkinGrad)" />

            {/* Chest & muscle outlines */}
            {activeView === 'front' && (
              <>
                {/* Collarbones */}
                <path d="M 72,92 Q 84,97 93,97" stroke={skinPalette.shadow} strokeWidth="1.2" fill="none" opacity="0.4" />
                <path d="M 128,92 Q 116,97 107,97" stroke={skinPalette.shadow} strokeWidth="1.2" fill="none" opacity="0.4" />

                {/* Pectoral contours */}
                <path d="M 70,116 C 80,122 90,124 100,124 C 110,124 120,122 130,116" stroke={skinPalette.shadow} strokeWidth="1.5" fill="none" opacity="0.35" />

                {/* Abdominal shading */}
                <path d="M 93,138 L 107,138 M 90,154 L 110,154 M 93,170 L 107,170" stroke={skinPalette.shadow} strokeWidth="1.2" opacity="0.3" />
                <line x1="100" y1="124" x2="100" y2="185" stroke={skinPalette.shadow} strokeWidth="1.2" opacity="0.3" />
              </>
            )}

            {/* Masculine athletic legs */}
            <rect x="74" y="195" width="20" height="85" rx="8" fill="url(#avatarSkinGrad)" />
            <rect x="106" y="195" width="20" height="85" rx="8" fill="url(#avatarSkinGrad)" />
            <path d="M 79,195 L 79,260" stroke={skinPalette.shadow} strokeWidth="1.2" opacity="0.4" />
            <path d="M 121,195 L 121,260" stroke={skinPalette.shadow} strokeWidth="1.2" opacity="0.4" />

            {/* Underwear (boxer briefs - bare chiseled chest!) */}
            {activeView === 'front' ? (
              <path d="M 73,185 L 127,185 L 127,212 L 106,212 L 100,206 L 94,212 L 73,212 Z" fill="url(#underwearGrad)" />
            ) : (
              <>
                <rect x="73" y="185" width="54" height="27" rx="3" fill="url(#underwearGrad)" />
                {/* Back spine & shoulder blades on bare skin */}
                <line x1="100" y1="85" x2="100" y2="185" stroke={skinPalette.shadow} strokeWidth="1.5" opacity="0.35" />
                <path d="M 72,110 Q 84,115 95,112" stroke={skinPalette.shadow} strokeWidth="1.2" fill="none" opacity="0.35" />
                <path d="M 128,110 Q 116,115 105,112" stroke={skinPalette.shadow} strokeWidth="1.2" fill="none" opacity="0.35" />
              </>
            )}

            {/* Rounded side ears */}
            <circle cx="74" cy="46" r="5" fill={skinPalette.primary} stroke={skinPalette.shadow} strokeWidth="0.5" />
            <circle cx="74" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />
            <circle cx="126" cy="46" r="5" fill={skinPalette.primary} stroke={skinPalette.shadow} strokeWidth="0.5" />
            <circle cx="126" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />

            {/* Head */}
            <circle cx="100" cy="45" r="24" fill="url(#clayHeadGrad)" />

            {activeView === 'front' ? (
              <>
                {/* Closed Crescent Smiling Eyes */}
                <path d="M 83,41 Q 90,34 97,41" fill="none" stroke="#1c1c24" strokeWidth="3" strokeLinecap="round" />
                <path d="M 103,41 Q 110,34 117,41" fill="none" stroke="#1c1c24" strokeWidth="3" strokeLinecap="round" />

                {/* Bulbous Glossy Nose */}
                <ellipse cx="100" cy="46" rx="7.5" ry="6.5" fill="url(#clayNoseGrad)" />

                {/* Eyebrows */}
                <path d="M 80,32 Q 88,28 96,32.5" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 120,32 Q 112,28 104,32.5" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />

                {/* Mustache & Beard (Chiseled clay ridges!) */}
                {hasBeard && (
                  <>
                    <path d="M 74,42 
                             C 73,53 76,64 83,71 
                             C 88,76 92,79 93,82 
                             L 96,78 
                             L 100,83 
                             L 104,78 
                             L 107,82 
                             C 108,79 112,76 117,71 
                             C 124,64 127,53 126,42 
                             C 127,50 124,66 116,74 
                             L 112,71 
                             L 108,75 
                             L 100,70 
                             L 92,75 
                             L 88,71 
                             C 80,66 73,50 74,42 Z"
                      fill="#1a1a24" />

                    {/* Grooves for 3D textures */}
                    <path d="M 86,60 L 88,70" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 94,62 L 95,73" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 100,63 L 100,75" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 106,62 L 105,73" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 114,60 L 112,70" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />

                    {/* Mustache */}
                    <path d="M 85,50 C 90,46 97,46 100,48 C 103,46 110,46 115,50 C 120,55 116,58 100,56 C 84,58 80,55 85,50 Z" fill="#1a1a24" />
                  </>
                )}

                {/* Expression */}
                {expression === 'smile' && (
                  <path d="M 94,56 Q 100,61 106,56" stroke={hasBeard ? "#fff" : "#222"} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                )}
                {expression === 'cool' && (
                  <>
                    {/* Glossy Clay Sunglasses */}
                    <path d="M 75,34 L 125,34 C 125,34 125,46 120,48 C 115,50 104,50 102,44 C 100,50 90,50 85,48 C 80,46 75,34 75,34 Z" fill="#1c1c24" rx="2" />
                    <path d="M 78,36 L 93,38" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 108,36 L 122,38" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    {/* Smiling lips underneath */}
                    <path d="M 95,54 Q 100,58 105,54" stroke={hasBeard ? "#fff" : "#222"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </>
                )}
                {expression === 'neutral' && (
                  <line x1="94" y1="56" x2="106" y2="56" stroke={hasBeard ? "#fff" : "#222"} strokeWidth="1.5" strokeLinecap="round" />
                )}
              </>
            ) : null}

            {/* Hairstyles with textured lines */}
            {hair === 'messy' && (
              <path d="M 70,36 C 68,10 132,10 130,36 C 137,30 120,2 100,2 C 80,2 63,30 70,36 Z M 65,30 C 65,30 74,18 84,20 C 74,20 67,26 65,30 Z" fill={hColor} />
            )}
            {hair === 'waves' && (
              <path d="M 70,38 C 65,25 72,8 100,8 C 128,8 135,25 130,38 C 142,50 140,85 138,98 C 132,80 126,50 126,50 C 122,44 100,38 100,38 C 100,38 78,44 74,50 C 74,50 68,80 62,98 C 60,85 58,50 70,38 Z" fill={hColor} />
            )}
            {hair === 'crop' && (
              <path d="M 72,36 C 72,16 128,16 128,36 C 131,28 124,10 100,10 C 76,10 69,28 72,36 Z" fill={hColor} />
            )}
            {hair === 'curly' && (
              <path d="M 72,36 C 58,20 70,2 100,2 C 130,2 142,20 128,36 C 136,29 135,16 124,8 C 113,1 87,1 76,8 C 65,16 64,29 72,36 Z" fill={hColor} />
            )}
            {hair === 'sidepart' && (
              <path d="M 70,38 C 70,16 120,10 130,32 C 128,20 115,14 100,16 C 84,18 73,28 70,38 Z" fill={hColor} />
            )}
          </>
        )}

        {/* Shared Shaded Nose (Front view highlight) */}
        {activeView === 'front' && (
          <ellipse cx="100" cy="46" rx="7.5" ry="6.5" fill="url(#clayNoseGrad)" opacity="0.1" />
        )}
      </svg>

      {/* CLOTHING TRY ON LAYER OVERLAY (Fit settings X, Y, and scale applied live) */}
      {currentOutfit && activeView === 'front' && (
        <div className="tryon-clothing-overlay-container">
          {/* Top */}
          {currentOutfit.top && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.top.imageUrl}`}
              alt="top overlay"
              className="overlay-clothes top-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.top._id]?.x || 0}px, ${fitSettings[currentOutfit.top._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.top._id]?.scale || 100) / 100})`,
                borderColor: currentOutfit.top.color?.primary || 'transparent'
              }}
            />
          )}
          {/* Bottom */}
          {currentOutfit.bottom && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.bottom.imageUrl}`}
              alt="bottom overlay"
              className="overlay-clothes bottom-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.bottom._id]?.x || 0}px, ${fitSettings[currentOutfit.bottom._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.bottom._id]?.scale || 100) / 100})`
              }}
            />
          )}
          {/* Outerwear */}
          {currentOutfit.outerwear && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.outerwear.imageUrl}`}
              alt="outerwear overlay"
              className="overlay-clothes outerwear-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.outerwear._id]?.x || 0}px, ${fitSettings[currentOutfit.outerwear._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.outerwear._id]?.scale || 100) / 100})`
              }}
            />
          )}
          {/* Shoes */}
          {currentOutfit.shoes && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.shoes.imageUrl}`}
              alt="shoes overlay"
              className="overlay-clothes shoes-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.shoes._id]?.x || 0}px, ${fitSettings[currentOutfit.shoes._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.shoes._id]?.scale || 100) / 100})`
              }}
            />
          )}
          {/* Accessory */}
          {currentOutfit.accessory && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.accessory.imageUrl}`}
              alt="accessory overlay"
              className="overlay-clothes accessory-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.accessory._id]?.x || 0}px, ${fitSettings[currentOutfit.accessory._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.accessory._id]?.scale || 100) / 100})`
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================
   DYNAMIC WEATHER ANIMATED VISUALIZER
   ======================================================== */
function WeatherVisualizer({ condition = '' }) {
  const cond = condition.toLowerCase();

  // Rainy / Showers / Thunderstorm
  if (cond.includes('rain') || cond.includes('shower') || cond.includes('thunderstorm') || cond.includes('🌧️') || cond.includes('🌦️') || cond.includes('⛈️')) {
    const isThunder = cond.includes('thunder') || cond.includes('⛈️');
    return (
      <div className="weather-visualizer-box rain-visualizer">
        {isThunder && <div className="lightning-flash" />}
        <div className="cloud-container">
          <span className="cloud-emoji">🌧️</span>
        </div>
        <div className="rain-drops">
          <div className="drop d1" />
          <div className="drop d2" />
          <div className="drop d3" />
          <div className="drop d4" />
          <div className="drop d5" />
        </div>
      </div>
    );
  }

  // Snowy
  if (cond.includes('snow') || cond.includes('❄️')) {
    return (
      <div className="weather-visualizer-box snow-visualizer">
        <div className="cloud-container">
          <span className="cloud-emoji">☁️</span>
        </div>
        <div className="snowflakes">
          <div className="flake f1">❄️</div>
          <div className="flake f2">❄️</div>
          <div className="flake f3">❄️</div>
        </div>
      </div>
    );
  }

  // Cloudy / Partly Cloudy / Foggy
  if (cond.includes('cloud') || cond.includes('fog') || cond.includes('⛅') || cond.includes('🌫️')) {
    return (
      <div className="weather-visualizer-box cloud-visualizer">
        <div className="sun-behind-clouds">☀️</div>
        <div className="clouds-floating">
          <span className="cloud-c1">☁️</span>
          <span className="cloud-c2">☁️</span>
        </div>
      </div>
    );
  }

  // Sunny / Clear Sky (Default fallback)
  return (
    <div className="weather-visualizer-box sun-visualizer">
      <div className="shining-sun-glow" />
      <div className="shining-sun-core">☀️</div>
    </div>
  );
}

export default function Recommend() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // LLM Critique & Visual Similarity Matchmaker states
  const [stylistCritique, setStylistCritique] = useState('');
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [selectedSimilarityItem, setSelectedSimilarityItem] = useState(null);
  const [similarItems, setSimilarItems] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Occasion & Season states
  const [params, setParams] = useState({ occasion: 'casual', season: '' });
  const [customOccasion, setCustomOccasion] = useState('Cafe & Friends');

  // Destination analysis state for real-time validation and styling prep
  const [destinationAnalysis, setDestinationAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Weather states
  const [weather, setWeather] = useState({ temp: 22, condition: 'Sunny Day', forecast: [] });
  const [weatherLoading, setWeatherLoading] = useState(false);
  // const [simulatedWeather, setSimulatedWeather] = useState(null); // 'sunny', 'rainy', 'cold', 'windy' (Disabled by user request)
  const [locationName, setLocationName] = useState('Local Area');
  const [localWeather, setLocalWeather] = useState({ temp: 22, condition: 'Sunny Day', city: 'Local Area', forecast: [] });
  const [destinationWeather, setDestinationWeather] = useState(null);
  const [destinationQuery, setDestinationQuery] = useState('');

  // Try-on state
  const [tryOnOutfit, setTryOnOutfit] = useState(null);
  const [avatarSettings, setAvatarSettings] = useState(null);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewMode, setViewMode] = useState('front'); // 'front' | 'back'

  // Interactive fit settings
  const [fitSettings, setFitSettings] = useState({});
  const [fitActiveSlot, setFitActiveSlot] = useState('top'); // 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory'
  const [showFitter, setShowFitter] = useState(false);

  // AI Dressing Room (TryOn modal) state
  const [tryOnModalOutfit, setTryOnModalOutfit] = useState(null);

  // Missing proper garments warning state
  const [missingProperGarments, setMissingProperGarments] = useState([]);

  // Drag-to-rotate visualizer states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRot, setDragStartRot] = useState(0);

  // Wardrobe loaded from server
  const [clothes, setClothes] = useState([]);
  const [fetchingClothes, setFetchingClothes] = useState(false);

  const topsCount = clothes.filter((c) => c.category === 'tops' || c.category === 'top').length;
  const bottomsCount = clothes.filter((c) => c.category === 'bottoms' || c.category === 'bottom').length;
  const isWardrobeLow = clothes.length > 0 && (topsCount <= 1 || bottomsCount <= 1 || clothes.length < 5);

  const { success, error } = useToast();

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartRot(avatarRotation);
    setAutoRotate(false);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const newRot = (dragStartRot + deltaX * 0.75) % 360;
    setAvatarRotation(newRot < 0 ? newRot + 360 : newRot);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartRot(avatarRotation);
    setAutoRotate(false);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    const newRot = (dragStartRot + deltaX * 0.75) % 360;
    setAvatarRotation(newRot < 0 ? newRot + 360 : newRot);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const delta = e.deltaY;
    const speed = 0.25; // elegant smooth wheel scroll speed
    const newRot = (avatarRotation + delta * speed) % 360;
    setAvatarRotation(newRot < 0 ? newRot + 360 : newRot);
    setAutoRotate(false);
  };

  // Color Harmony Helper functions
  const hexToHSL = (hex) => {
    if (!hex) return { h: 0, s: 0, l: 0 };
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const isComplementary = (hex1, hex2) => {
    const hsl1 = hexToHSL(hex1);
    const hsl2 = hexToHSL(hex2);
    const diff = Math.abs(hsl1.h - hsl2.h);
    return diff >= 150 && diff <= 210;
  };

  const isAnalogous = (hex1, hex2) => {
    const hsl1 = hexToHSL(hex1);
    const hsl2 = hexToHSL(hex2);
    const diff = Math.abs(hsl1.h - hsl2.h);
    return diff <= 30 || diff >= 330;
  };

  const isNeutral = (hex) => {
    const hsl = hexToHSL(hex);
    return hsl.s < 15 || hsl.l < 15 || hsl.l > 90;
  };

  const colorHarmonyScore = (hex1, hex2) => {
    if (!hex1 || !hex2) return 50;
    if (isNeutral(hex1) || isNeutral(hex2)) return 85;
    if (isAnalogous(hex1, hex2)) return 80;
    if (isComplementary(hex1, hex2)) return 90;

    const hsl1 = hexToHSL(hex1);
    const hsl2 = hexToHSL(hex2);
    const hueDiff = Math.abs(hsl1.h - hsl2.h);
    if ((hueDiff >= 110 && hueDiff <= 130) || (hueDiff >= 230 && hueDiff <= 250)) return 75;

    return 60;
  };

  const getColorNote = (hex1, hex2) => {
    if (!hex1 || !hex2) return 'Classic combination';
    if (isNeutral(hex1) && isNeutral(hex2)) return 'Neutral palette — timeless and versatile';
    if (isNeutral(hex1) || isNeutral(hex2)) return 'Neutral base with a color accent — always works';
    if (isComplementary(hex1, hex2)) return 'Complementary colors — bold and eye-catching';
    if (isAnalogous(hex1, hex2)) return 'Analogous harmony — smooth and cohesive';
    return 'Interesting color mix — makes a statement';
  };

  // Local Outfit Matchmaker Algorithm
  const generateLocalRecommendations = () => {
    const checkItemOccasionCompat = (item, occasionId) => {
      if (!occasionId) return 0;
      const cleanOccasion = occasionId.toLowerCase().trim();
      
      // If the item has this occasion tagged, it's perfect!
      if (item.occasion?.map(o => o.toLowerCase()).includes(cleanOccasion)) {
        return 0;
      }
      
      // Strict occasion alignment rules to prevent mismatch
      if (cleanOccasion === 'formal') {
        if (item.aesthetic === 'Activewear') return -45;
        if (item.aesthetic === 'Streetwear') return -25;
        
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('tshirt') || lowerName.includes('t-shirt') || lowerName.includes('hoodie') || lowerName.includes('sweatpants') || lowerName.includes('jogger') || lowerName.includes('shorts') || lowerName.includes('jersey') || lowerName.includes('activewear')) {
          return -35;
        }
      }
      
      if (cleanOccasion === 'sport') {
        if (item.aesthetic === 'Formal') return -45;
        
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('blazer') || lowerName.includes('suit') || lowerName.includes('oxford') || lowerName.includes('loafer') || lowerName.includes('trousers') || lowerName.includes('heels')) {
          return -35;
        }
      }
      
      if (cleanOccasion === 'party') {
        if (item.aesthetic === 'Activewear') return -25;
      }

      if (cleanOccasion === 'casual') {
        if (item.aesthetic === 'Formal') return -20;
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('blazer') || lowerName.includes('suit') || lowerName.includes('tuxedo')) {
          return -40; // Avoid blazers for casual outings like "school" or "cafe"
        }
      }
      
      return 0;
    };

    const checkOccasionMatch = (item, occasionId, customText) => {
      if (!customText) return item.occasion?.includes(occasionId);
      const query = customText.toLowerCase().trim();
      const cleanOccasionId = occasionId.toLowerCase();
      if (item.occasion?.includes(cleanOccasionId)) return true;
      if (item.occasion?.some(occ => query.includes(occ.toLowerCase()) || occ.toLowerCase().includes(query))) return true;
      if (item.name?.toLowerCase().includes(query)) return true;
      if (item.brand?.toLowerCase().includes(query)) return true;
      if (item.aesthetic?.toLowerCase().includes(query)) return true;
      return false;
    };

    const tops = clothes.filter((c) => c.category === 'tops');
    const bottoms = clothes.filter((c) => c.category === 'bottoms');
    const shoes = clothes.filter((c) => c.category === 'shoes');
    const outerwear = clothes.filter((c) => c.category === 'outerwear');
    const accessories = clothes.filter((c) => c.category === 'accessories');

    if (tops.length === 0 || bottoms.length === 0) {
      return [];
    }

    const currentTemp = weather.temp; // Rely strictly on real-time weather
    const isColdWeather = currentTemp < 15;

    const outfits = [];

    for (const top of tops) {
      for (const bottom of bottoms) {
        let score = 0;
        let reasons = [];

        // 1. Color harmony (weighted 40%)
        const colorScore = colorHarmonyScore(top.color?.primary, bottom.color?.primary);
        score += colorScore * 0.4;

        // 2. Aesthetic Cohesion (0-25)
        if (top.aesthetic && bottom.aesthetic && top.aesthetic === bottom.aesthetic) {
          score += 25;
          reasons.push(`${top.aesthetic} style cohesion`);
        } else {
          if ((top.aesthetic === 'Formal' && bottom.aesthetic === 'Activewear') ||
            (top.aesthetic === 'Activewear' && bottom.aesthetic === 'Formal')) {
            score -= 15;
          } else {
            score += 8;
          }
        }

        // 3. Occasion match
        const topOccasionMatch = checkOccasionMatch(top, params.occasion, customOccasion);
        const bottomOccasionMatch = checkOccasionMatch(bottom, params.occasion, customOccasion);

        if (topOccasionMatch && bottomOccasionMatch) {
          score += 20;
          reasons.push('perfect occasion match');
        } else if (topOccasionMatch || bottomOccasionMatch) {
          score += 10;
        } else {
          let aestheticOk = false;
          if (params.occasion === 'casual' && ['Casual', 'Streetwear', 'Minimal'].includes(top.aesthetic)) aestheticOk = true;
          if (params.occasion === 'formal' && ['Formal', 'Minimal'].includes(top.aesthetic)) aestheticOk = true;
          if (params.occasion === 'sport' && ['Activewear'].includes(top.aesthetic)) aestheticOk = true;
          if (params.occasion === 'party' && ['Streetwear', 'Casual'].includes(top.aesthetic)) aestheticOk = true;

          if (aestheticOk) {
            score += 12;
            reasons.push('aesthetic occasion match');
          }
        }

        // Apply strict occasion compatibility penalty
        const topCompatPenalty = checkItemOccasionCompat(top, params.occasion);
        const bottomCompatPenalty = checkItemOccasionCompat(bottom, params.occasion);
        score += topCompatPenalty + bottomCompatPenalty;

        // 4. Weather Season Match
        let activeSeason = '';
        if (currentTemp < 10) activeSeason = 'winter';
        else if (currentTemp >= 10 && currentTemp < 17) activeSeason = 'fall';
        else if (currentTemp >= 17 && currentTemp < 23) activeSeason = 'spring';
        else activeSeason = 'summer';

        const finalSeason = params.season || activeSeason;
        const topSeasonMatch = top.season?.includes(finalSeason);
        const bottomSeasonMatch = bottom.season?.includes(finalSeason);

        if (topSeasonMatch && bottomSeasonMatch) {
          score += 15;
          reasons.push('season appropriate');
        } else if (topSeasonMatch || bottomSeasonMatch) {
          score += 8;
        }

        // Pick best matching shoes
        let bestShoe = null;
        let bestShoeScore = -999;
        for (const shoe of shoes) {
          let shoeScore = colorHarmonyScore(shoe.color?.primary, top.color?.primary) * 0.3 +
            colorHarmonyScore(shoe.color?.primary, bottom.color?.primary) * 0.3;
          if (shoe.occasion?.includes(params.occasion)) shoeScore += 20;
          if (shoe.aesthetic === top.aesthetic) shoeScore += 10;
          
          shoeScore += checkItemOccasionCompat(shoe, params.occasion);
          
          if (shoeScore > bestShoeScore) {
            bestShoeScore = shoeScore;
            bestShoe = shoe;
          }
        }

        // Pick optional outerwear
        let bestOuterwear = null;
        let bestOwScore = -999;

        for (const ow of outerwear) {
          let owScore = colorHarmonyScore(ow.color?.primary, top.color?.primary) * 0.4 +
            colorHarmonyScore(ow.color?.primary, bottom.color?.primary) * 0.2;

          if (ow.season?.includes(finalSeason)) owScore += 25;
          if (ow.aesthetic === top.aesthetic) owScore += 15;
          
          owScore += checkItemOccasionCompat(ow, params.occasion);

          if (owScore > bestOwScore) {
            bestOwScore = owScore;
            bestOuterwear = ow;
          }
        }

        // If it's cold, require or highly boost if we found outerwear
        if (isColdWeather) {
          if (bestOuterwear && bestOwScore > 0) {
            score += 20;
            reasons.push('weather layering active');
          } else {
            score -= 15;
          }
        }

        // Pick optional accessory
        let bestAccessory = null;
        let bestAccScore = -999;
        for (const acc of accessories) {
          let accScore = colorHarmonyScore(acc.color?.primary, top.color?.primary) * 0.5;
          if (acc.occasion?.includes(params.occasion)) accScore += 20;
          if (acc.aesthetic === top.aesthetic) accScore += 10;
          
          accScore += checkItemOccasionCompat(acc, params.occasion);
          
          if (accScore > bestAccScore) {
            bestAccScore = accScore;
            bestAccessory = acc;
          }
        }

        // Calculate final score bounded [40, 99]
        let finalScore = Math.min(Math.round(score), 99);
        if (finalScore < 40) finalScore = 40;

        // Determine main reason
        let mainReason = 'Aesthetic Alignment';
        if (reasons.includes('weather layering active')) mainReason = 'Weather Protective Layering';
        else if (colorScore >= 85) mainReason = 'Exquisite Color Harmony';
        else if (reasons.includes('perfect occasion match')) mainReason = `Perfect ${params.occasion.charAt(0).toUpperCase() + params.occasion.slice(1)} Match`;
        else if (reasons.length > 0) mainReason = reasons[0];

        const isOuterwearAppropriate = isColdWeather || params.season === 'winter' || params.season === 'fall' || params.occasion === 'formal';
        const isFormalOuterwear = bestOuterwear && (bestOuterwear.aesthetic === 'Formal' || bestOuterwear.name?.toLowerCase().includes('blazer') || bestOuterwear.name?.toLowerCase().includes('suit') || bestOuterwear.name?.toLowerCase().includes('tuxedo'));
        const outerwearAllowed = isOuterwearAppropriate && !(isFormalOuterwear && (params.occasion === 'casual' || params.occasion === 'sport'));

        const items = { top, bottom };
        if (bestShoe && bestShoeScore > 0) items.shoes = bestShoe;
        if (bestOuterwear && outerwearAllowed && bestOwScore > 40) items.outerwear = bestOuterwear;
        if (bestAccessory && bestAccScore > 0) items.accessory = bestAccessory;

        outfits.push({
          items,
          score: finalScore,
          reason: mainReason,
          colorNote: getColorNote(top.color?.primary, bottom.color?.primary)
        });
      }
    }

    outfits.sort((a, b) => b.score - a.score);

    const seen = new Set();
    const unique = [];
    for (const outfit of outfits) {
      const key = `${outfit.items.top._id}-${outfit.items.bottom._id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(outfit);
      }
      if (unique.length >= 5) break;
    }

    return unique;
  };

  const checkMissingProperGarments = () => {
    const occasionId = params.occasion || 'casual';
    const cleanOccasion = occasionId.toLowerCase().trim();

    const isProper = (item) => {
      if (item.occasion?.map(o => o.toLowerCase()).includes(cleanOccasion)) {
        return true;
      }
      if (cleanOccasion === 'formal') {
        if (item.aesthetic === 'Formal' || item.aesthetic === 'Minimal') {
          const lowerName = item.name.toLowerCase();
          if (!lowerName.includes('tshirt') && !lowerName.includes('t-shirt') && !lowerName.includes('hoodie') && !lowerName.includes('sweatpants') && !lowerName.includes('jogger') && !lowerName.includes('shorts') && !lowerName.includes('jersey') && !lowerName.includes('activewear')) {
            return true;
          }
        }
      } else if (cleanOccasion === 'sport') {
        if (item.aesthetic === 'Activewear') return true;
      } else if (cleanOccasion === 'party') {
        if (['Streetwear', 'Casual', 'Formal'].includes(item.aesthetic)) return true;
      } else if (cleanOccasion === 'casual') {
        if (['Casual', 'Streetwear', 'Minimal'].includes(item.aesthetic)) return true;
      }
      return false;
    };

    const tops = clothes.filter((c) => c.category === 'tops');
    const bottoms = clothes.filter((c) => c.category === 'bottoms');
    const shoes = clothes.filter((c) => c.category === 'shoes');

    const missing = [];
    if (tops.length > 0 && !tops.some(isProper)) {
      missing.push({ category: 'Tops', label: cleanOccasion === 'sport' ? 'activewear t-shirts or tops' : cleanOccasion === 'party' ? 'party tops or shirts' : 'formal shirts or blazers' });
    }
    if (bottoms.length > 0 && !bottoms.some(isProper)) {
      missing.push({ category: 'Bottoms', label: cleanOccasion === 'sport' ? 'activewear joggers or training shorts' : cleanOccasion === 'party' ? 'party trousers or dark jeans' : 'formal trousers or chinos' });
    }
    if (shoes.length > 0 && !shoes.some(isProper)) {
      missing.push({ category: 'Shoes', label: cleanOccasion === 'sport' ? 'athletic or running shoes' : cleanOccasion === 'party' ? 'party shoes or heels' : 'formal dress shoes or loafers' });
    }

    return missing;
  };

  const generateAIAdviceText = (topOutfit, hasWarnings = false) => {
    if (!topOutfit) return '';

    const { top, bottom, outerwear, shoes, accessory } = topOutfit.items;
    const occasionTitle = customOccasion || (params.occasion.charAt(0).toUpperCase() + params.occasion.slice(1));
    const colorNote = topOutfit.colorNote;

    if (hasWarnings) {
      let text = `For your ${occasionTitle} outing in ${locationName}, pairing the ${top.name} with the ${bottom.name} may serve as a temporary fallback coordinate (${colorNote.toLowerCase()}). `;
      
      if (outerwear || shoes || accessory) {
        const details = [];
        if (outerwear) details.push(`layering with the ${outerwear.name}`);
        if (shoes) details.push(`anchoring with the ${shoes.name}`);
        if (accessory) details.push(`finishing with the ${accessory.name}`);
        text += `Completing this coordinate by ${details.join(', and ')} may help adapt the look, though it may not fully suit the dress code for this outgoing.`;
      } else {
        text += `However, please note that this temporary combination may not fully suit the dress code for this outgoing.`;
      }
      return text;
    }

    let text = `For your ${occasionTitle} outing in ${locationName}, pairing the ${top.name} with the ${bottom.name} creates an elegant, visually balanced ${top.aesthetic.toLowerCase()} silhouette (${colorNote.toLowerCase()}). `;
    
    if (outerwear || shoes || accessory) {
      const details = [];
      if (outerwear) details.push(`layering with the ${outerwear.name}`);
      if (shoes) details.push(`anchoring with the ${shoes.name}`);
      if (accessory) details.push(`finishing with the ${accessory.name}`);
      text += `Completing this coordinate by ${details.join(', and ')} is highly optimized for the current ${weather.temp}°C ${weather.condition.toLowerCase()} conditions.`;
    } else {
      text += `This coordinate is highly optimized for the current ${weather.temp}°C ${weather.condition.toLowerCase()} conditions.`;
    }

    return text;
  };

  // Load weather, customized avatar and fit adjustments from localStorage
  useEffect(() => {
    // 1. Weather fetching with local cache check and IP geolocation lookup
    const cachedLocal = localStorage.getItem('zyntra_local_weather');
    if (cachedLocal) {
      const parsed = JSON.parse(cachedLocal);
      // If cache is less than 30 minutes old, load it instantly
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        setLocalWeather(parsed);
        setWeather({ temp: parsed.temp, condition: parsed.condition });
        setLocationName(parsed.city);
        // Silent update in background
        (async () => {
          try {
            const locRes = await fetch('https://ipapi.co/json/');
            if (!locRes.ok) return;
            const locData = await locRes.json();
            if (locData && locData.latitude && locData.longitude) {
              const city = locData.city || 'Local Area';
              const wData = await fetchRealWeatherHelper(locData.latitude, locData.longitude);
              const newLocal = { ...wData, city, timestamp: Date.now() };
              setLocalWeather(newLocal);
              localStorage.setItem('zyntra_local_weather', JSON.stringify(newLocal));
            }
          } catch (err) {
            console.warn('Silent local weather update failed:', err);
          }
        })();
      } else {
        fetchWeatherByIP();
      }
    } else {
      fetchWeatherByIP();
    }

    // 2. Load avatar settings
    const stored = localStorage.getItem('zyntra_avatar');
    if (stored) {
      setAvatarSettings(JSON.parse(stored));
    } else {
      setAvatarSettings({
        gender: 'male',
        skin: 'olive',
        hair: 'messy',
        hairColor: 'black',
        expression: 'smile'
      });
    }

    // 3. Load fit adjustments
    const storedFits = localStorage.getItem('zyntra_fits');
    if (storedFits) {
      setFitSettings(JSON.parse(storedFits));
    }
  }, [tryOnOutfit]);

  // Load user clothes from backend
  useEffect(() => {
    const fetchClothes = async () => {
      try {
        setFetchingClothes(true);
        const { data } = await clothingAPI.getAll();
        setClothes(data.clothes || []);
      } catch (err) {
        console.error('Failed to fetch user clothes:', err);
      } finally {
        setFetchingClothes(false);
      }
    };
    fetchClothes();
  }, []);

  // Reset similarity states when closing try-on modal
  useEffect(() => {
    if (!tryOnOutfit) {
      setSelectedSimilarityItem(null);
      setSimilarItems([]);
    }
  }, [tryOnOutfit]);

  const fetchLLMCritique = async (topOutfit) => {
    if (!topOutfit) return;

    // If they lack proper garments, bypass LLM API and use local fallback advice with warnings
    if (checkMissingProperGarments().length > 0) {
      setStylistCritique(generateAIAdviceText(topOutfit, true));
      setCritiqueLoading(false);
      return;
    }

    setCritiqueLoading(true);
    setStylistCritique('');
    try {
      const { top, bottom, outerwear, shoes, accessory } = topOutfit.items;
      const response = await recommendAPI.getStylistCritique({
        top,
        bottom,
        outerwear,
        shoes,
        accessory,
        temp: weather.temp,
        condition: weather.condition,
        occasion: customOccasion || params.occasion
      });
      if (response.data && response.data.critique) {
        setStylistCritique(response.data.critique);
      } else {
        throw new Error('No critique returned');
      }
    } catch (err) {
      console.warn('Hugging Face LLM Stylist failed/offline, fallback active:', err.message);
      setStylistCritique(generateAIAdviceText(topOutfit));
    } finally {
      setCritiqueLoading(false);
    }
  };

  const fetchSimilarItems = async (item) => {
    if (!item) return;
    setSelectedSimilarityItem(item);
    setSimilarLoading(true);
    setSimilarItems([]);
    try {
      const response = await clothingAPI.getSimilar(item._id);
      if (response.data && response.data.similar) {
        setSimilarItems(response.data.similar);
      }
    } catch (err) {
      console.error('Failed to fetch similar items:', err);
      error('Failed to find similar visual style pairs.');
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleSwapItem = (slot, newItem) => {
    if (!tryOnOutfit || !newItem) return;

    // Normalize DB categories to slot names
    let slotName = slot;
    if (slot === 'tops') slotName = 'top';
    if (slot === 'bottoms') slotName = 'bottom';

    const updatedOutfit = {
      ...tryOnOutfit,
      [slotName]: newItem
    };
    setTryOnOutfit(updatedOutfit);
    success(`Swapped in ${newItem.name} as your ${slotName}!`);
    fetchSimilarItems(newItem);
  };

  // Handle auto rotation of try-on model
  useEffect(() => {
    let interval = null;
    if (autoRotate && tryOnOutfit) {
      interval = setInterval(() => {
        setAvatarRotation((prev) => (prev + 30) % 360);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [autoRotate, tryOnOutfit]);

  // Debounced API call to analyze destination for validation and dynamic guidance
  useEffect(() => {
    if (!customOccasion.trim()) {
      setDestinationAnalysis(null);
      setAnalysisError(null);
      return;
    }

    const query = customOccasion.toLowerCase().trim();
    
    // 0. Length check to prevent layout issues or database overload
    if (query.length > 80) {
      setAnalysisError("Please enter a shorter, more specific location (maximum 80 characters).");
      setDestinationAnalysis(null);
      return;
    }

    // 1. Off-topic/inappropriate location keywords check
    const offTopicKeywords = ['toilet', 'bathroom', 'restroom', 'washroom', 'wc', 'poop', 'pee', 'shit', 'urinal', 'garbage', 'trash', 'dumpster', 'sewer', 'sewage', 'lavatory', 'commode'];
    const isOffTopic = offTopicKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'i');
      return regex.test(query);
    });

    if (isOffTopic) {
      setAnalysisError(`"${customOccasion}" is not a suitable outing location for Zyntra wardrobe styling. Please enter a standard location or activity (e.g. Cafe, Office, Gym, Party, Dinner).`);
      setDestinationAnalysis(null);
      return;
    }

    // 2. Letters check - must have at least 2 letters
    const letterCount = (query.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 2) {
      setAnalysisError(`"${customOccasion}" does not contain a valid location name. Please enter a real location or activity containing alphabetical letters.`);
      setDestinationAnalysis(null);
      return;
    }

    // 3. Vowelless check across the whole query
    const hasAnyVowel = /[aeiouy]/i.test(query);
    if (!hasAnyVowel) {
      setAnalysisError(`"${customOccasion}" seems to be gibberish or unrecognized. Please enter a real location or activity.`);
      setDestinationAnalysis(null);
      return;
    }

    // 4. Gibberish check on individual words (cleaning special characters first)
    const words = query.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length >= 2) {
        const hasVowels = /[aeiouy]/i.test(cleanWord);
        if (!hasVowels) {
          setAnalysisError(`"${customOccasion}" seems to be gibberish or unrecognized. Please enter a real location or activity (e.g., Office, Gym, Cafe with friends).`);
          setDestinationAnalysis(null);
          return;
        }
      }
    }

    // 5. Too many repeated characters check
    if (/(.)\1{3,}/.test(query)) {
      setAnalysisError(`"${customOccasion}" contains too many repeated characters. Please enter a real location or activity.`);
      setDestinationAnalysis(null);
      return;
    }

    // 6. Consonant clusters check within individual words
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      const hasCluster = /[^aeiouy]{5,}/i.test(cleanWord);
      if (hasCluster) {
        setAnalysisError(`"${customOccasion}" contains unrecognized consonant combinations. Please enter a real location or activity.`);
        setDestinationAnalysis(null);
        return;
      }
    }

    const delayDebounceFn = setTimeout(async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const res = await recommendAPI.analyzeDestination({
          destination: customOccasion,
          temp: weather.temp,
          condition: weather.condition,
          season: params.season
        });
        
        if (res.data) {
          if (res.data.valid === false) {
            setAnalysisError(res.data.message || 'Invalid destination. Please enter a real location or activity.');
            setDestinationAnalysis(null);
          } else {
            setDestinationAnalysis(res.data);
            setAnalysisError(null);
            if (res.data.category) {
              setParams(prev => ({ ...prev, occasion: res.data.category }));
            }
          }
        }
      } catch (err) {
        console.warn('Destination analysis failed, using local fallback:', err);
        // Generate local template styling guidance so validation still works if API/LLM fails
        let category = 'casual';
        if (query.includes('gym') || query.includes('workout') || query.includes('run') || query.includes('sport') || query.includes('active') || query.includes('train') || query.includes('trek') || query.includes('hike') || query.includes('climb') || query.includes('football') || query.includes('soccer') || query.includes('fit')) {
          category = 'sport';
        } else if (query.includes('office') || query.includes('work') || query.includes('business') || query.includes('meeting') || query.includes('interview') || query.includes('conference') || query.includes('formal') || query.includes('suit')) {
          category = 'formal';
        } else if (query.includes('party') || query.includes('club') || query.includes('night') || query.includes('bar') || query.includes('pub') || query.includes('celebrat') || query.includes('festive') || query.includes('dance') || query.includes('concert')) {
          category = 'party';
        }

        let advice = `Perfect day for a casual trip to "${customOccasion}". `;
        const isCold = weather.temp < 15;
        const isRainy = weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('shower');

        if (category === 'formal') {
          advice = `For your formal event at "${customOccasion}", dress professionally. ${isCold ? `Under ${weather.temp}°C conditions, we suggest a tailored trench coat or thick blazer layered over a structured shirt, paired with smart trousers and premium leather shoes.` : isRainy ? `With wet weather outdoors, layer a breathable blazer over your shirt and wear water-resistant dress boots to stay clean and sharp.` : `Opt for a lightweight linen or cotton blazer, matching trousers, and clean oxfords to stay cool yet elegant.`}`;
        } else if (category === 'sport') {
          advice = `Heading out for sports/activewear to "${customOccasion}". ${isCold ? `At a chilly ${weather.temp}°C, a high-performance thermal compression top paired with tech fleece joggers and trainers is ideal.` : isRainy ? `Under wet conditions, wear a water-repellent windbreaker, sweat-wicking active pants, and grippy running shoes.` : `Keep it light with a breathable athletic tee, sweat-wicking training shorts, and your favorite active sneakers.`}`;
        } else if (category === 'party') {
          advice = `Getting ready for a night out/party at "${customOccasion}"! ${isCold ? `Stay warm yet stylish in a premium leather jacket layered over a smart fitted top, paired with dark jeans or a chic skirt and boots.` : isRainy ? `Keep your look pristine with an aesthetic outer shell jacket, tailored bottoms, and stylish leather footwear to resist the elements.` : `Opt for a sleek statement shirt, tailored trousers or shorts, and trendy sneakers to stand out under the lights.`}`;
        } else {
          advice = `Perfect day for a casual trip to "${customOccasion}". ${isCold ? `For the ${weather.temp}°C chilly weather, cozy up in a warm knitted sweater or hoodie, styled with comfortable denim jeans and casual trainers.` : isRainy ? `Bring along a stylish water-resistant windbreaker or light utility jacket over a comfortable tee, paired with casual boots.` : `Enjoy the clear day in a classic graphic tee, casual cargo pants or shorts, and minimal canvas sneakers.`}`;
        }

        setDestinationAnalysis({ valid: true, category, advice });
        setAnalysisError(null);
        setParams(prev => ({ ...prev, occasion: category }));
      } finally {
        setAnalysisLoading(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [customOccasion, weather.temp, weather.condition, params.season]);


  const fetchRealWeatherHelper = async (lat, lon) => {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max&timezone=auto`);
    if (!res.ok) throw new Error('Forecast API failed');
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;

    let condition = 'Clear sky';
    if (code > 0 && code <= 3) condition = 'Partly Cloudy';
    else if (code >= 45 && code <= 48) condition = 'Foggy';
    else if (code >= 51 && code <= 67) condition = 'Rainy';
    else if (code >= 71 && code <= 77) condition = 'Snowy';
    else if (code >= 80 && code <= 82) condition = 'Showers';
    else if (code >= 95) condition = 'Thunderstorm';

    let forecast = [];
    if (data.daily && data.daily.time && data.daily.temperature_2m_max) {
      const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      };
      forecast = data.daily.time.slice(1, 6).map((time, idx) => ({
        day: getDayName(time),
        temp: Math.round(data.daily.temperature_2m_max[idx + 1])
      }));
    }

    return { temp, condition, forecast };
  };

  const fetchRealWeather = async (lat, lon, detectedCity = null) => {
    try {
      setWeatherLoading(true);
      const wData = await fetchRealWeatherHelper(lat, lon);
      setWeather(wData);

      const city = detectedCity || (() => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return timezone ? timezone.split('/').pop().replace('_', ' ') : 'Local Area';
      })();
      setLocationName(city);

      // Keep localWeather updated
      setLocalWeather({ ...wData, city, timestamp: Date.now() });
    } catch (e) {
      console.warn('Weather API failed:', e.message);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchWeatherByIP = async () => {
    try {
      setWeatherLoading(true);
      const locRes = await fetch('https://ipapi.co/json/');
      if (!locRes.ok) throw new Error('IP lookup response not OK');
      const locData = await locRes.json();
      
      if (locData && locData.latitude && locData.longitude) {
        const city = locData.city || 'Local Area';
        const wData = await fetchRealWeatherHelper(locData.latitude, locData.longitude);
        const newLocal = { ...wData, city, timestamp: Date.now() };
        setLocalWeather(newLocal);
        localStorage.setItem('zyntra_local_weather', JSON.stringify(newLocal));
        
        // Update active weather if no destination is currently active
        if (!destinationWeather) {
          setWeather(wData);
          setLocationName(city);
        }
        return { success: true, city };
      } else {
        throw new Error('Invalid IP coordinates');
      }
    } catch (err) {
      console.warn('IP location fetch failed, using fallback:', err.message);
      // Safe fallback
      const fallbackData = { temp: 22, condition: 'Clear sky' };
      setLocalWeather({ ...fallbackData, city: 'San Francisco', timestamp: Date.now() });
      if (!destinationWeather) {
        setWeather(fallbackData);
        setLocationName('San Francisco');
      }
      return { success: false };
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchDestinationWeather = async (cityName) => {
    if (!cityName || !cityName.trim()) {
      handleClearDestination();
      return;
    }
    const cleanCity = cityName.trim();
    if (cleanCity.length > 80) {
      error("City name is too long (maximum 80 characters).");
      return;
    }
    const letterCount = (cleanCity.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 2) {
      error("Please enter a valid city name containing letters.");
      return;
    }
    try {
      setWeatherLoading(true);
      const geocodeRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      if (!geocodeRes.ok) throw new Error('Geocoding query failed');
      const geocodeData = await geocodeRes.json();

      if (geocodeData.results && geocodeData.results.length > 0) {
        const result = geocodeData.results[0];
        const lat = result.latitude;
        const lon = result.longitude;
        const resolvedName = result.country ? `${result.name}, ${result.country}` : result.name;

        const wData = await fetchRealWeatherHelper(lat, lon);
        const destObj = { ...wData, city: resolvedName };
        
        setDestinationWeather(destObj);
        setWeather(wData);
        setLocationName(resolvedName);
        success(`Target weather adjusted for: ${resolvedName}`);
      } else {
        error(`Could not locate: "${cityName}"`);
      }
    } catch (err) {
      console.error('Destination geocode error:', err);
      error('Failed to resolve target weather coordinates.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSearchDestination = () => {
    if (destinationQuery.trim()) {
      fetchDestinationWeather(destinationQuery);
    }
  };

  const handleClearDestination = () => {
    setDestinationQuery('');
    setDestinationWeather(null);
    setWeather({ temp: localWeather.temp, condition: localWeather.condition, forecast: localWeather.forecast || [] });
    setLocationName(localWeather.city);
    success('Styling location reset to home coordinates.');
  };

  const handleFetchLiveWeather = async () => {
    setWeatherLoading(true);
    const result = await fetchWeatherByIP();
    if (result && result.success) {
      success(`Refreshed home location: ${result.city}! 📍`);
    } else {
      error('Failed to update home location.');
    }
  };

  const handleGenerate = () => {
    setLoading(true);
    setHasSearched(true);
    setTryOnOutfit(null);
    setStylistCritique('');

    // Simulate AI thinking delay for premium feel
    setTimeout(async () => {
      try {
        const localRecs = generateLocalRecommendations();
        setRecommendations(localRecs);
        
        // Calculate missing proper garments
        const missing = checkMissingProperGarments();
        setMissingProperGarments(missing);

        if (localRecs.length > 0) {
          success(`Generated ${localRecs.length} matching suggestions for a ${params.occasion} day!`);
          fetchLLMCritique(localRecs[0]);
        } else {
          error('Not enough items in your closet to generate styling.');
        }
      } catch (err) {
        console.error(err);
        error('Failed to run Closet AI matchmaker');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  const updateFitSetting = (itemId, param, val) => {
    if (!itemId) return;
    const current = fitSettings[itemId] || { x: 0, y: 0, scale: 100 };
    const updatedItem = { ...current, [param]: val };
    const updatedAll = { ...fitSettings, [itemId]: updatedItem };
    setFitSettings(updatedAll);
    localStorage.setItem('zyntra_fits', JSON.stringify(updatedAll));
  };

  const resetItemFit = (itemId) => {
    if (!itemId) return;
    const updatedAll = { ...fitSettings };
    delete updatedAll[itemId];
    setFitSettings(updatedAll);
    localStorage.setItem('zyntra_fits', JSON.stringify(updatedAll));
    success('Fit settings reset!');
  };

  // const activeWeather = simulatedWeather ? WEATHER_MOCK[simulatedWeather] : weather;
  const activeWeather = weather; // Rely strictly on real-time weather

  // Active outfit slot item for fitter panel
  const activeFitterItem = tryOnOutfit ? tryOnOutfit[fitActiveSlot] : null;
  const activeFitterFit = activeFitterItem ? (fitSettings[activeFitterItem._id] || { x: 0, y: 0, scale: 100 }) : { x: 0, y: 0, scale: 100 };

  return (
    <div className="main-content" id="recommend-page">
      <div className="container">
        <div className="recommend-header animate-fade-in">
          <div className="recommend-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>Your Runway AI Stylist</h1>
            <div className="ai-badge" style={{ margin: 0 }}>
              <div className="ai-dot" />
              Zyntra Runway Engine v2
            </div>
          </div>
          <p className="dashboard-subtitle">Let Zyntra styling algorithms build custom wardrobe suggestions for your next event.</p>
        </div>

        {/* WEATHER BAR & OVERRIDES */}
        <div className="weather-dashboard glass-card animate-fade-in">
          <div className="weather-main-panel">
            <div className="weather-current">
              <div className="weather-temp-badge">
                {weather.temp}°C
              </div>
              <div className="weather-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="weather-title-status">
                    {destinationWeather ? '📍 Destination Weather *' : '🏠 Current Location Weather *'}
                  </span>
                  {!destinationWeather && (
                    <button
                      type="button"
                      onClick={handleFetchLiveWeather}
                      disabled={weatherLoading}
                      className="btn btn-ghost btn-fetch-live"
                      title="Update local weather using IP lookup"
                    >
                      {weatherLoading ? '⏳ updating...' : '📍 Refresh'}
                    </button>
                  )}
                </div>
                <span className="weather-desc-location">{locationName}</span>
                <span className="weather-desc-condition">{weather.condition}</span>
                {weather.forecast && weather.forecast.length > 0 && (
                  <div className="weather-forecast-row">
                    {weather.forecast.map((f, i) => (
                      <div key={i} className="forecast-pill">
                        <span className="forecast-day-name">{f.day}</span>
                        <span className="forecast-day-temp">{f.temp}°C</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <WeatherVisualizer condition={weather.condition} />
          </div>

          <div className="weather-controls-panel">
            <div className="destination-search-box">
              <label className="search-label">Traveling somewhere else?</label>
              <div className="search-input-wrap">
                <div className="search-input-inner">
                  <input 
                    type="text" 
                    placeholder="Search city (e.g. Tokyo, Paris)..." 
                    value={destinationQuery}
                    onChange={(e) => setDestinationQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchDestination(); }}
                    className="destination-search-input"
                  />
                  {destinationQuery && (
                    <button 
                      onClick={handleClearDestination} 
                      className="btn-clear-dest-x"
                      title="Clear destination"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button 
                  onClick={handleSearchDestination} 
                  disabled={weatherLoading} 
                  className="btn btn-primary btn-search-dest"
                >
                  Search
                </button>
              </div>
              <div className="weather-home-wrap" style={{ height: '24px', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                {destinationWeather && (
                  <div className="weather-home-below-search animate-fade-in" style={{ margin: 0 }}>
                    🏠 Home: {localWeather.city} — {localWeather.temp}°C ({localWeather.condition})
                  </div>
                )}
              </div>
            </div>
            <span className="weather-disclaimer">
              * Real-time weather forecasts are estimates and subject to API latency, geocoding offsets, or localized microclimatic variations.
            </span>
          </div>
        </div>

        {isWardrobeLow && (
          <div className="wardrobe-low-warning-box">
            <span className="wardrobe-low-warning-icon">⚠️</span>
            <div className="wardrobe-low-warning-text">
              <h4 className="wardrobe-low-warning-title">Limited Digital Wardrobe Variety Detected</h4>
              <p className="wardrobe-low-warning-desc">
                Your digital wardrobe contains only <strong>{topsCount} Top(s)</strong> and <strong>{bottomsCount} Bottom(s)</strong>.
                Because of this cold-start state, the Closet AI matchmaking engine is forced to recommend the exact same combination for all purposes.
                Go to the <Link to="/upload">Upload page</Link> to scan distinct clothing items (like formal blazers, sports jerseys, or casual hoodies) to enable customized, occasion-tailored outfit suggestions! 🚀
              </p>
            </div>
          </div>
        )}

        <div className="recommend-controls glass-card animate-slide-up">
          {/* Destination Selection with Custom Text Input */}
          <div className="control-group">
            <label>Where are you going today? *</label>
            <div className="destination-input-container" style={{ marginBottom: '20px' }}>
              <input
                type="text"
                className="destination-custom-input"
                placeholder="e.g. Cafe & Friends, Office, Gym, Beach Party..."
                value={customOccasion}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomOccasion(val);
                  // Dynamic synchronization: match input to suggestion card
                  const matched = DESTINATIONS.find(
                    (d) => d.label.toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matched) {
                    setParams({ ...params, occasion: matched.id });
                  }
                }}
              />
            </div>
            <div className="destination-grid">
              {DESTINATIONS.map((dest) => {
                const active = params.occasion === dest.id && customOccasion.toLowerCase().trim() === dest.label.toLowerCase().trim();
                return (
                  <div
                    key={dest.id}
                    className={`destination-card glass-card ${active ? 'active' : ''}`}
                    onClick={() => {
                      setCustomOccasion(dest.label);
                      setParams({ ...params, occasion: dest.id });
                    }}
                  >
                    <div className="destination-icon">{dest.icon}</div>
                    <div className="destination-info">
                      <h4 className="destination-title">{dest.label}</h4>
                      <p className="destination-desc">{dest.desc}</p>
                    </div>
                    {active && <div className="destination-indicator" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specific Season Filter */}
          <div className="control-group">
            <label>Specific Season Filter (Optional)</label>
            <div className="chip-group">
              <button
                className={`chip ${params.season === '' ? 'active' : ''}`}
                onClick={() => setParams({ ...params, season: '' })}
              >
                Auto (Based On Weather)
              </button>
              {['spring', 'summer', 'fall', 'winter'].map((season) => (
                <button
                  key={season}
                  className={`chip ${params.season === season ? 'active' : ''}`}
                  onClick={() => setParams({ ...params, season: season })}
                >
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Validation and Styling Advisory Guide */}
          {(analysisLoading || analysisError || destinationAnalysis) && (
            <div className="destination-feedback-wrapper" style={{ marginTop: '20px', marginBottom: '20px' }}>
              {analysisLoading && (
                <div className="destination-advice-card loading glass-card">
                  <div className="skeleton-line title" />
                  <div className="skeleton-line paragraph" />
                  <div className="skeleton-line paragraph short" />
                </div>
              )}

              {!analysisLoading && analysisError && (
                <div className="destination-warning-card glass-card">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-content">
                    <h4>Destination Unrecognized</h4>
                    <p>{analysisError}</p>
                  </div>
                </div>
              )}

              {!analysisLoading && !analysisError && destinationAnalysis && (
                <div className="destination-advice-card glass-card animate-fade-in">
                  <div className="advice-header">
                    <span className="advice-badge">✈️ Zyntra Travel Prep Guide</span>
                    <span className="advice-category">Category: {destinationAnalysis.category}</span>
                  </div>
                  <div className="advice-body">
                    <p className="advice-text">{destinationAnalysis.advice}</p>
                    <div className="advice-weather-summary">
                      <span className="weather-pill">🌡️ {weather.temp}°C</span>
                      <span className="weather-pill">☁️ {weather.condition}</span>
                      {params.season && <span className="weather-pill">🍂 {params.season}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg btn-generate"
            onClick={handleGenerate}
            disabled={loading || !!analysisError || analysisLoading}
          >
            {loading ? <span className="loader-spinner" style={{ width: 20, height: 20 }} /> : <><IconCpu /> Generate Styling</>}
          </button>
        </div>

        {loading ? (
          <div className="recommend-loading">
            <div className="ai-scanning">
              <div className="scan-line" />
              <IconCpu />
            </div>
            <p className="font-heading">Zyntra styling layers aligning...</p>
          </div>
        ) : hasSearched && recommendations.length > 0 ? (
          <div className="recommend-results animate-fade-in">
            {/* CLOSET AI ADVISOR CHAT CARD */}
            <div className="closet-ai-advisor glass-card animate-slide-up">
              <div className="advisor-header">
                <div className="advisor-avatar-container">
                  <div className="advisor-avatar-glow" />
                  <span className="advisor-avatar-emoji">🧠</span>
                </div>
                <div className="advisor-meta">
                  <span className="advisor-tag">CLOSET AI STYLIST</span>
                  <h3 className="advisor-title">Personalized Fashion Advice</h3>
                </div>
              </div>
              <div className="advisor-content">
                {missingProperGarments.length > 0 && (
                  <div className="missing-garments-alert animate-fade-in" style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '14px',
                    fontSize: '0.825rem',
                    color: '#f87171',
                    textAlign: 'left'
                  }}>
                    <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚠️ Wardrobe Update Recommended:</span>
                    <span>
                      Zyntra noticed you do not have any proper {params.occasion} items in your closet for: <strong>{missingProperGarments.map(m => m.category).join(', ')}</strong>. 
                      Please go to the <Link to="/upload" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Upload page</Link> and scan suitable garments (such as {missingProperGarments.map(m => m.label).join(' / ')}).
                    </span>
                  </div>
                )}
                {critiqueLoading ? (
                  <div className="advisor-loading-wrapper">
                    <div className="advisor-typing-indicator" style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
                      <span style={{ width: '8px', height: '8px', background: 'var(--accent-violet)', borderRadius: '50%', display: 'inline-block' }}></span>
                      <span style={{ width: '8px', height: '8px', background: 'var(--accent-violet)', borderRadius: '50%', display: 'inline-block' }}></span>
                      <span style={{ width: '8px', height: '8px', background: 'var(--accent-violet)', borderRadius: '50%', display: 'inline-block' }}></span>
                    </div>
                    <p className="advisor-loading-text" style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Zyntra LLM Stylist drafting review...</p>
                  </div>
                ) : (
                  <p className="advisor-text">
                    {stylistCritique || generateAIAdviceText(recommendations[0], missingProperGarments.length > 0)}
                  </p>
                )}
              </div>
            </div>

            <h3 className="section-title" style={{ margin: '32px 0 16px 0', fontSize: '1.25rem', fontWeight: 800 }}>Recommended Closet Combinations</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {recommendations.map((rec, i) => (
                <div key={i} className="rec-card glass-card animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="rec-header">
                    <div className="rec-score">
                      <IconStar />
                      <span>{rec.score}% Style Match</span>
                    </div>
                    <div className="rec-header-actions">
                      <button
                        className="btn btn-primary btn-sm btn-tryon"
                        onClick={() => {
                          setTryOnModalOutfit(rec.items);
                        }}
                        title="Open AI Dressing Room for this outfit"
                      >
                        ✨ Try It On
                      </button>
                    </div>
                  </div>

                  <div className="rec-reason">
                    <span className="badge badge-violet">{rec.reason}</span>
                  </div>

                  <div className="rec-color-note">
                    <p>{rec.colorNote}</p>
                  </div>

                  <div className="rec-items">
                    {['top', 'bottom', 'outerwear', 'shoes', 'accessory'].map((slot) => {
                      if (!rec.items[slot]) return null;
                      return (
                        <div key={slot} className="rec-item glass-card">
                          <span className="rec-item-label">{slot}</span>
                          <div className="rec-item-img-wrap" style={{ borderColor: rec.items[slot].color?.primary || 'var(--border-subtle)' }}>
                            <DressingItemImage
                              src={`http://localhost:5000${rec.items[slot].imageUrl}`}
                              alt={rec.items[slot].name || slot}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div className="rec-item-details">
                            <span className="rec-item-name" title={rec.items[slot].name}>{rec.items[slot].name}</span>
                            {rec.items[slot].brand && (
                              <span className="rec-item-brand">{rec.items[slot].brand}</span>
                            )}
                            <div className="rec-item-meta-tags">
                              {rec.items[slot].aesthetic && (
                                <span className="meta-tag aesthetic">{rec.items[slot].aesthetic}</span>
                              )}
                              {rec.items[slot].fit && (
                                <span className="meta-tag fit">{rec.items[slot].fit}</span>
                              )}
                              {rec.items[slot].pattern && (
                                <span className="meta-tag pattern">{rec.items[slot].pattern}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasSearched ? (
          <div className="empty-state wardrobe-lacking-state animate-fade-in glass-card">
            <div className="warning-card-header">
              <span className="warning-emoji">🚨</span>
              <h3 className="empty-title">Wardrobe Refresh Required</h3>
            </div>
            <p className="empty-subtitle">
              You lack the clothes suitable for this trip. Please refresh your wardrobe with new clothes that can suit this.
            </p>
            <div className="ecommerce-redirect-section">
              <p className="ecommerce-prompt">
                If you need, I can toggle you to any of the e-commerce platforms to discover matching outfits:
              </p>
              <div className="ecommerce-platforms-grid">
                <a 
                  href="https://www.amazon.in/s?k=clothing" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ecommerce-card amazon"
                  title="Shop clothing on Amazon"
                >
                  <LogoAmazon />
                  <span className="shop-arrow">→</span>
                </a>
                <a 
                  href="https://www.flipkart.com/clothing-and-accessories/pr?sid=clo" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ecommerce-card flipkart"
                  title="Shop clothing on Flipkart"
                >
                  <LogoFlipkart />
                  <span className="shop-arrow">→</span>
                </a>
                <a 
                  href="https://www.myntra.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ecommerce-card myntra"
                  title="Shop clothing on Myntra"
                >
                  <LogoMyntra />
                  <span className="shop-arrow">→</span>
                </a>
                <a 
                  href="https://www.ajio.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ecommerce-card ajio"
                  title="Shop clothing on Ajio"
                >
                  <LogoAjio />
                  <span className="shop-arrow">→</span>
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* AVATAR TRY ON MODAL CANVAS (Disabled as planned future premium upgrade)
      {tryOnOutfit && avatarSettings && (
        <div className="modal-overlay tryon-modal animate-fade-in" onClick={() => setTryOnOutfit(null)}>
          <div className="modal-content glass-card tryon-content animate-slide-up" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
            <div className="tryon-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className="font-heading" style={{ margin: 0 }}>Dressing Studio</h3>
                <span className="badge badge-violet" style={{ textTransform: 'capitalize' }}>
                  {avatarSettings.gender === 'female' ? 'Girl model ♀️' : 'Boy model ♂️'}
                </span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setTryOnOutfit(null)}>
                <IconX />
              </button>
            </div>

            <div className="tryon-body">
              <div 
                className="tryon-canvas-container glass-card"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <RenderAvatarVector 
                  styleProps={avatarSettings} 
                  rotation={avatarRotation} 
                  currentOutfit={tryOnOutfit} 
                  fitSettings={fitSettings}
                />

                <div className="drag-rotate-badge animate-pulse-glow">
                  🔄 Drag or Swipe to Spin 360°
                </div>
              </div>

              <div className="tryon-controls-panel">
                <div className="view-mode-selector">
                  <span className="control-label">Avatar Viewpoint</span>
                  <div className="view-mode-buttons">
                    <button
                      type="button"
                      className={`view-mode-btn ${(avatarRotation < 90 || avatarRotation >= 270) ? 'active' : ''}`}
                      onClick={() => {
                        setAvatarRotation(0);
                        setAutoRotate(false);
                      }}
                    >
                      Front 👤
                    </button>
                    <button
                      type="button"
                      className={`view-mode-btn ${(avatarRotation >= 90 && avatarRotation < 270) ? 'active' : ''}`}
                      onClick={() => {
                        setAvatarRotation(180);
                        setAutoRotate(false);
                      }}
                    >
                      Back 👥
                    </button>
                  </div>
                </div>

                <div className="layers-tab-content animate-slide-up">
                  <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Recommended clothing items aligned on your custom avatar below. Click any layer to find visual style pairs!
                  </p>

                  <div className="outfit-layers-checklist">
                    {['top', 'bottom', 'outerwear', 'shoes', 'accessory'].map((slot) => {
                      const item = tryOnOutfit[slot];
                      const isSelected = selectedSimilarityItem?._id === item?._id;
                      return (
                        <div 
                          key={slot} 
                          className={`layer-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => item && fetchSimilarItems(item)}
                          style={{ cursor: item ? 'pointer' : 'default' }}
                        >
                          <span className="layer-slot-name">{slot}</span>
                          {item ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                              <span className="layer-item-name" style={{ color: item.color?.primary || 'inherit', fontWeight: 600 }}>
                                {item.name}
                              </span>
                              <button 
                                type="button" 
                                className="btn btn-xs btn-ghost btn-find-pairs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchSimilarItems(item);
                                }}
                                style={{ padding: '2px 6px', fontSize: '0.7rem', height: 'auto', background: 'rgba(255, 255, 255, 0.05)' }}
                              >
                                🔍 Find Pairs
                              </button>
                            </div>
                          ) : (
                            <span className="layer-empty">Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedSimilarityItem && (
                    <div className="similarity-carousel-wrapper animate-slide-up" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div className="similarity-carousel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className="similarity-carousel-title" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          Aesthetic Pairs for <strong>{selectedSimilarityItem.name}</strong>
                        </span>
                        <button 
                          type="button" 
                          className="btn btn-icon btn-ghost btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSimilarityItem(null);
                            setSimilarItems([]);
                          }}
                          style={{ width: '20px', height: '20px', minHeight: 'auto', padding: 0 }}
                        >
                          <IconX />
                        </button>
                      </div>

                      {similarLoading ? (
                        <div className="similarity-loading" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span className="loader-spinner" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-violet)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <span>Aligning aesthetic vectors...</span>
                        </div>
                      ) : similarItems.length > 0 ? (
                        <div className="similarity-carousel" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }}>
                          {similarItems.map(({ item, score }) => (
                            <div key={item._id} className="similarity-card glass-card" style={{ flex: '0 0 130px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                              <div className="similarity-card-img-wrap" style={{ width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid transparent', borderColor: item.color?.primary || 'transparent', padding: '4px' }}>
                                <DressingItemImage 
                                  src={`http://localhost:5000${item.imageUrl}`} 
                                  alt={item.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              </div>
                              <div className="similarity-card-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="similarity-card-name" style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name}</span>
                                <span className="badge badge-accent-green" style={{ fontSize: '0.65rem', padding: '2px 4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px', textAlign: 'center', width: 'fit-content' }}>{score}% Match</span>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs btn-swap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSwapItem(item.category, item);
                                  }}
                                  style={{ fontSize: '0.65rem', padding: '4px', height: 'auto', marginTop: '4px' }}
                                >
                                  🔄 Swap
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="similarity-empty" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No visually similar {selectedSimilarityItem.category} found in your wardrobe yet.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="tryon-critique-section glass-card" style={{ marginTop: '20px', padding: '16px', background: 'rgba(124, 58, 237, 0.03)', borderRadius: '12px', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-violet-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🧠 Studio AI Stylist
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        onClick={() => fetchLLMCritique({ items: tryOnOutfit })}
                        disabled={critiqueLoading}
                        style={{ height: 'auto', padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        {critiqueLoading ? '⏳ Drafting...' : '💬 Ask Critique'}
                      </button>
                    </div>
                    {stylistCritique ? (
                      <div className="tryon-critique-bubble animate-fade-in" style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                        <p className="tryon-critique-text" style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{stylistCritique}</p>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Swap items above to mix your style, then ask Zyntra for a live Llama-3 fashion critique!
                      </p>
                    )}
                  </div>

                  <div className="rotation-actions-row" style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${autoRotate ? 'btn-primary animate-pulse-glow' : 'btn-secondary'}`}
                      onClick={() => setAutoRotate(!autoRotate)}
                      style={{ flex: 1 }}
                    >
                      🔄 {autoRotate ? 'Auto Orbiting' : 'Auto 360 Spin'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setAvatarRotation(0);
                        setAutoRotate(false);
                      }}
                    >
                      <IconRefresh /> Reset Front
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      */}

      {/* AI Dressing Room Modal */}
      {tryOnModalOutfit && (
        <TryOn
          outfit={tryOnModalOutfit}
          onClose={() => setTryOnModalOutfit(null)}
        />
      )}
    </div>
  );
}
