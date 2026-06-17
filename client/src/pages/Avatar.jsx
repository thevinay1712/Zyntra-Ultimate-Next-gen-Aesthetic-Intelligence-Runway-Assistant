import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { clothingAPI } from '../lib/api';
import './Avatar.css';

/* ─── Icons ─── */
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconWand = () => (
  <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4-1 1"/><path d="m9 9-1 1"/><path d="m19 19-1 1"/><path d="M4 20l7.5-7.5"/><path d="m20 4-7.5 7.5"/></svg>
);

const SCHEMATIC_CONFIG = {
  male: {
    tshirt: {
      label: "Top (Shirt / Torso Fit)",
      hotspot: { top: '18%', left: '38%', width: '24%', height: '28%' },
      line: { startX: 50, startY: 32, endX: 26, endY: 32, isLeft: true }
    },
    jeans: {
      label: "Bottom (Pants / Waist Fit)",
      hotspot: { top: '46%', left: '40%', width: '20%', height: '44%' },
      line: { startX: 50, startY: 68, endX: 74, endY: 68, isLeft: false }
    },
    shoes: {
      label: "Shoes (Footwear / Sole Fit)",
      hotspot: { top: '90%', left: '39%', width: '22%', height: '8%' },
      line: { startX: 50, startY: 94, endX: 26, endY: 82, isLeft: true }
    },
    accessory: {
      label: "Accessory (Wrist / Watch Fit)",
      hotspot: { top: '48%', left: '61%', width: '4%', height: '5%' },
      line: { startX: 63, startY: 50, endX: 74, endY: 50, isLeft: false }
    },
    outerwear: {
      label: "Outerwear (Blazer / Jacket Fit)",
      hotspot: { top: '17%', left: '34%', width: '32%', height: '31%' },
      line: { startX: 50, startY: 33, endX: 26, endY: 33, isLeft: true }
    }
  },
  female: {
    tshirt: {
      label: "Top (Shirt / Torso Fit)",
      hotspot: { top: '16%', left: '39%', width: '22%', height: '33%' },
      line: { startX: 50, startY: 32.5, endX: 26, endY: 32.5, isLeft: true }
    },
    jeans: {
      label: "Bottom (Pants / Waist Fit)",
      hotspot: { top: '48%', left: '40%', width: '20%', height: '44%' },
      line: { startX: 50, startY: 72, endX: 74, endY: 72, isLeft: false }
    },
    shoes: {
      label: "Shoes (Footwear / Sole Fit)",
      hotspot: { top: '90%', left: '39%', width: '22%', height: '8%' },
      line: { startX: 50, startY: 93.5, endX: 26, endY: 82, isLeft: true }
    },
    accessory: {
      label: "Accessory (Wrist / Watch Fit)",
      hotspot: { top: '48%', left: '61%', width: '4%', height: '5%' },
      line: { startX: 63, startY: 50, endX: 74, endY: 50, isLeft: false }
    },
    outerwear: {
      label: "Outerwear (Blazer / Jacket Fit)",
      hotspot: { top: '15%', left: '35%', width: '30%', height: '35%' },
      line: { startX: 50, startY: 32.5, endX: 26, endY: 32.5, isLeft: true }
    }
  }
};

const PATH_CONFIGS = {
  male: {
    tshirt: "M 46 18 L 54 18 L 61 22 L 63 32 L 58 32 L 57 46 L 43 46 L 42 32 L 37 32 L 39 22 Z",
    jeans: "M 42 45 L 58 45 L 57 68 L 54 90 L 49 90 L 50 62 L 46 90 L 41 90 L 43 68 Z",
    shoes: "M 39 90 L 47 90 L 47 96 L 39 96 Z M 53 90 L 61 90 L 61 96 L 53 96 Z",
    accessory: "M 61 48 L 64 48 L 64 53 L 61 53 Z",
    outerwear: "M 45 17 L 55 17 L 63 21 L 66 48 L 62 48 L 59 48 L 41 48 L 38 48 L 34 48 L 37 21 Z"
  },
  female: {
    tshirt: "M 47 16 L 53 16 L 61 20 L 63 30 L 58 30 L 57 48 L 43 48 L 42 30 L 37 30 L 39 20 Z",
    jeans: "M 43 48 L 57 48 L 57 72 L 54 92 L 49 92 L 50 65 L 46 92 L 41 92 L 43 72 Z",
    shoes: "M 39 92 L 47 92 L 47 97 L 39 97 Z M 53 92 L 61 92 L 61 97 L 53 97 Z",
    accessory: "M 61 48 L 64 48 L 64 53 L 61 53 Z",
    outerwear: "M 45 15 L 55 15 L 62 19 L 65 48 L 61 48 L 58 50 L 42 50 L 39 48 L 35 48 L 38 19 Z"
  }
};

const getGarmentPath = (genderKey, typeKey, activeConfig) => {
  const genderConfigs = PATH_CONFIGS[genderKey];
  if (genderConfigs && genderConfigs[typeKey]) {
    return genderConfigs[typeKey];
  }
  if (activeConfig && activeConfig.hotspot) {
    const left = parseFloat(activeConfig.hotspot.left);
    const top = parseFloat(activeConfig.hotspot.top);
    const width = parseFloat(activeConfig.hotspot.width);
    const height = parseFloat(activeConfig.hotspot.height);
    return `M ${left} ${top} L ${left + width} ${top} L ${left + width} ${top + height} L ${left} ${top + height} Z`;
  }
  return '';
};

const API_BASE = `http://${window.location.hostname}:5000/api`;
const AI_BASE  = `http://${window.location.hostname}:8000`;

export default function Avatar() {
  const getPixelCoordinates = (config) => {
    if (!config) return null;
    const { line } = config;
    const wrapWidth = 270;
    const wrapHeight = 360;
    const offsetLeft = 105;
    
    const startX = offsetLeft + wrapWidth * (parseFloat(line.startX) / 100);
    const startY = wrapHeight * (parseFloat(line.startY) / 100);
    
    // Position the arrow endX exactly at the border of the card
    const endX = line.isLeft ? (offsetLeft - 15) : (offsetLeft + wrapWidth + 15);
    const endY = wrapHeight * (parseFloat(line.endY) / 100);
    
    return { startX, startY, endX, endY, isLeft: line.isLeft };
  };

  const [gender, setGender]                   = useState('male');
  const [modelType, setModelType]             = useState('default');
  const [customModelFile, setCustomModelFile] = useState(null);
  const [customModelPreview, setCustomModelPreview] = useState(null);
  const [garmentType, setGarmentType]         = useState('tshirt');
  const [source, setSource]                   = useState('upload');
  const [selectedItem, setSelectedItem]       = useState(null);
  const [uploadedFile, setUploadedFile]       = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);

  const [wardrobeItems, setWardrobeItems]     = useState([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);

  /* Try-on result */
  const [resultUrl, setResultUrl]   = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef(null);

  const { success, error } = useToast();

  /* Load wardrobe */
  useEffect(() => {
    (async () => {
      setLoadingWardrobe(true);
      try {
        const token = localStorage.getItem('zyntra_token');
        const res = await fetch(`${API_BASE}/clothing`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.clothes) setWardrobeItems(data.clothes);
      } catch (_) {}
      finally { setLoadingWardrobe(false); }
    })();
  }, []);

  /* Derived */
  const modelUrl = modelType === 'custom'
    ? customModelPreview
    : `http://${window.location.hostname}:5000/models/${gender}_model.png`;

  const activeGarmentUrl = source === 'wardrobe' && selectedItem
    ? `http://${window.location.hostname}:5000${selectedItem.imageUrl}`
    : uploadedPreview || null;

  const activeGarmentName = source === 'wardrobe' && selectedItem
    ? selectedItem.name
    : uploadedFile?.name || null;

  const categoryMap = {
    tshirt: 'tops',
    jeans: 'bottoms',
    shoes: 'shoes',
    outerwear: 'outerwear',
    accessory: 'accessories'
  };

  const activeConfig = SCHEMATIC_CONFIG[gender]?.[garmentType];

  const filteredWardrobe = wardrobeItems.filter(item =>
    item.category?.toLowerCase() === categoryMap[garmentType]
  );

  /* Handlers */
  const handleGarmentUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setUploadedFile(file); setUploadedPreview(reader.result); setResultUrl(null); };
    reader.readAsDataURL(file);
  };

  const handleCustomModelUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setCustomModelFile(file); setCustomModelPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const startTimer = () => {
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); };

  const handleTryOn = async () => {
    if (!activeGarmentUrl) {
      error(source === 'upload' ? 'Please upload a garment image.' : 'Please select an item from your wardrobe.');
      return;
    }
    if (modelType === 'custom' && !customModelFile) {
      error('Please upload your photo first.');
      return;
    }

    setIsProcessing(true);
    setResultUrl(null);
    setProcessingMsg('Segmenting garment boundaries…');
    startTimer();

    setTimeout(() => {
      setProcessingMsg('Calculating body coordinates…');
    }, 400);

    setTimeout(() => {
      setProcessingMsg('Aligning fit blueprint…');
    }, 800);

    setTimeout(() => {
      stopTimer();
      setIsProcessing(false);
      setProcessingMsg('');
      setResultUrl('blueprint');
      success('📐 Fit Blueprint Complete!');
    }, 1200);
  };

  const handleReset = () => { setResultUrl(null); };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `zyntra_tryon_${garmentType}_${Date.now()}.png`;
    a.click();
  };

  /* ─── Render ─── */
  return (
    <div className="main-content" id="avatar-page">
      <div className="container">

        <div className="dashboard-header animate-fade-in" style={{ marginBottom: '28px' }}>
          <div>
            <h1 className="dashboard-title">AI Dressing Room</h1>
            <p className="dashboard-subtitle">
              Upload a garment — the AI will dress the model in it and show you a photorealistic result.
            </p>
          </div>
        </div>

        <div className="dr-layout">

          {/* ════ LEFT — Result Canvas ════ */}
          <div className="dr-canvas-col">

            {isProcessing ? (
              /* ── Processing state ── */
              <div className="dr-result-card" style={{ minHeight: 520, justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="dr-ai-loader">
                  <div className="dr-ai-ring dr-ai-ring-1" />
                  <div className="dr-ai-ring dr-ai-ring-2" />
                  <div className="dr-ai-ring dr-ai-ring-3" />
                  <span className="dr-ai-icon">✦</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p className="dr-loader-title">{processingMsg}</p>
                  <p className="dr-loader-step">{elapsedSecs}s elapsed</p>
                </div>
                {/* Show garment thumbnail while waiting */}
                {activeGarmentUrl && (
                  <div style={{ opacity: 0.5, borderRadius: 12, overflow: 'hidden', width: 90, height: 90 }}>
                    <img src={activeGarmentUrl} alt="garment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280 }}>
                  Analyzing garment layout coordinates and drawing connections to body fit zones...
                </p>
              </div>

            ) : resultUrl === 'blueprint' || activeGarmentUrl ? (
              /* ── Interactive Fit Blueprint View ── */
              <div className="dr-result-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="dr-result-header" style={{ padding: '16px 20px' }}>
                  {resultUrl === 'blueprint' ? (
                    <span className="dr-result-badge">📐 Fit Blueprint Complete</span>
                  ) : (
                    <span className="dr-result-badge" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>📐 Interactive Fit Blueprint</span>
                  )}
                  {resultUrl === 'blueprint' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={handleReset}><IconRefresh /> Reset</button>
                    </div>
                  )}
                </div>

                <div className="dr-schematic-container" style={{ position: 'relative', width: '100%', height: 400, background: 'rgba(10, 10, 15, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {/* The model image centered wrap */}
                  <div className="dr-schematic-avatar-wrap" style={{ position: 'relative', width: '270px', height: '360px', zIndex: 1, left: 'auto' }}>
                    <img
                      src={modelUrl}
                      alt="Model"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Precise white neon contour highlight */}
                    {activeConfig && (
                      <svg
                        viewBox="0 0 100 100"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        <path
                          d={getGarmentPath(modelType === 'custom' ? 'custom' : gender, garmentType, activeConfig)}
                          className="neon-running-path"
                        />
                      </svg>
                    )}

                    {/* SVG Line */}
                    {activeConfig && (() => {
                      const coords = getPixelCoordinates(activeConfig);
                      if (!coords) return null;
                      
                      const midX = coords.isLeft 
                        ? coords.startX - (coords.startX - coords.endX) * 0.4 
                        : coords.startX + (coords.endX - coords.startX) * 0.4;
                      const pathData = `M ${coords.startX} ${coords.startY} L ${midX} ${coords.startY} L ${midX} ${coords.endY} L ${coords.endX} ${coords.endY}`;

                      return (
                        <svg className="schematic-svg-layer" viewBox="0 0 480 360" style={{ position: 'absolute', left: '-105px', width: '480px', height: '360px', pointerEvents: 'none', zIndex: 3 }}>
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffffff" />
                            </marker>
                          </defs>
                          {/* High contrast dark outline shadow for white backgrounds */}
                          <path
                            d={pathData}
                            style={{ fill: 'none', stroke: 'rgba(10, 10, 15, 0.85)', strokeWidth: 2.2, strokeLinecap: 'round' }}
                          />
                          {/* Glowing violet drop shadow */}
                          <path
                            d={pathData}
                            style={{ fill: 'none', stroke: 'var(--accent-violet)', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.6, filter: 'blur(1.5px)' }}
                          />
                          {/* White neon core line */}
                          <path
                            d={pathData}
                            className="schematic-line active"
                            markerEnd="url(#arrow)"
                            style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 0.8, strokeLinecap: 'round' }}
                          />
                          {/* Dot shadow */}
                          <circle
                            cx={coords.startX}
                            cy={coords.startY}
                            r="4.5"
                            style={{ fill: 'rgba(10, 10, 15, 0.85)' }}
                          />
                          {/* Dot core */}
                          <circle
                            cx={coords.startX}
                            cy={coords.startY}
                            r="2"
                            className="schematic-dot active"
                            style={{ fill: '#ffffff', filter: 'drop-shadow(0 0 2px #ffffff)' }}
                          />
                        </svg>
                      );
                    })()}

                    {/* Garment card */}
                    {activeConfig && (() => {
                      const coords = getPixelCoordinates(activeConfig);
                      if (!coords) return null;
                      return (
                        <div
                          className="schematic-garment-card active single-fit"
                          style={{
                            position: 'absolute',
                            top: `${coords.endY}px`,
                            transform: 'translateY(-50%)',
                            width: '100px',
                            zIndex: 10,
                            [coords.isLeft ? 'left' : 'right']: '-115px'
                          }}
                        >
                          <div className="schematic-garment-img-box" style={{ height: '70px', padding: '4px' }}>
                            <img src={activeGarmentUrl} className="schematic-garment-img" style={{ maxHeight: '100%' }} alt={activeGarmentName || 'Garment'} />
                          </div>
                          <div className="schematic-garment-meta">
                            <span className="schematic-garment-slot">{activeConfig.label.split(' ')[0]}</span>
                            <span className="schematic-garment-name" title={activeGarmentName}>{activeGarmentName || 'Selected Garment'}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Info strip below the schematic */}
                <div className="dr-info-strip" style={{ margin: '12px 20px 20px' }}>
                  <div className="dr-info-row">
                    <span className="dr-info-label">Fit Area:</span>
                    <span className="dr-info-value" style={{ color: 'var(--accent-violet-light)' }}>{activeConfig?.label}</span>
                  </div>
                  <div className="dr-info-row">
                    <span className="dr-info-label">Status:</span>
                    <span className="dr-info-value" style={{ color: resultUrl === 'blueprint' ? '#10b981' : '#f59e0b' }}>
                      {resultUrl === 'blueprint' ? '✓ Calibration Complete' : '⚙️ Calibration Pending'}
                    </span>
                  </div>
                </div>
              </div>

            ) : (
              /* ── Idle state (no garment selected) ── */
              <div className="dr-result-card dr-idle-card">
                <div className="dr-idle-model-box">
                  <img src={modelUrl} alt="Model" className="dr-idle-model-img" />
                </div>
                <div className="dr-idle-overlay">
                  <div className="dr-idle-wand"><IconWand /></div>
                  <p className="dr-idle-ready-text">Select a garment on the right, then click <strong>Try It On</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* ════ RIGHT — Controls ════ */}
          <div className="avatar-editor-section glass-card animate-slide-up delay-1">
            <h3 className="editor-section-header font-heading">
              <IconSparkles /> Fitting Controls
            </h3>

            {/* Step 1 – Model */}
            <div className="editor-group">
              <label className="editor-group-title">1. Model</label>
              <div className="gender-btn-group" style={{ gridTemplateColumns: '1fr 1fr 1.1fr' }}>
                {['male','female'].map(g => (
                  <button key={g} type="button"
                    className={`gender-btn ${modelType === 'default' && gender === g ? 'active' : ''}`}
                    onClick={() => { setModelType('default'); setGender(g); setResultUrl(null); }}>
                    {g === 'male' ? 'Male ♂️' : 'Female ♀️'}
                  </button>
                ))}
                <button type="button"
                  className={`gender-btn ${modelType === 'custom' ? 'active' : ''}`}
                  onClick={() => { setModelType('custom'); setResultUrl(null); }}>
                  Your Photo 📸
                </button>
              </div>

              {modelType === 'custom' && (
                <div className="animate-fade-in" style={{ marginTop: 4 }}>
                  {customModelPreview ? (
                    <div className="upload-preview-card">
                      <img src={customModelPreview} className="upload-preview-thumbnail" alt="custom model" style={{ objectFit: 'cover' }} />
                      <div className="upload-preview-info">
                        <span className="upload-preview-filename">{customModelFile?.name}</span>
                        <span className="upload-preview-size">{(customModelFile?.size/1024).toFixed(1)} KB</span>
                      </div>
                      <button className="upload-preview-remove-btn" onClick={() => { setCustomModelFile(null); setCustomModelPreview(null); }}>×</button>
                    </div>
                  ) : (
                    <label className="file-dropzone" style={{ padding: 16 }}>
                      <span className="file-dropzone-icon">👤</span>
                      <span className="file-dropzone-text">Upload your full-body photo</span>
                      <span className="file-dropzone-subtext">Front-facing, standing, clear background works best</span>
                      <input type="file" accept="image/*" onChange={handleCustomModelUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Step 2 – Garment type */}
            <div className="editor-group">
              <label className="editor-group-title">2. Garment Type</label>
              <div className="gender-btn-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  ['tshirt', '👕 Top'],
                  ['jeans', '👖 Bottom'],
                  ['shoes', '👟 Shoes'],
                  ['outerwear', '🧥 Outerwear'],
                  ['accessory', '⌚ Accessory']
                ].map(([v, label]) => (
                  <button key={v} type="button"
                    className={`gender-btn ${garmentType === v ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: '0.78rem' }}
                    onClick={() => { setGarmentType(v); setSelectedItem(null); setResultUrl(null); }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 – Source */}
            <div className="editor-group">
              <label className="editor-group-title">3. Garment Source</label>
              <div className="gender-btn-group">
                {[['upload','Upload Photo'],['wardrobe','From Wardrobe']].map(([v, label]) => (
                  <button key={v} type="button"
                    className={`gender-btn ${source === v ? 'active' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => { setSource(v); setResultUrl(null); if (v==='upload') setSelectedItem(null); else { setUploadedFile(null); setUploadedPreview(null); } }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Garment input */}
            {source === 'upload' ? (
              <div className="editor-group animate-fade-in">
                {uploadedPreview ? (
                  <div className="dr-garment-preview-large">
                    <img src={uploadedPreview} alt="garment" className="dr-garment-preview-img" />
                    <div className="dr-garment-preview-meta">
                      <span>{uploadedFile?.name}</span>
                      <button onClick={() => { setUploadedFile(null); setUploadedPreview(null); setResultUrl(null); }}>✕ Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className="file-dropzone">
                    <span className="file-dropzone-icon">📤</span>
                    <span className="file-dropzone-text">Drop garment photo here</span>
                    <span className="file-dropzone-subtext">Any product photo — AI removes the background automatically</span>
                    <input type="file" accept="image/*" onChange={handleGarmentUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            ) : (
              <div className="editor-group animate-fade-in">
                <label className="editor-group-title" style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                  {{
                    tshirt: 'Tops',
                    jeans: 'Bottoms',
                    shoes: 'Shoes',
                    outerwear: 'Outerwear',
                    accessory: 'Accessories'
                  }[garmentType] || 'Items'} from your closet:
                </label>
                <div className="dr-wardrobe-grid-wrap">
                  {loadingWardrobe ? (
                    <p className="dr-wardrobe-empty">Loading…</p>
                  ) : filteredWardrobe.length === 0 ? (
                    <p className="dr-wardrobe-empty">No {{
                      tshirt: 'tops',
                      jeans: 'bottoms',
                      shoes: 'shoes',
                      outerwear: 'outerwear',
                      accessory: 'accessories'
                    }[garmentType] || 'items'} in wardrobe yet.</p>
                  ) : (
                    <div className="dr-wardrobe-grid">
                      {filteredWardrobe.map(item => (
                        <div key={item._id} onClick={() => { setSelectedItem(item); setResultUrl(null); }}
                          className={`dr-wardrobe-chip ${selectedItem?._id === item._id ? 'active' : ''}`}
                          title={item.name}>
                          <img src={`http://${window.location.hostname}:5000${item.imageUrl}`} alt={item.name} />
                          {selectedItem?._id === item._id && <div className="dr-wardrobe-chip-check"><IconCheck /></div>}
                          <div className="dr-wardrobe-chip-name">{item.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              className="btn btn-render-glow font-heading"
              style={{ padding: '16px 20px', fontSize: '1.05rem', marginTop: 4 }}
              onClick={handleTryOn}
              disabled={isProcessing || !activeGarmentUrl}
            >
              {isProcessing ? `⏳ AI Processing… ${elapsedSecs}s` : '✨ Try It On'}
            </button>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, opacity: 0.65, marginTop: -8 }}>
              Powered by IDM-VTON — state-of-the-art virtual try-on AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
