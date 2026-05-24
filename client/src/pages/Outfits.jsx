import { useState, useEffect } from 'react';
import { clothingAPI, outfitAPI } from '../lib/api';
import { useToast } from '../context/ToastContext';
import ClothingCard from '../components/ClothingCard';
import './Outfits.css';

/* SVG Icons */
const IconSave = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconX = () => <svg viewBox="0 0 24 24" className="icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconRefresh = () => <svg viewBox="0 0 24 24" className="icon"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6"/></svg>;

const SLOTS = [
  { id: 'top', label: 'Top', required: true, category: 'tops' },
  { id: 'bottom', label: 'Bottom', required: true, category: 'bottoms' },
  { id: 'shoes', label: 'Shoes', required: false, category: 'shoes' },
  { id: 'outerwear', label: 'Outerwear', required: false, category: 'outerwear' },
  { id: 'accessory', label: 'Accessory', required: false, category: 'accessories' },
];

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
          {/* Skin primary gradient to give photorealistic rounded depth */}
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

          {/* Skin shadow gradient for deep muscle outlines */}
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

            {/* Athletic model crop top & high waist shorts (Underwear) */}
            {activeView === 'front' ? (
              <>
                {/* Crop Top (Sports bra) */}
                <path d="M 70,105 C 70,105 77,138 100,138 C 123,138 130,105 130,105 L 126,90 L 74,90 Z" fill="url(#underwearGrad)" />
                {/* Shoulder straps */}
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
                
                {/* Back High Waist Shorts */}
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
              <path d="M 72,36 C 58,20 70,2 100,2 C 130,2 142,20 128,36 C 136,29 135,16 124,8 C 113,1 87,1 76,8 C 65,16 64,29 72,36 Z M 76,32 C 73,28 78,24 82,26 Z" fill={hColor} />
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

      {/* CLOTHING TRY ON LAYER OVERLAY (Fitting Offsets x, y and scale applied) */}
      {currentOutfit && activeView === 'front' && (
        <div className="tryon-clothing-overlay-container">
          {/* Top */}
          {currentOutfit.top && (
            <DressingItemImage
              src={`http://localhost:5000${currentOutfit.top.imageUrl}`}
              alt="top overlay"
              className="overlay-clothes top-clothes animate-fade-in-scale"
              style={{
                transform: `translate(${fitSettings[currentOutfit.top._id]?.x || 0}px, ${fitSettings[currentOutfit.top._id]?.y || 0}px) scale(${(fitSettings[currentOutfit.top._id]?.scale || 100) / 100})`
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

export default function Outfits() {
  const [clothes, setClothes] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [builderState, setBuilderState] = useState({
    top: null,
    bottom: null,
    shoes: null,
    outerwear: null,
    accessory: null,
  });
  const [outfitName, setOutfitName] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();
  // Try on states
  const [tryOnActive, setTryOnActive] = useState(false);
  const [avatarSettings, setAvatarSettings] = useState(null);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewMode, setViewMode] = useState('front'); // 'front' | 'back'

  // Fit settings
  const [fitSettings, setFitSettings] = useState({});
  const [fitActiveSlot, setFitActiveSlot] = useState('top');
  const [showFitter, setShowFitter] = useState(false);

  // Drag-to-rotate visualizer states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRot, setDragStartRot] = useState(0);

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

  useEffect(() => {
    fetchData();
  }, []);

  // Handle auto rotation of try-on model
  useEffect(() => {
    let interval = null;
    if (autoRotate && tryOnActive) {
      interval = setInterval(() => {
        setAvatarRotation((prev) => (prev + 30) % 360);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [autoRotate, tryOnActive]);

  // Load avatar and fit settings when try on modal changes
  useEffect(() => {
    const stored = localStorage.getItem('zyntra_avatar');
    if (stored) {
      setAvatarSettings(JSON.parse(stored));
    }
    const storedFits = localStorage.getItem('zyntra_fits');
    if (storedFits) {
      setFitSettings(JSON.parse(storedFits));
    }
  }, [tryOnActive]);

  const fetchData = async () => {
    try {
      const [cRes, oRes] = await Promise.all([clothingAPI.getAll(), outfitAPI.getAll()]);
      setClothes(cRes.data.clothes);
      setSavedOutfits(oRes.data.outfits);
    } catch (err) {
      error('Failed to load data');
    }
  };

  const handleSelectSlot = (slotId) => {
    setActiveSlot(activeSlot === slotId ? null : slotId);
  };

  const handlePickItem = (item) => {
    if (!activeSlot) return;
    setBuilderState((prev) => ({ ...prev, [activeSlot]: item }));
    setActiveSlot(null);
  };

  const handleClearSlot = (slotId, e) => {
    e.stopPropagation();
    setBuilderState((prev) => ({ ...prev, [slotId]: null }));
  };

  const handleClearAll = () => {
    setBuilderState({ top: null, bottom: null, shoes: null, outerwear: null, accessory: null });
    setOutfitName('');
  };

  const handleSaveOutfit = async () => {
    if (!builderState.top || !builderState.bottom) {
      return error('An outfit needs at least a top and a bottom');
    }
    if (!outfitName) {
      return error('Please give your outfit a name');
    }

    setLoading(true);
    try {
      const items = {
        top: builderState.top._id,
        bottom: builderState.bottom._id,
        shoes: builderState.shoes?._id,
        outerwear: builderState.outerwear?._id,
        accessory: builderState.accessory?._id,
      };

      const { data } = await outfitAPI.create({ name: outfitName, items });
      setSavedOutfits([data.outfit, ...savedOutfits]);
      handleClearAll();
      success('Outfit saved successfully!');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save outfit');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOutfit = async (id) => {
    try {
      await outfitAPI.delete(id);
      setSavedOutfits(savedOutfits.filter((o) => o._id !== id));
      success('Outfit deleted');
    } catch (err) {
      error('Failed to delete outfit');
    }
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

  // Filter clothes for the active slot
  const availableOptions = activeSlot
    ? clothes.filter((c) => c.category === SLOTS.find((s) => s.id === activeSlot)?.category)
    : [];

  const activeFitterItem = builderState ? builderState[fitActiveSlot] : null;
  const activeFitterFit = activeFitterItem ? (fitSettings[activeFitterItem._id] || { x: 0, y: 0, scale: 100 }) : { x: 0, y: 0, scale: 100 };

  return (
    <div className="main-content" id="outfits-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 className="dashboard-title">Outfit Builder</h1>
            <p className="dashboard-subtitle">Mix and match to create the perfect look</p>
          </div>
        </div>

        <div className="outfits-layout">
          {/* Builder Section */}
          <div className="builder-section">
            <div className="builder-header">
              <h3>Current Canvas</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const stored = localStorage.getItem('zyntra_avatar');
                    setAvatarSettings(stored ? JSON.parse(stored) : {
                      gender: 'male',
                      skin: 'olive',
                      hair: 'messy',
                      hairColor: 'black',
                      expression: 'smile'
                    });
                    setTryOnActive(true);
                    setAvatarRotation(0);
                    setViewMode('front');
                  }}
                  disabled={!builderState.top && !builderState.bottom}
                  title="Try this combination on your custom avatar"
                >
                  ✨ Try On Avatar
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleClearAll} title="Reset canvas">
                  <IconRefresh /> Reset
                </button>
              </div>
            </div>

            <div className="builder-canvas glass-card">
              <div className="canvas-slots">
                {SLOTS.map((slot) => {
                  const item = builderState[slot.id];
                  const isActive = activeSlot === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`slot-card ${isActive ? 'active' : ''} ${item ? 'filled' : 'empty'}`}
                      onClick={() => handleSelectSlot(slot.id)}
                    >
                      {item ? (
                        <>
                          <img src={`http://localhost:5000${item.imageUrl}`} alt={slot.label} className="slot-img" />
                          <button className="btn btn-icon slot-remove" onClick={(e) => handleClearSlot(slot.id, e)}>
                            <IconX />
                          </button>
                          <div className="slot-badge" style={{ backgroundColor: item.color?.primary || 'var(--bg-tertiary)' }} />
                        </>
                      ) : (
                        <div className="slot-placeholder">
                          <span className="slot-label">{slot.label}</span>
                          {slot.required && <span className="slot-req">*</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="builder-actions">
                <input
                  type="text"
                  className="input outfit-name-input"
                  placeholder="Give this outfit a name..."
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-save"
                  onClick={handleSaveOutfit}
                  disabled={loading || !builderState.top || !builderState.bottom}
                >
                  {loading ? <span className="loader-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><IconSave /> Save Outfit</>}
                </button>
              </div>
            </div>

            {/* Selection Drawer */}
            {activeSlot && (
              <div className="selection-drawer glass-card animate-slide-up">
                <div className="drawer-header">
                  <h4>Select {SLOTS.find(s => s.id === activeSlot)?.label}</h4>
                  <button className="btn btn-icon btn-ghost" onClick={() => setActiveSlot(null)}>
                    <IconX />
                  </button>
                </div>
                
                {availableOptions.length > 0 ? (
                  <div className="selection-grid">
                    {availableOptions.map((item) => (
                      <ClothingCard
                        key={item._id}
                        item={item}
                        selectable
                        selected={builderState[activeSlot]?._id === item._id}
                        onSelect={handlePickItem}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-mini">
                    <p>No items found for this category.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Outfits Section */}
          <div className="saved-section">
            <h3 className="section-title-sm">Saved Outfits</h3>
            
            {savedOutfits.length > 0 ? (
              <div className="saved-grid">
                {savedOutfits.map((outfit) => {
                  const items = [
                    outfit.items.top,
                    outfit.items.bottom,
                    outfit.items.shoes,
                    outfit.items.outerwear,
                    outfit.items.accessory
                  ].filter(id => id && clothes.some(c => c._id === id));

                  return (
                    <div key={outfit._id} className="saved-card glass-card">
                      <div className="saved-header">
                        <h4>{outfit.name}</h4>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn btn-icon btn-ghost btn-trash"
                            onClick={() => {
                              const stored = localStorage.getItem('zyntra_avatar');
                              setAvatarSettings(stored ? JSON.parse(stored) : {
                                gender: 'male',
                                skin: 'olive',
                                hair: 'messy',
                                hairColor: 'black',
                                expression: 'smile'
                              });
                              // Map outfit keys to object format for try on vector
                              const formatted = {
                                top: clothes.find(c => c._id === outfit.items.top),
                                bottom: clothes.find(c => c._id === outfit.items.bottom),
                                shoes: clothes.find(c => c._id === outfit.items.shoes),
                                outerwear: clothes.find(c => c._id === outfit.items.outerwear),
                                accessory: clothes.find(c => c._id === outfit.items.accessory)
                              };
                              setBuilderState(formatted);
                              setTryOnActive(true);
                              setAvatarRotation(0);
                              setViewMode('front');
                            }}
                            title="Try On Avatar"
                          >
                            ✨
                          </button>
                          <button className="btn btn-icon btn-ghost btn-trash" onClick={() => handleDeleteOutfit(outfit._id)}>
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                      
                      <div className="saved-mini-gallery">
                        {items.slice(0, 4).map((itemId, i) => {
                          const c = clothes.find(c => c._id === itemId);
                          if (!c) return null;
                          return (
                            <div key={i} className="mini-item">
                              <img src={`http://localhost:5000${c.imageUrl}`} alt="item" />
                            </div>
                          );
                        })}
                        {items.length > 4 && (
                          <div className="mini-item more">
                            +{items.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-subtitle">You haven't saved any outfits yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AVATAR TRY ON MODAL CANVAS (With interactive Fitter tool and Clamped Y-angle rotation) */}
      {tryOnActive && avatarSettings && (
        <div className="modal-overlay tryon-modal animate-fade-in" onClick={() => setTryOnActive(false)}>
          <div className="modal-content glass-card tryon-content animate-slide-up" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
            <div className="tryon-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className="font-heading" style={{ margin: 0 }}>Dressing Studio</h3>
                <span className="badge badge-violet" style={{ textTransform: 'capitalize' }}>
                  {avatarSettings.gender === 'female' ? 'Girl model ♀️' : 'Boy model ♂️'}
                </span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setTryOnActive(false)}>
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
                  currentOutfit={builderState} 
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
                      const item = builderState[slot];
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
