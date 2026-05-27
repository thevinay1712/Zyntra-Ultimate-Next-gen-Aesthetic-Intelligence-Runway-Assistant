import { useState, useEffect } from 'react';
import { recommendAPI, clothingAPI } from '../lib/api';
import { useToast } from '../context/ToastContext';
import './Recommend.css';

/* SVG Icons */
const IconCpu = () => <svg viewBox="0 0 24 24" className="icon"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>;
const IconStar = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconRefresh = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconX = () => <svg viewBox="0 0 24 24" className="icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconSettings = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

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

export default function Recommend() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Occasion & Season states
  const [params, setParams] = useState({ occasion: 'casual', season: '' });
  
  // Weather states
  const [weather, setWeather] = useState({ temp: 22, condition: 'Sunny Day ☀️' });
  const [weatherLoading, setWeatherLoading] = useState(false);
  // const [simulatedWeather, setSimulatedWeather] = useState(null); // 'sunny', 'rainy', 'cold', 'windy' (Disabled by user request)
  const [locationName, setLocationName] = useState('Local Area');
  
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

  // Drag-to-rotate visualizer states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRot, setDragStartRot] = useState(0);

  // Wardrobe loaded from server
  const [clothes, setClothes] = useState([]);
  const [fetchingClothes, setFetchingClothes] = useState(false);

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
    const tops = clothes.filter((c) => c.category === 'tops');
    const bottoms = clothes.filter((c) => c.category === 'bottoms');
    const shoes = clothes.filter((c) => c.category === 'shoes');
    const outerwear = clothes.filter((c) => c.category === 'outerwear');
    const accessories = clothes.filter((c) => c.category === 'accessories');

    if (tops.length === 0 || bottoms.length === 0) {
      return [];
    }

    // const currentTemp = simulatedWeather ? WEATHER_MOCK[simulatedWeather].temp : weather.temp;
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
            score -= 10;
          } else {
            score += 8;
          }
        }

        // 3. Occasion match
        const topOccasionMatch = top.occasion?.includes(params.occasion);
        const bottomOccasionMatch = bottom.occasion?.includes(params.occasion);
        
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
        let bestShoeScore = 0;
        for (const shoe of shoes) {
          let shoeScore = colorHarmonyScore(shoe.color?.primary, top.color?.primary) * 0.3 +
            colorHarmonyScore(shoe.color?.primary, bottom.color?.primary) * 0.3;
          if (shoe.occasion?.includes(params.occasion)) shoeScore += 20;
          if (shoe.aesthetic === top.aesthetic) shoeScore += 10;
          if (shoeScore > bestShoeScore) {
            bestShoeScore = shoeScore;
            bestShoe = shoe;
          }
        }

        // Pick optional outerwear
        let bestOuterwear = null;
        let bestOwScore = 0;
        
        for (const ow of outerwear) {
          let owScore = colorHarmonyScore(ow.color?.primary, top.color?.primary) * 0.4 +
            colorHarmonyScore(ow.color?.primary, bottom.color?.primary) * 0.2;
          
          if (ow.season?.includes(finalSeason)) owScore += 25;
          if (ow.aesthetic === top.aesthetic) owScore += 15;
          
          if (owScore > bestOwScore) {
            bestOwScore = owScore;
            bestOuterwear = ow;
          }
        }

        // If it's cold, require or highly boost if we found outerwear
        if (isColdWeather) {
          if (bestOuterwear) {
            score += 20;
            reasons.push('weather layering active');
          } else {
            score -= 15; // penalty for lack of protection
          }
        }

        // Pick optional accessory
        let bestAccessory = null;
        let bestAccScore = 0;
        for (const acc of accessories) {
          let accScore = colorHarmonyScore(acc.color?.primary, top.color?.primary) * 0.5;
          if (acc.occasion?.includes(params.occasion)) accScore += 20;
          if (acc.aesthetic === top.aesthetic) accScore += 10;
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

        const items = { top, bottom };
        if (bestShoe) items.shoes = bestShoe;
        if (bestOuterwear && (isColdWeather || bestOwScore > 40)) items.outerwear = bestOuterwear;
        if (bestAccessory) items.accessory = bestAccessory;

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

  const generateAIAdviceText = (topOutfit) => {
    if (!topOutfit) return '';

    // const currentTemp = simulatedWeather ? WEATHER_MOCK[simulatedWeather].temp : weather.temp;
    // const currentCondition = simulatedWeather ? WEATHER_MOCK[simulatedWeather].condition : weather.condition;
    const currentTemp = weather.temp; // Rely strictly on real-time weather
    const currentCondition = weather.condition;
    const { top, bottom, outerwear, shoes, accessory } = topOutfit.items;

    // 1. Core Occasion Setup
    const occasionTitle = params.occasion.charAt(0).toUpperCase() + params.occasion.slice(1);
    
    // 2. Weather Specific Commentary
    let weatherAdvice = '';
    if (currentTemp < 10) {
      weatherAdvice = `❄️ Freezing winter conditions detected (${currentTemp}°C). Heavy thermal insulation is active. `;
      if (outerwear) {
        weatherAdvice += `The ${outerwear.name} acts as your primary thermal shield, styled beautifully over the ${top.name}. `;
      } else {
        weatherAdvice += `Please bundle up! Your digital wardrobe is currently missing a warm coat or jacket—consider scanning one soon to complete cold-weather layering guidelines. `;
      }
    } else if (currentTemp >= 10 && currentTemp < 17) {
      weatherAdvice = `🍂 A brisk, chilly atmosphere (${currentTemp}°C). `;
      if (outerwear) {
        weatherAdvice += `I suggest wearing your ${outerwear.name} styled open to create a crisp, modern multi-layered silhouette with your ${top.name}. `;
      } else {
        weatherAdvice += `A cozy sweater or light jacket over your ${top.name} is recommended for optimal comfort. `;
      }
    } else if (currentTemp >= 17 && currentTemp < 24) {
      weatherAdvice = `⛅ A pleasant, temperate climate (${currentTemp}°C). Perfect for light styling. The ${top.name} provides clean, comfortable insulation without overheating. `;
    } else {
      weatherAdvice = `☀️ Warm, high-temperature conditions (${currentTemp}°C). Optimizing for maximum breathability. The lightweight structure of the ${top.name} keeps you cool and collected under the sun. `;
    }

    // 3. Condition-based protective additions
    if (currentCondition.includes('🌧️') || currentCondition.includes('Rainy') || currentCondition.includes('Showers')) {
      weatherAdvice += `🌧️ Rain protection protocol is active: ensure your layers are water-resistant to keep the silhouette clean and dry. `;
    } else if (currentCondition.includes('💨') || currentCondition.includes('Windy') || currentCondition.includes('Gale')) {
      weatherAdvice += `💨 Gale-defense active: the outer layer acts as an effective windbreak to seal in warmth. `;
    }

    // 4. Aesthetic / Style Synergy Matrix
    let styleSynergy = '';
    const topStyle = top.aesthetic || 'Casual';
    const bottomStyle = bottom.aesthetic || 'Casual';
    
    const styleCombinations = {
      'Minimalist-Minimalist': 'สะอาดตาและประณีต (Ultra-Cohesive). The clean lines of the minimalist silhouette project absolute contemporary sophistication, forming an effortless, high-contrast visual balance.',
      'Streetwear-Streetwear': 'Urban style synergy. The relaxed streetwear contour brings a confident, effortlessly cool energy that is highly synchronized and expressive.',
      'Activewear-Activewear': 'High-performance symmetry. Optimized contours maximize range of motion while maintaining a highly athletic, modern, and cohesive look.',
      'Formal-Formal': 'Chiseled structural design. Projects absolute professionalism and tailored elegance, creating a sharp, commanding presence.',
      'Casual-Casual': 'Relaxed daily harmony. Emphasizes absolute ease and effortless comfort, perfect for daily hangouts and casual encounters.'
    };

    const key = `${topStyle}-${bottomStyle}`;
    if (styleCombinations[key]) {
      styleSynergy = styleCombinations[key];
    } else if (topStyle === bottomStyle) {
      styleSynergy = `Intentional ${topStyle} alignment. The items coordinate seamlessly under a shared design language, creating a highly unified aesthetic.`;
    } else {
      // Cross-aesthetic styling
      styleSynergy = `Balanced high-low styling. Blending a ${topStyle} top with a ${bottomStyle} bottom creates an appealing, multi-dimensional visual flow that is both comfortable and stylishly relaxed.`;
    }

    // 5. Color Theory Psychology
    let colorPsychology = '';
    const colorNote = topOutfit.colorNote;
    
    if (colorNote.includes('Complementary')) {
      colorPsychology = `Complementary color dynamics are active. The bold contrast between the ${top.color?.primary} top and the ${bottom.color?.primary} bottom creates an eye-catching, high-energy focal point that projects absolute style confidence.`;
    } else if (colorNote.includes('Analogous')) {
      colorPsychology = `Analogous color theory in play. The smooth, harmonious transition between the adjacent ${top.color?.primary} and ${bottom.color?.primary} hues creates a sophisticated, calming visual flow that is highly pleasing to the eye.`;
    } else if (colorNote.includes('Neutral')) {
      colorPsychology = `Refined neutral palette. Utilizing timeless, understated tones projects high-end luxury and absolute versatility, allowing the visual contours of the garments to take center stage.`;
    } else {
      colorPsychology = `Dynamic color mixing. The contrast between the ${top.color?.primary} and ${bottom.color?.primary} elements creates a crisp, high-contrast style statement.`;
    }

    // 6. Finishing details (Shoes & Accessories)
    let details = '';
    if (shoes) {
      details += `For footwear, sliding into the ${shoes.name} anchors the outfit beautifully. `;
      if (shoes.aesthetic === topStyle) {
        details += `Its ${shoes.aesthetic} styling reinforces the core aesthetic. `;
      }
    }
    if (accessory) {
      details += `Finish off with the ${accessory.name} for an elegant, highly customized accessory accent.`;
    }

    // Combine into a master generative-styled personal review
    return `Hello there! I am your Closet AI Stylist. For your ${occasionTitle} outing today in your local region (${locationName}), I have formulated a premium, mathematically optimized style recommendation from your digital wardrobe.

✨ STYLING ANGLE:
${styleSynergy}

🌡️ WEATHER ADAPTATION:
${weatherAdvice}

🎨 COLOR PSYCHOLOGY & HARMONY:
${colorPsychology}

👟 ACCESSORY & FINISHING DETAILS:
${details}

This combination scores a remarkable ${topOutfit.score}% Style Match based on color theory, occasion eligibility, and seasonal guidelines. Step out with absolute confidence!`;
  };

  // Load weather, customized avatar and fit adjustments from localStorage
  useEffect(() => {
    // 1. Weather fetching with Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchRealWeather(pos.coords.latitude, pos.coords.longitude),
        () => console.log('Geolocation permission denied, using mock weather')
      );
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

  const fetchRealWeather = async (lat, lon) => {
    try {
      setWeatherLoading(true);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
      const data = await res.json();
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      
      let condition = 'Clear sky ☀️';
      if (code > 0 && code <= 3) condition = 'Partly Cloudy ⛅';
      else if (code >= 45 && code <= 48) condition = 'Foggy 🌫️';
      else if (code >= 51 && code <= 67) condition = 'Rainy 🌧️';
      else if (code >= 71 && code <= 77) condition = 'Snowy ❄️';
      else if (code >= 80 && code <= 82) condition = 'Showers 🌦️';
      else if (code >= 95) condition = 'Thunderstorm ⛈️';

      setWeather({ temp, condition });

      // Resolve timezone city name dynamically for free
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const city = timezone ? timezone.split('/').pop().replace('_', ' ') : 'Local Area';
      setLocationName(city);
    } catch (e) {
      console.warn('Weather API failed, fallback active:', e.message);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleFetchLiveWeather = () => {
    if (navigator.geolocation) {
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await fetchRealWeather(pos.coords.latitude, pos.coords.longitude);
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const city = timezone ? timezone.split('/').pop().replace('_', ' ') : 'Local Area';
          success(`Live weather loaded for ${city}! 📍`);
        },
        (err) => {
          console.warn('Geolocation permission denied:', err);
          error('Location access denied. Please allow location permissions in your browser.');
          setWeatherLoading(false);
        }
      );
    } else {
      error('Geolocation is not supported by your browser.');
    }
  };

  const handleGenerate = () => {
    setLoading(true);
    setHasSearched(true);
    setTryOnOutfit(null);

    // Simulate AI thinking delay for premium feel
    setTimeout(() => {
      try {
        const localRecs = generateLocalRecommendations();
        setRecommendations(localRecs);
        if (localRecs.length > 0) {
          success(`Generated ${localRecs.length} matching suggestions for a ${params.occasion} day!`);
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
      <div className="container max-w-4xl">
        <div className="recommend-header animate-fade-in">
          <div className="ai-badge">
            <div className="ai-dot" />
            Zyntra Closet AI Engine v2
          </div>
          <h1 className="dashboard-title">Smart Styling</h1>
          <p className="dashboard-subtitle">Let Zyntra styling algorithms build custom wardrobe suggestions for your next event.</p>
        </div>

        {/* WEATHER BAR & OVERRIDES */}
        <div className="weather-dashboard glass-card animate-fade-in">
          <div className="weather-current">
            <div className="weather-temp-badge" style={{ color: activeWeather.color || 'var(--accent-violet-light)' }}>
              {activeWeather.temp}°C
            </div>
            <div className="weather-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="weather-title">Local Weather ({locationName})</span>
                <button 
                  type="button" 
                  onClick={handleFetchLiveWeather} 
                  disabled={weatherLoading}
                  className="btn btn-ghost" 
                  style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', background: 'rgba(255,255,255,0.02)' }}
                  title="Update weather using your live GPS location"
                >
                  {weatherLoading ? '⏳ updating...' : '📍 Fetch Live'}
                </button>
              </div>
              <span className="weather-desc">{activeWeather.condition}</span>
            </div>
          </div>

          {/*
          <div className="weather-overrides">
            <span className="override-title">Simulate Weather:</span>
            <div className="override-buttons">
              {Object.keys(WEATHER_MOCK).map((key) => {
                const active = simulatedWeather === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`override-btn ${active ? 'active' : ''}`}
                    onClick={() => setSimulatedWeather(simulatedWeather === key ? null : key)}
                    title={`Simulate ${key} conditions`}
                  >
                    {key === 'sunny' && '☀️ Sunny'}
                    {key === 'rainy' && '🌧️ Rainy'}
                    {key === 'cold' && '❄️ Cold'}
                    {key === 'windy' && '💨 Windy'}
                  </button>
                );
              })}
            </div>
          </div>
          */}
        </div>

        <div className="recommend-controls glass-card animate-slide-up">
          {/* Destination Selection Cards */}
          <div className="control-group">
            <label className="section-eyebrow">Where are you going today? *</label>
            <div className="destination-grid">
              {DESTINATIONS.map((dest) => {
                const active = params.occasion === dest.id;
                return (
                  <div
                    key={dest.id}
                    className={`destination-card glass-card ${active ? 'active' : ''}`}
                    onClick={() => setParams({ ...params, occasion: dest.id })}
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

          {/* Collapsible custom season override */}
          <div className="control-group">
            <label>Specific Season Filter (Optional)</label>
            <div className="chip-group">
              <button
                className={`chip ${params.season === '' ? 'active' : ''}`}
                onClick={() => setParams({ ...params, season: '' })}
              >
                Auto (Based on weather)
              </button>
              {['spring', 'summer', 'fall', 'winter'].map((season) => (
                <button
                  key={season}
                  className={`chip ${params.season === season ? 'active' : ''}`}
                  onClick={() => setParams({ ...params, season: season })}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg btn-generate"
            onClick={handleGenerate}
            disabled={loading}
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
                <p className="advisor-text">
                  {generateAIAdviceText(recommendations[0])}
                </p>
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
                          setTryOnOutfit(rec.items);
                          setAvatarRotation(0);
                          setViewMode('front');
                        }}
                      >
                        ✨ Try On Avatar
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
          <div className="empty-state animate-fade-in">
            <h3 className="empty-title">Wardrobe count low</h3>
            <p className="empty-subtitle">We couldn't align enough Tops and Bottoms from your wardrobe to generate styling combinations. Try uploading more clothing items with the guidelines!</p>
          </div>
        ) : null}
      </div>

      {/* AVATAR TRY ON MODAL CANVAS (With interactive Fitter tool and Clamped Y-angle rotation) */}
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
              {/* Left Column: Avatar Canvas */}
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

                {/* Tactile drag spin badge overlay */}
                <div className="drag-rotate-badge animate-pulse-glow">
                  🔄 Drag or Swipe to Spin 360°
                </div>
              </div>

              {/* Right Column: Custom controls */}
              <div className="tryon-controls-panel">
                {/* View Angle selector to solve paper-doll thickness collapse */}
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

                {/* TAB 1: DRESSED LAYERS LIST */}
                <div className="layers-tab-content animate-slide-up">
                  <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Recommended clothing items aligned on your custom avatar below.
                  </p>

                  <div className="outfit-layers-checklist">
                    {['top', 'bottom', 'outerwear', 'shoes', 'accessory'].map((slot) => {
                      const item = tryOnOutfit[slot];
                      return (
                        <div key={slot} className="layer-pill">
                          <span className="layer-slot-name">{slot}</span>
                          {item ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="layer-item-name" style={{ color: item.color?.primary || 'inherit' }}>
                                {item.name}
                              </span>
                            </div>
                          ) : (
                            <span className="layer-empty">Empty</span>
                          )}
                        </div>
                      );
                    })}
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
    </div>
  );
}
