import { useState, useEffect, useRef, useCallback } from 'react';
import { tryOnAPI, AI_BASE } from '../lib/api';
import { useToast } from '../context/ToastContext';
import './TryOn.css';

/* ── Icons ── */
const IconWand       = () => <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4-1 1"/><path d="m9 9-1 1"/><path d="m19 19-1 1"/><path d="M4 20l7.5-7.5"/><path d="m20 4-7.5 7.5"/></svg>;
const IconSparkles   = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
const IconDownload   = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconRefresh    = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconChevronL   = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconCheck      = () => <svg viewBox="0 0 24 24" className="icon icon-sm" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconUser       = () => <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const POLL_INTERVAL_MS = 2500;
const SERVER_BASE = `http://${window.location.hostname}:5000`;

const SCHEMATIC_CONFIG = {
  male_01: {
    outerwear: {
      hotspot: { top: '17%', left: '34%', width: '32%', height: '31%' },
      line: { startX: 50, startY: 33, endX: 28, endY: 23, isLeft: true }
    },
    top: {
      hotspot: { top: '18%', left: '38%', width: '24%', height: '28%' },
      line: { startX: 50, startY: 33, endX: 28, endY: 51, isLeft: true }
    },
    shoes: {
      hotspot: { top: '90%', left: '39%', width: '22%', height: '8%' },
      line: { startX: 50, startY: 93.5, endX: 28, endY: 79, isLeft: true }
    },
    accessory: {
      hotspot: { top: '48%', left: '61%', width: '4%', height: '5%' },
      line: { startX: 63, startY: 50, endX: 72, endY: 33, isLeft: false }
    },
    bottom: {
      hotspot: { top: '45%', left: '40%', width: '20%', height: '47%' },
      line: { startX: 50, startY: 69, endX: 72, endY: 67, isLeft: false }
    }
  },
  female_01: {
    outerwear: {
      hotspot: { top: '15%', left: '35%', width: '30%', height: '35%' },
      line: { startX: 50, startY: 32.5, endX: 28, endY: 23, isLeft: true }
    },
    top: {
      hotspot: { top: '16%', left: '39%', width: '22%', height: '33%' },
      line: { startX: 50, startY: 32.5, endX: 28, endY: 51, isLeft: true }
    },
    shoes: {
      hotspot: { top: '90%', left: '39%', width: '22%', height: '8%' },
      line: { startX: 50, startY: 93.5, endX: 28, endY: 79, isLeft: true }
    },
    accessory: {
      hotspot: { top: '48%', left: '61%', width: '4%', height: '5%' },
      line: { startX: 63, startY: 50, endX: 72, endY: 33, isLeft: false }
    },
    bottom: {
      hotspot: { top: '48%', left: '40%', width: '20%', height: '48%' },
      line: { startX: 50, startY: 72, endX: 72, endY: 67, isLeft: false }
    }
  }
};

const PATH_CONFIGS = {
  male_01: {
    top: "M 46 18 L 54 18 L 61 22 L 63 32 L 58 32 L 57 46 L 43 46 L 42 32 L 37 32 L 39 22 Z",
    bottom: "M 42 45 L 58 45 L 57 68 L 54 90 L 49 90 L 50 62 L 46 90 L 41 90 L 43 68 Z",
    shoes: "M 39 90 L 47 90 L 47 96 L 39 96 Z M 53 90 L 61 90 L 61 96 L 53 96 Z",
    accessory: "M 61 48 L 64 48 L 64 53 L 61 53 Z",
    outerwear: "M 45 17 L 55 17 L 63 21 L 66 48 L 62 48 L 59 48 L 41 48 L 38 48 L 34 48 L 37 21 Z"
  },
  female_01: {
    top: "M 47 16 L 53 16 L 61 20 L 63 30 L 58 30 L 57 48 L 43 48 L 42 30 L 37 30 L 39 20 Z",
    bottom: "M 43 48 L 57 48 L 57 72 L 54 92 L 49 92 L 50 65 L 46 92 L 41 92 L 43 72 Z",
    shoes: "M 39 92 L 47 92 L 47 97 L 39 97 Z M 53 92 L 61 92 L 61 97 L 53 97 Z",
    accessory: "M 61 48 L 64 48 L 64 53 L 61 53 Z",
    outerwear: "M 45 15 L 55 15 L 62 19 L 65 48 L 61 48 L 58 50 L 42 50 L 39 48 L 35 48 L 38 19 Z"
  }
};

const getGarmentPath = (avatarId, slotKey, activeConfig) => {
  const avatarConfigs = PATH_CONFIGS[avatarId];
  if (avatarConfigs && avatarConfigs[slotKey]) {
    return avatarConfigs[slotKey];
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

export default function TryOn({ outfit = null, onClose = null }) {
  const [avatars, setAvatars]         = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  const [activeTab, setActiveTab]     = useState('schematic'); // 'schematic' | 'ai'
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('top');

  const [jobId, setJobId]             = useState(null);
  const [jobStatus, setJobStatus]     = useState(null); // queued|processing|done|failed
  const [progress, setProgress]       = useState('');
  const [queuePos, setQueuePos]       = useState(0);
  const [resultUrl, setResultUrl]     = useState(null);
  const [jobError, setJobError]       = useState(null);

  const [showComparison, setShowComparison] = useState(false);
  const [elapsedSecs, setElapsedSecs]   = useState(0);
  const timerRef  = useRef(null);
  const pollRef   = useRef(null);

  const { success, error: toastError } = useToast();

  // ── Load avatars from ai-service ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`http://${window.location.hostname}:8000/avatars`);
        const data = await res.json();
        setAvatars(data.avatars || []);
        if (data.avatars?.length > 0) setSelectedAvatar(data.avatars[0]);
      } catch (e) {
        console.warn('Could not load avatars:', e);
        setAvatars([]);
      } finally {
        setLoadingAvatars(false);
      }
    })();
  }, []);

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = () => {
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = useCallback((jid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await tryOnAPI.getStatus(jid);
        const data = res.data;
        setJobStatus(data.status);
        setProgress(data.progress || '');
        setQueuePos(data.queuePos || data.queue_pos || 0);

        if (data.status === 'done') {
          clearInterval(pollRef.current);
          stopTimer();
          const url = data.resultUrl || data.result_url;
          setResultUrl(url.startsWith('/') ? `${SERVER_BASE}${url}` : url);
          success('✨ Try-On complete!');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          stopTimer();
          setJobError(data.error || 'Generation failed. Please try again.');
          toastError('Try-On failed.');
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, POLL_INTERVAL_MS);
  }, [success, toastError]);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  }, []);

  // ── Generate try-on ───────────────────────────────────────────────────────
  const handleGenerate = async (regenerate = false) => {
    if (!selectedAvatar) {
      toastError('Please select an avatar first');
      return;
    }
    if (!outfit) {
      toastError('No outfit provided for try-on');
      return;
    }

    // Build items list from outfit
    const garmentItems = [];
    const addItem = (item) => {
      if (!item) return;
      garmentItems.push({
        garment_image_url: item.imageUrl,
        category:    item.category,
        subcategory: item.subcategory || '',
        name:        item.name,
        item_id:     item._id,
      });
    };

    addItem(outfit.top);
    addItem(outfit.bottom);
    addItem(outfit.outerwear);
    addItem(outfit.shoes);
    addItem(outfit.accessory);

    if (garmentItems.length === 0) {
      toastError('No garments in this outfit');
      return;
    }

    // Reset state
    setResultUrl(null);
    setJobError(null);
    setJobStatus('queued');
    setProgress('Submitting job…');
    startTimer();
    setActiveTab('ai');

    try {
      const res = await tryOnAPI.generate({
        avatarId:    selectedAvatar.id,
        itemIds:     garmentItems.map(g => g.item_id),
        seed:        regenerate ? Math.floor(Math.random() * 99999) : undefined,
      });
      const data = res.data;

      // Instant cache hit
      if (data.status === 'done' && data.resultUrl) {
        stopTimer();
        setJobStatus('done');
        setProgress('Complete');
        const url = data.resultUrl;
        setResultUrl(url.startsWith('/') ? `${SERVER_BASE}${url}` : url);
        success('✨ Served from cache!');
        return;
      }

      setJobId(data.jobId);
      setJobStatus(data.status || 'queued');
      setProgress('Waiting in queue…');
      startPolling(data.jobId);

    } catch (e) {
      stopTimer();
      setJobStatus('failed');
      const msg = e.response?.data?.message || e.message || 'Try-on service unavailable';
      setJobError(msg);
      toastError(msg);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'zyntra-tryon.png';
    a.click();
  };

  // ── Progress label mapping ────────────────────────────────────────────────
  const STAGE_LABELS = {
    'Waiting in queue…':        { icon: '⏳', color: 'amber' },
    'Starting generation…':     { icon: '🔄', color: 'violet' },
    'Segmenting garment…':      { icon: '✂️', color: 'violet' },
    'Generating top try-on':    { icon: '👕', color: 'mint' },
    'Generating bottom try-on': { icon: '👖', color: 'mint' },
    'Generating dress try-on':  { icon: '👗', color: 'mint' },
    'Applying accessories…':    { icon: '💎', color: 'coral' },
    'Retrying…':                { icon: '🔁', color: 'amber' },
    'Done!':                    { icon: '✅', color: 'mint' },
    'Complete':                 { icon: '✅', color: 'mint' },
  };

  const stageInfo = STAGE_LABELS[progress] || { icon: '⚙️', color: 'violet' };
  const isProcessing = jobStatus === 'queued' || jobStatus === 'processing';

  const formatElapsed = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Outfit items for "before" comparison ─────────────────────────────────
  const outfitItems = outfit ? Object.values(outfit).filter(Boolean) : [];

  return (
    <div className="tryon-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="tryon-modal">
        {/* Header */}
        <div className="tryon-header">
          <button className="tryon-back-btn" onClick={onClose} aria-label="Close">
            <IconChevronL />
          </button>
          <div className="tryon-title">
            <IconWand />
            <span>AI Dressing Room</span>
          </div>
          <div className="tryon-header-badge">
            <IconSparkles />
            <span>Virtual Try-On</span>
          </div>
        </div>

        <div className="tryon-body">
          {/* Left Panel: Avatar + Controls */}
          <div className="tryon-left">
            {/* Avatar Picker */}
            <div className="tryon-section">
              <h3 className="tryon-section-title">
                <IconUser />
                Choose Avatar
              </h3>
              {loadingAvatars ? (
                <div className="tryon-avatar-loading">
                  <div className="spinner-sm" />
                  <span>Loading avatars…</span>
                </div>
              ) : avatars.length === 0 ? (
                <div className="tryon-avatar-empty">AI service unavailable</div>
              ) : (
                <div className="tryon-avatar-grid">
                  {avatars.map(av => (
                    <button
                      key={av.id}
                      className={`tryon-avatar-card ${selectedAvatar?.id === av.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(av)}
                    >
                      <img
                        src={`http://${window.location.hostname}:8000/avatars/${av.id}/thumb`}
                        alt={av.label}
                        className="tryon-avatar-img"
                        onError={e => { e.target.style.display='none'; }}
                      />
                      <div className="tryon-avatar-info">
                        <span className="tryon-avatar-label">{av.label}</span>
                        <span className={`tryon-avatar-badge badge-${av.gender}`}>
                          {av.gender}
                        </span>
                      </div>
                      {selectedAvatar?.id === av.id && (
                        <div className="tryon-avatar-check"><IconCheck /></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Outfit Items Preview */}
            {outfitItems.length > 0 && (
              <div className="tryon-section">
                <h3 className="tryon-section-title">Outfit Items</h3>
                <div className="tryon-items-list">
                  {outfit?.top && (
                    <div className="tryon-item-chip">
                      <img src={`${SERVER_BASE}${outfit.top.imageUrl}`} alt={outfit.top.name} />
                      <span>{outfit.top.name}</span>
                      <span className="chip-cat">Top</span>
                    </div>
                  )}
                  {outfit?.bottom && (
                    <div className="tryon-item-chip">
                      <img src={`${SERVER_BASE}${outfit.bottom.imageUrl}`} alt={outfit.bottom.name} />
                      <span>{outfit.bottom.name}</span>
                      <span className="chip-cat">Bottom</span>
                    </div>
                  )}
                  {outfit?.outerwear && (
                    <div className="tryon-item-chip">
                      <img src={`${SERVER_BASE}${outfit.outerwear.imageUrl}`} alt={outfit.outerwear.name} />
                      <span>{outfit.outerwear.name}</span>
                      <span className="chip-cat">Outer</span>
                    </div>
                  )}
                  {outfit?.shoes && (
                    <div className="tryon-item-chip">
                      <img src={`${SERVER_BASE}${outfit.shoes.imageUrl}`} alt={outfit.shoes.name} />
                      <span>{outfit.shoes.name}</span>
                      <span className="chip-cat chip-acc">Shoes ≈</span>
                    </div>
                  )}
                  {outfit?.accessory && (
                    <div className="tryon-item-chip">
                      <img src={`${SERVER_BASE}${outfit.accessory.imageUrl}`} alt={outfit.accessory.name} />
                      <span>{outfit.accessory.name}</span>
                      <span className="chip-cat chip-acc">Acc ≈</span>
                    </div>
                  )}
                </div>
                <p className="tryon-acc-note">≈ Accessories shown approximately</p>
              </div>
            )}

            {/* Generate Button */}
            <div className="tryon-section">
              <button
                className="tryon-generate-btn"
                onClick={() => handleGenerate(false)}
                disabled={isProcessing || !selectedAvatar}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner-sm" />
                    <span>Generating… {formatElapsed(elapsedSecs)}</span>
                  </>
                ) : (
                  <>
                    <IconSparkles />
                    <span>{resultUrl ? 'Re-Generate' : 'Try It On'}</span>
                  </>
                )}
              </button>
              {resultUrl && !isProcessing && (
                <button
                  className="tryon-regen-btn"
                  onClick={() => handleGenerate(true)}
                  title="Generate with a different seed for variety"
                >
                  <IconRefresh />
                  <span>New Variation</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Result / Loading / Schematic */}
          <div className="tryon-right">
            {!isProcessing && (
              <div className="tryon-main-tabs">
                <button
                  type="button"
                  className={`main-tab ${activeTab === 'schematic' ? 'active' : ''}`}
                  onClick={() => setActiveTab('schematic')}
                >
                  📐 Fit Blueprint
                </button>
                <button
                  type="button"
                  className={`main-tab ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  ✨ Runway AI Render
                </button>
              </div>
            )}

            {/* Active Tab: Schematic Fit Blueprint */}
            {!isProcessing && activeTab === 'schematic' && (
              <div className="tryon-schematic-view">
                <div className="schematic-header-text">
                  <h3>Interactive Fit Blueprint</h3>
                  <p>Hover over or click any garment card to highlight its fitting region and anchor points on the model.</p>
                </div>

                <div className="tryon-schematic-container">
                  {/* Left Column: Outerwear, Top, Shoes */}
                  <div className="schematic-col-left">
                    {outfit?.outerwear && (
                      <div
                        className={`schematic-garment-card ${hoveredSlot === 'outerwear' || selectedSlot === 'outerwear' ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSlot('outerwear')}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => setSelectedSlot('outerwear')}
                      >
                        <div className="schematic-garment-img-box">
                          <img src={`${SERVER_BASE}${outfit.outerwear.imageUrl}`} className="schematic-garment-img" alt={outfit.outerwear.name} />
                        </div>
                        <div className="schematic-garment-meta">
                          <span className="schematic-garment-slot">Outerwear</span>
                          <span className="schematic-garment-name">{outfit.outerwear.name}</span>
                        </div>
                      </div>
                    )}
                    {outfit?.top && (
                      <div
                        className={`schematic-garment-card ${hoveredSlot === 'top' || selectedSlot === 'top' ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSlot('top')}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => setSelectedSlot('top')}
                      >
                        <div className="schematic-garment-img-box">
                          <img src={`${SERVER_BASE}${outfit.top.imageUrl}`} className="schematic-garment-img" alt={outfit.top.name} />
                        </div>
                        <div className="schematic-garment-meta">
                          <span className="schematic-garment-slot">Top</span>
                          <span className="schematic-garment-name">{outfit.top.name}</span>
                        </div>
                      </div>
                    )}
                    {outfit?.shoes && (
                      <div
                        className={`schematic-garment-card ${hoveredSlot === 'shoes' || selectedSlot === 'shoes' ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSlot('shoes')}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => setSelectedSlot('shoes')}
                      >
                        <div className="schematic-garment-img-box">
                          <img src={`${SERVER_BASE}${outfit.shoes.imageUrl}`} className="schematic-garment-img" alt={outfit.shoes.name} />
                        </div>
                        <div className="schematic-garment-meta">
                          <span className="schematic-garment-slot">Shoes</span>
                          <span className="schematic-garment-name">{outfit.shoes.name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Center Column: Avatar Image */}
                  <div className="tryon-schematic-avatar-wrap">
                    {selectedAvatar ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={`http://${window.location.hostname}:8000/avatars/${selectedAvatar.id}/thumb`}
                          alt={selectedAvatar.label}
                          className="tryon-schematic-avatar"
                        />
                        {/* Precise white neon contour highlight for active/hovered garments */}
                        {Object.entries(SCHEMATIC_CONFIG[selectedAvatar.id] || SCHEMATIC_CONFIG.male_01).map(([slot, data]) => {
                          if (!outfit?.[slot]) return null;
                          const isActive = hoveredSlot === slot || selectedSlot === slot;
                          if (!isActive) return null;
                          return (
                            <svg
                              key={`contour-${slot}`}
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
                                d={getGarmentPath(selectedAvatar.id, slot, data)}
                                className="neon-running-path"
                              />
                            </svg>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="tryon-idle-placeholder">
                        <IconUser />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Accessory, Bottom */}
                  <div className="schematic-col-right">
                    {outfit?.accessory && (
                      <div
                        className={`schematic-garment-card ${hoveredSlot === 'accessory' || selectedSlot === 'accessory' ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSlot('accessory')}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => setSelectedSlot('accessory')}
                      >
                        <div className="schematic-garment-img-box">
                          <img src={`${SERVER_BASE}${outfit.accessory.imageUrl}`} className="schematic-garment-img" alt={outfit.accessory.name} />
                        </div>
                        <div className="schematic-garment-meta">
                          <span className="schematic-garment-slot">Accessory</span>
                          <span className="schematic-garment-name">{outfit.accessory.name}</span>
                        </div>
                      </div>
                    )}
                    {outfit?.bottom && (
                      <div
                        className={`schematic-garment-card ${hoveredSlot === 'bottom' || selectedSlot === 'bottom' ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSlot('bottom')}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => setSelectedSlot('bottom')}
                      >
                        <div className="schematic-garment-img-box">
                          <img src={`${SERVER_BASE}${outfit.bottom.imageUrl}`} className="schematic-garment-img" alt={outfit.bottom.name} />
                        </div>
                        <div className="schematic-garment-meta">
                          <span className="schematic-garment-slot">Bottom</span>
                          <span className="schematic-garment-name">{outfit.bottom.name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SVG Layer for Connection Lines */}
                  {selectedAvatar && (
                    <svg className="schematic-svg-layer" viewBox="0 0 100 100">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffffff" />
                        </marker>
                      </defs>
                      {Object.entries(SCHEMATIC_CONFIG[selectedAvatar.id] || SCHEMATIC_CONFIG.male_01).map(([slot, data]) => {
                        if (!outfit?.[slot]) return null;
                        const isActive = hoveredSlot === slot || selectedSlot === slot;
                        const { line } = data;
                        
                        // Elbow path calculation: startX,startY -> midX,startY -> midX,endY -> endX,endY
                        const midX = line.isLeft 
                          ? line.startX - (line.startX - line.endX) * 0.4 
                          : line.startX + (line.endX - line.startX) * 0.4;
                        const pathData = `M ${line.startX} ${line.startY} L ${midX} ${line.startY} L ${midX} ${line.endY} L ${line.endX} ${line.endY}`;

                        return (
                          <g key={slot}>
                            {/* Line */}
                            <path
                              d={pathData}
                              className={`schematic-line ${isActive ? 'active' : ''}`}
                              markerEnd="url(#arrow)"
                            />
                            {/* Dot on body region */}
                            <circle
                              cx={line.startX}
                              cy={line.startY}
                              r="1"
                              className={`schematic-dot ${isActive ? 'active' : ''}`}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* Active Tab: AI Runway Render */}
            {!isProcessing && activeTab === 'ai' && (
              <>
                {/* Idle State */}
                {!resultUrl && !jobError && (
                  <div className="tryon-idle">
                    <div className="tryon-idle-avatar">
                      {selectedAvatar ? (
                        <img
                          src={`http://${window.location.hostname}:8000/avatars/${selectedAvatar.id}/thumb`}
                          alt="Selected avatar"
                          className="tryon-idle-model"
                        />
                      ) : (
                        <div className="tryon-idle-placeholder">
                          <IconUser />
                        </div>
                      )}
                    </div>
                    <div className="tryon-idle-text">
                      <h3>Ready to Try On</h3>
                      <p>Select an avatar and click <strong>Try It On</strong> to generate a photorealistic preview of your outfit.</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {jobError && (
                  <div className="tryon-error">
                    <div className="tryon-error-icon">⚠️</div>
                    <h3>Generation Failed</h3>
                    <p className="tryon-error-msg">{jobError}</p>
                    <button
                      type="button"
                      className="tryon-generate-btn"
                      onClick={() => handleGenerate(false)}
                    >
                      <IconRefresh />
                      Retry
                    </button>
                  </div>
                )}

                {/* Result State */}
                {resultUrl && (
                  <div className="tryon-result">
                    {/* Comparison Toggle */}
                    <div className="tryon-result-tabs">
                      <button
                        type="button"
                        className={`result-tab ${!showComparison ? 'active' : ''}`}
                        onClick={() => setShowComparison(false)}
                      >
                        ✨ Try-On Result
                      </button>
                      <button
                        type="button"
                        className={`result-tab ${showComparison ? 'active' : ''}`}
                        onClick={() => setShowComparison(true)}
                      >
                        🔄 Compare
                      </button>
                    </div>

                    {!showComparison ? (
                      <div className="tryon-result-img-wrap">
                        <img
                          src={resultUrl}
                          alt="Virtual Try-On Result"
                          className="tryon-result-img"
                        />
                        <div className="tryon-result-actions">
                          <button type="button" className="tryon-action-btn" onClick={handleDownload}>
                            <IconDownload /> Download
                          </button>
                          <button
                            type="button"
                            className="tryon-action-btn secondary"
                            onClick={() => handleGenerate(true)}
                          >
                            <IconRefresh /> Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="tryon-comparison">
                        <div className="comparison-side">
                          <span className="comparison-label">Model</span>
                          {selectedAvatar && (
                            <img
                              src={`http://${window.location.hostname}:8000/avatars/${selectedAvatar.id}/thumb`}
                              alt="Original avatar"
                              className="comparison-img"
                            />
                          )}
                        </div>
                        <div className="comparison-divider">vs</div>
                        <div className="comparison-side">
                          <span className="comparison-label">With Outfit</span>
                          <img
                            src={resultUrl}
                            alt="Try-On Result"
                            className="comparison-img"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Loading / Processing State */}
            {isProcessing && (
              <div className="tryon-processing">
                <div className="tryon-ring-loader">
                  <div className="ring ring-1" />
                  <div className="ring ring-2" />
                  <div className="ring ring-3" />
                  <div className={`ring-icon icon-${stageInfo.color}`}>{stageInfo.icon}</div>
                </div>
                <div className="tryon-processing-info">
                  <h3 className="processing-title">Generating Your Look</h3>
                  <p className={`processing-stage stage-${stageInfo.color}`}>
                    {progress || 'Processing…'}
                  </p>
                  {queuePos > 0 && (
                    <p className="processing-queue">Queue position: {queuePos}</p>
                  )}
                  <p className="processing-elapsed">
                    ⏱ {formatElapsed(elapsedSecs)}
                  </p>
                  <div className="processing-steps">
                    {['Segmenting garment…', 'Generating top try-on', 'Generating bottom try-on', 'Applying accessories…'].map(step => (
                      <div
                        key={step}
                        className={`step-indicator ${progress === step ? 'active' : ''}`}
                      >
                        <div className="step-dot" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
