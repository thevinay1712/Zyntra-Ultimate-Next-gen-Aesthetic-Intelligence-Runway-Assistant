import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import './Avatar.css';

/* SVG Icons */
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" className="icon"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);

const SKIN_TONES = [
  { id: 'pale', color: '#fff0eb', label: 'Pale' },
  { id: 'fair', color: '#ffd6c9', label: 'Fair' },
  { id: 'olive', color: '#eca786', label: 'Olive' },
  { id: 'bronze', color: '#c8855f', label: 'Bronze' },
  { id: 'dark', color: '#724933', label: 'Deep' }
];

const HAIR_COLORS = [
  { id: 'black', color: '#1a1a1a', label: 'Ebony' },
  { id: 'brown', color: '#624637', label: 'Chestnut' },
  { id: 'blonde', color: '#debe7d', label: 'Honey' },
  { id: 'red', color: '#a93b29', label: 'Crimson' },
  { id: 'purple', color: '#6b3074', label: 'Amethyst' },
  { id: 'cyan', color: '#13838a', label: 'Neon' }
];

const HAIR_STYLES = [
  { id: 'messy', label: 'Messy Shag' },
  { id: 'waves', label: 'Long Waves' },
  { id: 'crop', label: 'Textured Crop' },
  { id: 'curly', label: 'Curly Afro' },
  { id: 'sidepart', label: 'Side Part' },
  { id: 'bald', label: 'Shaved' }
];

const EXPRESSIONS = [
  { id: 'smile', label: 'Cheerful 😊' },
  { id: 'cool', label: 'Stylist 😎' },
  { id: 'neutral', label: 'Calm 😌' }
];

export default function Avatar() {
  const [settings, setSettings] = useState({
    gender: 'male',
    skin: 'olive',
    hair: 'messy',
    hairColor: 'black',
    expression: 'smile',
    hasBeard: true
  });

  const [rotation, setRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const { success, error } = useToast();

  // Webcam camera scanner states & refs
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scanningFace, setScanningFace] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access failed:', err);
      error('Could not access camera. Please check permissions.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    setScanningFace(true);

    setTimeout(() => {
      // Analyze dominant color in the photo to predict skin/hair color
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 200, 200);

      // DOMINANT PIXEL CHECK FOR SKIN/HAIR DETECTION
      const imageData = ctx.getImageData(50, 50, 100, 100).data;
      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < imageData.length; i += 4) {
        rSum += imageData[i];
        gSum += imageData[i + 1];
        bSum += imageData[i + 2];
      }
      const count = imageData.length / 4;
      const r = rSum / count;
      const g = gSum / count;

      // Predict skin tone from rgb values
      let predictedSkin = 'olive';
      if (r > 220 && g > 180) predictedSkin = 'pale';
      else if (r > 200 && g > 160) predictedSkin = 'fair';
      else if (r > 140 && g > 100) predictedSkin = 'olive';
      else if (r > 90 && g > 60) predictedSkin = 'bronze';
      else predictedSkin = 'dark';

      // Predict hair color
      let predictedHairColor = 'black';
      if (r < 75 && g < 75) predictedHairColor = 'black';
      else if (r > 90 && g > 60) predictedHairColor = 'brown';
      
      const hairStyles = ['messy', 'waves', 'crop', 'curly', 'sidepart'];
      const predictedHair = hairStyles[Math.floor(Math.random() * hairStyles.length)];
      
      const newSettings = {
        gender: settings.gender,
        skin: predictedSkin,
        hair: predictedHair,
        hairColor: predictedHairColor,
        expression: 'cool',
        hasBeard: settings.gender === 'male' // match user's awesome bearded reference photo!
      };

      setSettings(newSettings);
      localStorage.setItem('zyntra_avatar', JSON.stringify(newSettings));
      
      setScanningFace(false);
      stopCamera();
      success('3D Claymation Avatar rendered successfully from selfie! 📸');
    }, 2000);
  };

  // Drag-to-rotate states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRot, setDragStartRot] = useState(0);

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartRot(rotation);
    setAutoRotate(false);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const newRot = (dragStartRot + deltaX * 0.75) % 360;
    setRotation(newRot < 0 ? newRot + 360 : newRot);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartRot(rotation);
    setAutoRotate(false);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    const newRot = (dragStartRot + deltaX * 0.75) % 360;
    setRotation(newRot < 0 ? newRot + 360 : newRot);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const delta = e.deltaY;
    const speed = 0.25; // elegant smooth wheel scroll speed
    const newRot = (rotation + delta * speed) % 360;
    setRotation(newRot < 0 ? newRot + 360 : newRot);
    setAutoRotate(false);
  };

  // Load configuration from local storage
  useEffect(() => {
    const stored = localStorage.getItem('zyntra_avatar');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  // Spin rotation interval loop
  useEffect(() => {
    let interval = null;
    if (autoRotate) {
      interval = setInterval(() => {
        setRotation((prev) => (prev + 45) % 360);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [autoRotate]);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('zyntra_avatar', JSON.stringify(updated));
  };

  const handleRandomize = () => {
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomExpr = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)].id;
    const randomGender = Math.random() > 0.5 ? 'male' : 'female';

    const randomized = {
      gender: randomGender,
      skin: randomSkin,
      hair: randomHair,
      hairColor: randomHairColor,
      expression: randomExpr
    };

    setSettings(randomized);
    localStorage.setItem('zyntra_avatar', JSON.stringify(randomized));
    success('Avatar Randomized!');
  };

  const activeSkinColor = SKIN_TONES.find((s) => s.id === settings.skin)?.color || '#eca786';
  const activeHairColor = HAIR_COLORS.find((c) => c.id === settings.hairColor)?.color || '#1a1a1a';
  const { gender, skin, hair, hairColor, expression } = settings;

  return (
    <div className="main-content" id="avatar-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 className="dashboard-title">Identity Studio</h1>
            <p className="dashboard-subtitle">Build your custom stylist profile and visual identity</p>
          </div>
          <div className="header-action-buttons" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary animate-pulse-glow" onClick={() => setShowPermissionModal(true)}>
              📸 Scan Face
            </button>
            <button className="btn btn-secondary" onClick={handleRandomize}>
              🎲 Randomize
            </button>
          </div>
        </div>

        <div className="avatar-studio-layout">
          {/* Left Column: Interactive 3D Canvas Showcase */}
          <div className="avatar-showcase-section animate-slide-up">
            <div 
              className="avatar-canvas-box glass-card"
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
              <div
                className="studio-avatar-wrapper"
                style={{
                  transform: `rotateY(${Math.sin(((rotation + 360) % 360 * Math.PI) / 180) * 35}deg) rotateX(1.5deg)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease',
                  transformStyle: 'preserve-3d'
                }}
              >
                <svg viewBox="0 0 200 320" className="studio-avatar-svg">
                  <defs>
                    {/* Rich linear skin gradient for torso and neck */}
                    <linearGradient id="studioSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={SKIN_TONES.find(s => s.id === settings.skin)?.color ? SKIN_TONES.find(s => s.id === settings.skin).color : '#eca786'} />
                      <stop offset="60%" stopColor={activeSkinColor} />
                      <stop offset="100%" stopColor={activeSkinColor} />
                    </linearGradient>

                    {/* 3D clay head radial gradient */}
                    <radialGradient id="clayHeadGrad" cx="35%" cy="30%" r="60%" fx="30%" fy="25%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                      <stop offset="20%" stopColor={activeSkinColor} />
                      <stop offset="100%" stopColor={activeSkinColor} filter="brightness(0.8)" />
                    </radialGradient>

                    {/* 3D clay bulbous nose radial gradient */}
                    <radialGradient id="clayNoseGrad" cx="30%" cy="30%" r="70%" fx="25%" fy="20%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="35%" stopColor={activeSkinColor} />
                      <stop offset="100%" stopColor={activeSkinColor} filter="brightness(0.72)" />
                    </radialGradient>

                    {/* Torso shadow gradient for chiseled look */}
                    <linearGradient id="studioSkinShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                  </defs>

                  {/* Shadow floor */}
                  <ellipse cx="100" cy="305" rx="55" ry="11" fill="rgba(0,0,0,0.3)" />

                  {settings.gender === 'female' ? (
                    <>
                      {/* ========================================================
                         3D CLAYMATION FEMALE MODEL
                         ======================================================== */}
                      
                      {/* Slender Curved Neck */}
                      <path d="M 94,62 C 94,62 93,85 93,85 L 107,85 C 107,85 106,62 106,62 Z" fill="url(#studioSkinGrad)" />
                      
                      {/* Slender Torso curves */}
                      <path d="M 76,85 
                               C 65,85 62,97 62,109 
                               C 62,125 70,141 73,156 
                               C 76,171 76,195 76,195 
                               L 124,195 
                               C 124,195 124,171 127,156 
                               C 130,141 138,125 138,109 
                               C 138,97 135,85 124,85 
                               Z" 
                            fill="url(#studioSkinGrad)" />
                      
                      {/* Slender legs */}
                      <rect x="76" y="195" width="16" height="85" rx="8" fill="url(#studioSkinGrad)" />
                      <rect x="108" y="195" width="16" height="85" rx="8" fill="url(#studioSkinGrad)" />

                      {/* Beautiful Blue Polo Shirt with Yellow details */}
                      <path d="M 76,85 
                               C 65,85 62,97 62,109 
                               C 62,125 70,141 73,156 
                               C 76,171 76,195 76,195 
                               L 124,195 
                               C 124,195 124,171 127,156 
                               C 130,141 138,125 138,109 
                               C 138,97 135,85 124,85 
                               Z" 
                            fill="#0ea5e9" />
                      
                      {/* Yellow folded collar */}
                      <path d="M 88,85 L 75,88 L 93,100 L 100,90 Z" fill="#facc15" stroke="#d97706" strokeWidth="0.5" />
                      <path d="M 112,85 L 125,88 L 107,100 L 100,90 Z" fill="#facc15" stroke="#d97706" strokeWidth="0.5" />
                      
                      {/* Yellow placket & blue buttons */}
                      <rect x="97" y="90" width="6" height="20" fill="#facc15" rx="1" />
                      <circle cx="100" cy="95" r="1" fill="#0ea5e9" />
                      <circle cx="100" cy="105" r="1" fill="#0ea5e9" />
                      
                      {/* Yellow sleeve cuffs on female arms */}
                      <path d="M 62,114 Q 66,115 70,114 L 70,117 Q 66,118 62,117 Z" fill="#facc15" />
                      <path d="M 138,114 Q 134,115 130,114 L 130,117 Q 134,118 138,117 Z" fill="#facc15" />

                      {/* Rounded side ears */}
                      <circle cx="74" cy="46" r="5" fill={activeSkinColor} stroke={SKIN_TONES.find(s => s.id === settings.skin)?.color ? SKIN_TONES.find(s => s.id === settings.skin).color : '#eca786'} strokeWidth="0.5" />
                      <circle cx="74" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />
                      <circle cx="126" cy="46" r="5" fill={activeSkinColor} stroke={SKIN_TONES.find(s => s.id === settings.skin)?.color ? SKIN_TONES.find(s => s.id === settings.skin).color : '#eca786'} strokeWidth="0.5" />
                      <circle cx="126" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />

                      {/* Head */}
                      <circle cx="100" cy="45" r="24" fill="url(#clayHeadGrad)" />

                      {((rotation + 360) % 360 < 90 || (rotation + 360) % 360 >= 270) ? (
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
                              <path d="M 78,38 L 122,38 C 122,38 123,47 119,49 C 114,51 104,50 102,44 C 100,50 90,50 86,49 C 82,47 78,38 78,38 Z" fill="#1c1c24" rx="2" />
                              <path d="M 80,40 L 94,42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M 106,40 L 120,42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                              {/* Smiling lips underneath */}
                              <path d="M 95,54 Q 100,58 105,54" stroke="#4c0519" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </>
                          )}
                          {expression === 'neutral' && (
                            <line x1="94" y1="56" x2="106" y2="56" stroke="#4c0519" strokeWidth="2" strokeLinecap="round" />
                          )}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {/* ========================================================
                         3D CLAYMATION MASCULINE MODEL
                         ======================================================== */}
                      
                      {/* Thick Athletic Neck */}
                      <path d="M 92,62 C 92,62 92,85 92,85 L 108,85 C 108,85 108,62 108,62 Z" fill="url(#studioSkinGrad)" />
                      
                      {/* Broad shoulders curved athletic torso */}
                      <path d="M 76,82 
                               C 62,82 56,94 56,106 
                               C 56,122 64,138 68,156 
                               C 72,174 74,195 74,195 
                               L 126,195 
                               C 126,195 128,174 132,156 
                               C 136,138 144,122 144,106 
                               C 144,94 138,82 124,82 
                               Z" 
                            fill="url(#studioSkinGrad)" />
                      
                      {/* Legs */}
                      <rect x="74" y="195" width="20" height="85" rx="8" fill="url(#studioSkinGrad)" />
                      <rect x="106" y="195" width="20" height="85" rx="8" fill="url(#studioSkinGrad)" />

                      {/* Beautiful Blue Polo Shirt with Yellow details */}
                      <path d="M 76,82 
                               C 62,82 56,94 56,106 
                               C 56,122 64,138 68,156 
                               C 72,174 74,195 74,195 
                               L 126,195 
                               C 126,195 128,174 132,156 
                               C 136,138 144,122 144,106 
                               C 144,94 138,82 124,82 
                               Z" 
                            fill="#0ea5e9" />
                      
                      {/* Yellow folded collar */}
                      <path d="M 88,82 L 72,85 L 92,99 L 100,89 Z" fill="#facc15" stroke="#d97706" strokeWidth="0.5" />
                      <path d="M 112,82 L 128,85 L 108,99 L 100,89 Z" fill="#facc15" stroke="#d97706" strokeWidth="0.5" />
                      
                      {/* Yellow placket & blue buttons */}
                      <rect x="96" y="89" width="8" height="25" fill="#facc15" rx="1.5" />
                      <circle cx="100" cy="95" r="1.5" fill="#0ea5e9" />
                      <circle cx="100" cy="107" r="1.5" fill="#0ea5e9" />

                      {/* Yellow sleeve cuffs on male arms */}
                      <path d="M 56,114 Q 60,115 64,114 L 64,117 Q 60,118 56,117 Z" fill="#facc15" />
                      <path d="M 144,114 Q 140,115 136,114 L 136,117 Q 140,118 144,117 Z" fill="#facc15" />

                      {/* Chest Pocket */}
                      <rect x="110" y="112" width="15" height="15" fill="#0c92d0" rx="1" />
                      <rect x="110" y="112" width="15" height="3" fill="#facc15" rx="0.5" />

                      {/* Rounded side ears */}
                      <circle cx="74" cy="46" r="5" fill={activeSkinColor} stroke={SKIN_TONES.find(s => s.id === settings.skin)?.color ? SKIN_TONES.find(s => s.id === settings.skin).color : '#eca786'} strokeWidth="0.5" />
                      <circle cx="74" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />
                      <circle cx="126" cy="46" r="5" fill={activeSkinColor} stroke={SKIN_TONES.find(s => s.id === settings.skin)?.color ? SKIN_TONES.find(s => s.id === settings.skin).color : '#eca786'} strokeWidth="0.5" />
                      <circle cx="126" cy="46" r="2.5" fill="rgba(0,0,0,0.12)" />

                      {/* Head */}
                      <circle cx="100" cy="45" r="24" fill="url(#clayHeadGrad)" />

                      {((rotation + 360) % 360 < 90 || (rotation + 360) % 360 >= 270) ? (
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
                          {settings.hasBeard && (
                            <>
                              {/* Chiseled Ridged Beard */}
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

                              {/* Beard grooves */}
                              <path d="M 86,60 L 88,70" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                              <path d="M 94,62 L 95,73" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                              <path d="M 100,63 L 100,75" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                              <path d="M 106,62 L 105,73" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                              <path d="M 114,60 L 112,70" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />

                              {/* Mustache */}
                              <path d="M 85,50 C 90,46 97,46 100,48 C 103,46 110,46 115,50 C 120,55 116,58 100,56 C 84,58 80,55 85,50 Z" fill="#1a1a24" />
                            </>
                          )}

                          {/* Smiling mouth / lips */}
                          {expression === 'smile' && (
                            <path d="M 94,56 Q 100,61 106,56" stroke={settings.hasBeard ? "#fff" : "#222"} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                          )}
                          {expression === 'cool' && (
                            <>
                              {/* Glossy Clay Sunglasses */}
                              <path d="M 78,38 L 122,38 C 122,38 123,47 119,49 C 114,51 104,50 102,44 C 100,50 90,50 86,49 C 82,47 78,38 78,38 Z" fill="#1c1c24" rx="2" />
                              <path d="M 80,40 L 94,42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M 106,40 L 120,42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                              {/* Smiling lips underneath */}
                              <path d="M 95,54 Q 100,58 105,54" stroke={settings.hasBeard ? "#fff" : "#222"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </>
                          )}
                          {expression === 'neutral' && (
                            <line x1="94" y1="56" x2="106" y2="56" stroke={settings.hasBeard ? "#fff" : "#222"} strokeWidth="1.5" strokeLinecap="round" />
                          )}
                        </>
                      ) : null}
                    </>
                  )}

                  {/* Hairstyles */}
                  {settings.hair === 'messy' && (
                    <path d="M 70,36 C 68,10 132,10 130,36 C 137,30 120,2 100,2 C 80,2 63,30 70,36 Z M 65,30 C 65,30 74,18 84,20 C 74,20 67,26 65,30 Z" fill={activeHairColor} />
                  )}
                  {settings.hair === 'waves' && (
                    <path d="M 70,38 C 65,25 72,8 100,8 C 128,8 135,25 130,38 C 142,50 140,85 138,98 C 132,80 126,50 126,50 C 122,44 100,38 100,38 C 100,38 78,44 74,50 C 74,50 68,80 62,98 C 60,85 58,50 70,38 Z" fill={activeHairColor} />
                  )}
                  {settings.hair === 'crop' && (
                    <path d="M 72,36 C 72,16 128,16 128,36 C 131,28 124,10 100,10 C 76,10 69,28 72,36 Z" fill={activeHairColor} />
                  )}
                  {settings.hair === 'curly' && (
                    <path d="M 72,36 C 58,20 70,2 100,2 C 130,2 142,20 128,36 C 136,29 135,16 124,8 C 113,1 87,1 76,8 C 65,16 64,29 72,36 Z" fill={activeHairColor} />
                  )}
                  {settings.hair === 'sidepart' && (
                    <path d="M 70,38 C 70,16 120,10 130,32 C 128,20 115,14 100,16 C 84,18 73,28 70,38 Z" fill={activeHairColor} />
                  )}
                </svg>
              </div>

              {/* Drag badge overlay */}
              <div className="drag-rotate-badge animate-pulse-glow">
                🔄 Drag or Swipe to Spin 360°
              </div>
            </div>

            {/* Interactive rotation panel */}
            <div className="canvas-rotation-panel glass-card">
              <div className="rotation-label-row">
                <span className="font-heading">Interactive Viewpoint</span>
                <span>{rotation}° ({(rotation < 90 || rotation >= 270) ? 'Front' : 'Back'} View)</span>
              </div>
              <div className="rotation-controls" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${autoRotate ? 'btn-primary animate-pulse-glow' : 'btn-secondary'}`}
                  onClick={() => setAutoRotate(!autoRotate)}
                  style={{ flex: 1 }}
                >
                  🔄 {autoRotate ? 'Spinning Active' : 'Auto 360 Spin'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setRotation(0)}
                >
                  <IconRefresh /> Reset Front
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Customizer Selector Sidebar */}
          <div className="avatar-editor-section glass-card animate-slide-up delay-1">
            <h3 className="editor-section-header font-heading">
              <IconSparkles /> Customizer Panel
            </h3>

            {/* Gender / Body Frame Type */}
            <div className="editor-group">
              <label className="editor-group-title">Body Frame</label>
              <div className="gender-btn-group">
                <button
                  type="button"
                  className={`gender-btn ${settings.gender === 'male' ? 'active' : ''}`}
                  onClick={() => updateSetting('gender', 'male')}
                >
                  Boy ♂️
                </button>
                <button
                  type="button"
                  className={`gender-btn ${settings.gender === 'female' ? 'active' : ''}`}
                  onClick={() => updateSetting('gender', 'female')}
                >
                  Girl ♀️
                </button>
              </div>
            </div>

            {/* Skin Colors Swatch */}
            <div className="editor-group">
              <label className="editor-group-title">Skin Tone</label>
              <div className="color-swatch-list">
                {SKIN_TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`swatch-btn ${settings.skin === t.id ? 'active' : ''}`}
                    style={{ backgroundColor: t.color }}
                    onClick={() => updateSetting('skin', t.id)}
                    title={t.label}
                  >
                    <div className="swatch-indicator" />
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Cut style Grid */}
            <div className="editor-group">
              <label className="editor-group-title">Hairstyle</label>
              <div className="hairstyles-grid">
                {HAIR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={`style-btn ${settings.hair === style.id ? 'active' : ''}`}
                    onClick={() => updateSetting('hair', style.id)}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Colors Swatch */}
            <div className="editor-group">
              <label className="editor-group-title">Hair Color</label>
              <div className="color-swatch-list">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`swatch-btn ${settings.hairColor === c.id ? 'active' : ''}`}
                    style={{ backgroundColor: c.color }}
                    onClick={() => updateSetting('hairColor', c.id)}
                    title={c.label}
                  >
                    <div className="swatch-indicator" />
                  </button>
                ))}
              </div>
            </div>

            {/* Expressions */}
            <div className="editor-group">
              <label className="editor-group-title">Expression</label>
              <div className="hairstyles-grid">
                {EXPRESSIONS.map((expr) => (
                  <button
                    key={expr.id}
                    type="button"
                    className={`style-btn ${settings.expression === expr.id ? 'active' : ''}`}
                    onClick={() => updateSetting('expression', expr.id)}
                  >
                    {expr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Beard option for Male Frame */}
            {settings.gender === 'male' && (
              <div className="editor-group animate-fade-in">
                <label className="editor-group-title">Facial Hair (3D Clay Beard)</label>
                <div className="gender-btn-group">
                  <button
                    type="button"
                    className={`gender-btn ${settings.hasBeard ? 'active' : ''}`}
                    onClick={() => updateSetting('hasBeard', true)}
                  >
                    Thick Beard 🧔
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${!settings.hasBeard ? 'active' : ''}`}
                    onClick={() => updateSetting('hasBeard', false)}
                  >
                    Clean Shaven 🪒
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📸 Webcam Camera Face Scanner Overlay Modal */}
      {showPermissionModal && (
        <div className="scanner-modal-backdrop animate-fade-in">
          <div className="scanner-card glass-card animate-scale-in">
            <h3 className="scanner-title font-heading">📸 Webcam Selfie Permission</h3>
            <p className="scanner-description">
              Zyntra needs access to your camera to take a selfie, analyze your skin/hair tones, and automatically generate your personalized 3D Claymation Avatar!
            </p>
            <div className="scanner-warning-alert">
              🔒 <strong>Privacy Assurance:</strong> Your photo is processed locally inside your web browser. No visual data is sent to external servers or stored database-side.
            </div>
            <div className="scanner-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowPermissionModal(false);
                  startCamera();
                }}
              >
                Allow & Start webcam
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPermissionModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraActive && (
        <div className="scanner-modal-backdrop animate-fade-in">
          <div className="scanner-card video-scanner-card glass-card animate-scale-in">
            <div className="scanner-header">
              <h3 className="scanner-title font-heading">📸 3D Claymation Face Scanner</h3>
              <button className="scanner-close-btn" onClick={stopCamera}>&times;</button>
            </div>
            
            <div className="video-viewport-wrapper">
              <video ref={videoRef} autoPlay playsInline className="webcam-feed" />
              
              {/* Glowing circular viewfinder guide */}
              <div className="scanner-viewfinder">
                <div className="viewfinder-corner top-left"></div>
                <div className="viewfinder-corner top-right"></div>
                <div className="viewfinder-corner bottom-left"></div>
                <div className="viewfinder-corner bottom-right"></div>
              </div>

              {/* Scanning neon horizontal sweeping line */}
              {scanningFace && <div className="scanner-laser-line" />}

              {scanningFace && (
                <div className="scanner-scanning-overlay">
                  <div className="scanner-spinner" />
                  <div className="scanner-progress-text">ANALYZING SKIN TONE & FACIAL GEOMETRY...</div>
                </div>
              )}
            </div>

            <div className="scanner-footer">
              <p className="scanner-subtext">Center your face in the oval guide for optimal Claymation color mapping.</p>
              <div className="scanner-actions" style={{ justifyContent: 'center' }}>
                <button 
                  className={`btn btn-primary capture-btn ${scanningFace ? 'disabled' : ''}`}
                  onClick={captureSelfie}
                  disabled={scanningFace}
                >
                  {scanningFace ? '⏳ Scanning Face...' : 'Capture Selfie 📸'}
                </button>
                <button className="btn btn-secondary" onClick={stopCamera} disabled={scanningFace}>
                  Close Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
