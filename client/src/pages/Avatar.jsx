import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { clothingAPI } from '../lib/api';
import { useToast } from '../context/ToastContext';
import './Avatar.css';

// Helper to ensure MediaPipe scripts are loaded on window
const ensureMediaPipeLoaded = () => {
  return new Promise((resolve) => {
    if (window.Pose && window.Camera) return resolve(true);
    let loaded = 0;
    const check = () => {
      loaded++;
      if (loaded >= 2 || (window.Pose && window.Camera)) resolve(true);
    };

    if (!window.Camera) {
      const s1 = document.createElement('script');
      s1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
      s1.crossOrigin = 'anonymous';
      s1.onload = check;
      s1.onerror = check;
      document.head.appendChild(s1);
    } else {
      loaded++;
    }

    if (!window.Pose) {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      s2.crossOrigin = 'anonymous';
      s2.onload = check;
      s2.onerror = check;
      document.head.appendChild(s2);
    } else {
      loaded++;
    }

    if (loaded >= 2) resolve(true);
  });
};

/* ── Built-in High-Fashion Curated Presets for Instant Out-of-the-Box AR ── */
const DEFAULT_PRESETS = {
  tops: [
    {
      _id: 'preset_top_1',
      name: 'Cyberpunk Neon Runner Tee',
      category: 'tops',
      color: { primary: '#00f0ff' },
      imageUrl: '/models/preset_top_cyber.png',
      isSvgData: true,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
        <defs>
          <linearGradient id="gradTop1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d1117" />
            <stop offset="50%" stop-color="#161b22" />
            <stop offset="100%" stop-color="#090d13" />
          </linearGradient>
          <linearGradient id="neonGlow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00f0ff" />
            <stop offset="100%" stop-color="#7928ca" />
          </linearGradient>
        </defs>
        <path d="M160,80 L210,120 L290,120 L340,80 L420,150 L380,220 L330,190 L330,440 L170,440 L170,190 L120,220 L80,150 Z" fill="url(#gradTop1)" stroke="url(#neonGlow1)" stroke-width="6" />
        <path d="M210,120 Q250,150 290,120" fill="none" stroke="#00f0ff" stroke-width="4" />
        <line x1="250" y1="180" x2="250" y2="340" stroke="url(#neonGlow1)" stroke-width="4" stroke-dasharray="8 6" />
        <circle cx="250" cy="260" r="32" fill="none" stroke="#00f0ff" stroke-width="4" />
        <text x="250" y="266" fill="#00f0ff" font-family="'Space Grotesk', sans-serif" font-size="16" font-weight="bold" text-anchor="middle" letter-spacing="2">ZYNTRA</text>
      </svg>`
    },
    {
      _id: 'preset_top_2',
      name: 'Oversized Ivory Luxury Hoodie',
      category: 'tops',
      color: { primary: '#f3f4f6' },
      imageUrl: '/models/preset_top_ivory.png',
      isSvgData: true,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
        <defs>
          <linearGradient id="gradTop2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#e5e7eb" />
          </linearGradient>
        </defs>
        <path d="M150,70 L200,110 L300,110 L350,70 L440,160 L390,230 L340,190 L340,440 L160,440 L160,190 L110,230 L60,160 Z" fill="url(#gradTop2)" stroke="#9ca3af" stroke-width="4" />
        <path d="M200,110 C200,60 300,60 300,110 Z" fill="#e5e7eb" stroke="#9ca3af" stroke-width="3" />
        <rect x="200" y="320" width="100" height="70" rx="16" fill="#f9fafb" stroke="#d1d5db" stroke-width="3" />
        <text x="250" y="240" fill="#4b5563" font-family="'Cinzel', serif" font-size="15" font-weight="600" text-anchor="middle" letter-spacing="3">AESTHETIC STUDIO</text>
      </svg>`
    },
    {
      _id: 'preset_top_3',
      name: 'Midnight Velvet Blazer',
      category: 'tops',
      color: { primary: '#4f46e5' },
      imageUrl: '/models/preset_top_blazer.png',
      isSvgData: true,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
        <defs>
          <linearGradient id="gradBlazer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#312e81" />
          </linearGradient>
        </defs>
        <path d="M160,80 L220,120 L280,120 L340,80 L430,160 L390,240 L340,200 L340,450 L160,450 L160,200 L110,240 L70,160 Z" fill="url(#gradBlazer)" stroke="#818cf8" stroke-width="5" />
        <path d="M220,120 L260,280 L240,450" fill="none" stroke="#a5b4fc" stroke-width="3" />
        <path d="M280,120 L240,280 L260,450" fill="none" stroke="#a5b4fc" stroke-width="3" />
        <polygon points="220,120 250,220 220,240" fill="#3730a3" stroke="#818cf8" stroke-width="2" />
        <polygon points="280,120 250,220 280,240" fill="#3730a3" stroke="#818cf8" stroke-width="2" />
      </svg>`
    }
  ],
  bottoms: [
    {
      _id: 'preset_bot_1',
      name: 'Obsidian Wide-Leg Cargo Pants',
      category: 'bottoms',
      color: { primary: '#111827' },
      imageUrl: '/models/preset_bot_cargo.png',
      isSvgData: true,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="100%" height="100%">
        <defs>
          <linearGradient id="gradCargo" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1f2937" />
            <stop offset="100%" stop-color="#111827" />
          </linearGradient>
        </defs>
        <path d="M160,20 L340,20 L360,300 L380,560 L280,560 L250,180 L220,560 L120,560 L140,300 Z" fill="url(#gradCargo)" stroke="#374151" stroke-width="5" />
        <line x1="160" y1="60" x2="340" y2="60" stroke="#00f0ff" stroke-width="4" />
        <rect x="130" y="240" width="40" height="60" rx="8" fill="#374151" stroke="#4b5563" stroke-width="2" />
        <rect x="330" y="240" width="40" height="60" rx="8" fill="#374151" stroke="#4b5563" stroke-width="2" />
      </svg>`
    },
    {
      _id: 'preset_bot_2',
      name: 'Classic Indigo Tailored Denim',
      category: 'bottoms',
      color: { primary: '#1e3a8a' },
      imageUrl: '/models/preset_bot_denim.png',
      isSvgData: true,
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="100%" height="100%">
        <defs>
          <linearGradient id="gradDenim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a" />
            <stop offset="100%" stop-color="#172554" />
          </linearGradient>
        </defs>
        <path d="M170,20 L330,20 L350,280 L350,560 L280,560 L250,160 L220,560 L150,560 L150,280 Z" fill="url(#gradDenim)" stroke="#f59e0b" stroke-width="4" stroke-dasharray="10 4" />
        <path d="M170,50 L330,50" stroke="#f59e0b" stroke-width="3" />
        <path d="M190,90 Q210,130 230,90" fill="none" stroke="#f59e0b" stroke-width="2" />
        <path d="M270,90 Q290,130 310,90" fill="none" stroke="#f59e0b" stroke-width="2" />
      </svg>`
    }
  ]
};

export default function Avatar({ initialOutfit = null }) {
  const location = useLocation();
  const { success, error: toastError } = useToast();

  // Active Main Tab: 'magic_mirror' (AR Idea 1) | 'room_scale_ar' (AR Idea 3)
  const [activeTab, setActiveTab] = useState('magic_mirror');

  // Wardrobe Items from API + Built-in Presets
  const [userItems, setUserItems] = useState([]);
  const [selectedTop, setSelectedTop] = useState(DEFAULT_PRESETS.tops[0]);
  const [selectedBottom, setSelectedBottom] = useState(DEFAULT_PRESETS.bottoms[0]);

  // AR Mirror Controls
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // AR Visual Adjustments
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [garmentScale, setGarmentScale] = useState(1.0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [garmentOpacity, setGarmentOpacity] = useState(0.95);
  const [blendMode, setBlendMode] = useState('source-over'); // 'source-over' | 'multiply'

  // Live AR Telemetry Stats
  const [trackingConfidence, setTrackingConfidence] = useState(0);
  const [fps, setFps] = useState(60);
  const [isTrackingLocked, setIsTrackingLocked] = useState(false);

  // 3D Room-Scale Model-Viewer State
  const [selectedModel, setSelectedModel] = useState('/models/male_tshirt_template.glb');
  const [modelLighting, setModelLighting] = useState('neutral');
  const [showQrModal, setShowQrModal] = useState(false);

  // Local Wi-Fi Network IP for Mobile QR Scan
  const detectedLanIp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '192.168.29.217'
    : window.location.hostname;
  const [mobileIp, setMobileIp] = useState(detectedLanIp);

  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstanceRef = useRef(null);
  const poseInstanceRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const animationFrameRef = useRef(null);
  const cachedImagesRef = useRef({});

  // ── Load User Closet Items safely ──
  useEffect(() => {
    (async () => {
      try {
        const res = await clothingAPI.getAll();
        // Safe check for res.data.clothes or res.data.items or raw array
        const rawItems = res.data?.clothes || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        const items = Array.isArray(rawItems) ? rawItems : [];
        setUserItems(items);

        // If initialOutfit provided via prop or navigated with state from Recommend or Outfits:
        const outfitToUse = initialOutfit || location.state?.outfit;
        if (outfitToUse) {
          if (outfitToUse.top) setSelectedTop(outfitToUse.top);
          if (outfitToUse.bottom) setSelectedBottom(outfitToUse.bottom);
        } else if (items.length > 0) {
          const tops = items.filter(i => i && (i.category === 'tops' || i.category === 'outerwear' || i.category === 'dresses'));
          const bottoms = items.filter(i => i && i.category === 'bottoms');
          if (tops.length > 0) setSelectedTop(tops[0]);
          if (bottoms.length > 0) setSelectedBottom(bottoms[0]);
        }
      } catch (err) {
        console.warn('Could not load user wardrobe, falling back to runway presets:', err);
      }
    })();
  }, [initialOutfit, location.state]);

  // ── Helper to resolve & load an HTMLImageElement safely ──
  const getLoadedImage = useCallback((item) => {
    if (!item) return null;
    const key = item._id || item.imageUrl || item.name;
    if (cachedImagesRef.current[key]) {
      return cachedImagesRef.current[key];
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    if (item.isSvgData && item.svgContent) {
      const blob = new Blob([item.svgContent], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(blob);
    } else if (item.imageUrl) {
      if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
        img.src = item.imageUrl;
      } else {
        const cleanPath = item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`;
        img.src = cleanPath.startsWith('/uploads') ? cleanPath : `/uploads${cleanPath}`;
      }
    }
    cachedImagesRef.current[key] = img;
    return img;
  }, []);

  // ── MediaPipe Pose Landmark Overlay Renderer ──
  const onPoseResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate real-time FPS
    frameCountRef.current += 1;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    // Clear overlay canvas so the live <video> element shines through underneath
    ctx.clearRect(0, 0, width, height);

    const landmarks = results.poseLandmarks;

    if (!landmarks || landmarks.length === 0) {
      setIsTrackingLocked(false);
      setTrackingConfidence(0);

      // Display Searching HUD
      ctx.fillStyle = 'rgba(12, 16, 26, 0.75)';
      ctx.fillRect(20, 20, 270, 48);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 20, 270, 48);

      ctx.font = '600 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText('⚡ SEARCHING FOR PERSON...', 35, 48);

      ctx.restore();
      return;
    }

    setIsTrackingLocked(true);

    // Landmark visibility for confidence score
    const avgScore = (
      (landmarks[11].visibility || 0.95) +
      (landmarks[12].visibility || 0.95) +
      (landmarks[23].visibility || 0.95) +
      (landmarks[24].visibility || 0.95)
    ) / 4;
    setTrackingConfidence(Math.round(avgScore * 100));

    // In mirrored video mode (scaleX(-1)), convert normalized landmarks to Mirrored Screen Coordinates
    const getPt = (idx) => ({
      x: (1 - landmarks[idx].x) * width,
      y: landmarks[idx].y * height,
      z: landmarks[idx].z || 0,
      v: landmarks[idx].visibility || 0
    });

    const lShoulder = getPt(11);
    const rShoulder = getPt(12);
    const lHip      = getPt(23);
    const rHip      = getPt(24);
    const lElbow    = getPt(13);
    const rElbow    = getPt(14);
    const lWrist    = getPt(15);
    const rWrist    = getPt(16);
    const lKnee     = getPt(25);
    const rKnee     = getPt(26);
    const lAnkle    = getPt(27);
    const rAnkle    = getPt(28);
    const nose      = getPt(0);

    // Compute key structural metrics
    const shoulderDx = rShoulder.x - lShoulder.x;
    const shoulderDy = rShoulder.y - lShoulder.y;
    const shoulderWidth = Math.hypot(shoulderDx, shoulderDy);
    const shoulderCenter = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 };
    const hipCenter = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };
    const torsoHeight = Math.hypot(hipCenter.x - shoulderCenter.x, hipCenter.y - shoulderCenter.y);
    const torsoAngle = Math.atan2(shoulderDy, shoulderDx);

    const hipDx = rHip.x - lHip.x;
    const hipDy = rHip.y - lHip.y;
    const hipWidth = Math.hypot(hipDx, hipDy);
    const hipAngle = Math.atan2(hipDy, hipDx);

    // ── 1. Render Virtual Garments (Top & Bottom) ──
    ctx.globalCompositeOperation = blendMode;

    // A) Render BOTTOM (Pants / Jeans) first
    if (selectedBottom) {
      const botImg = getLoadedImage(selectedBottom);
      if (botImg && botImg.complete && botImg.naturalWidth > 0) {
        const botW = (hipWidth || shoulderWidth * 0.9) * 1.7 * garmentScale;
        const botH = (torsoHeight * 1.7) * garmentScale;
        const botCenter = {
          x: hipCenter.x,
          y: hipCenter.y + botH * 0.38 + verticalOffset
        };

        ctx.save();
        ctx.globalAlpha = garmentOpacity;
        ctx.translate(botCenter.x, botCenter.y);
        ctx.rotate(hipAngle);

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 8;

        ctx.drawImage(botImg, -botW / 2, -botH / 2, botW, botH);
        ctx.restore();
      }
    }

    // B) Render TOP (Shirt / Tee / Jacket)
    if (selectedTop) {
      const topImg = getLoadedImage(selectedTop);
      if (topImg && topImg.complete && topImg.naturalWidth > 0) {
        const topW = shoulderWidth * 1.85 * garmentScale;
        const topH = torsoHeight * 1.45 * garmentScale;
        const topCenter = {
          x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.38,
          y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.38 + verticalOffset
        };

        ctx.save();
        ctx.globalAlpha = garmentOpacity;
        ctx.translate(topCenter.x, topCenter.y);
        ctx.rotate(torsoAngle);

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;

        ctx.drawImage(topImg, -topW / 2, -topH / 2, topW, topH);
        ctx.restore();
      }
    }

    // Reset composite operation for Skeleton & HUD
    ctx.globalCompositeOperation = 'source-over';

    // ── 2. Render Sci-Fi Neon Skeleton HUD ──
    if (showSkeleton) {
      const drawBone = (p1, p2, color = '#00f0ff') => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      };

      const drawNode = (p, radius = 5, color = '#ffffff', glow = '#00f0ff') => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      };

      // Torso & Upper Body Bones (Cyan)
      drawBone(lShoulder, rShoulder, '#00f0ff');
      drawBone(lShoulder, lElbow, '#00f0ff');
      drawBone(lElbow, lWrist, '#00f0ff');
      drawBone(rShoulder, rElbow, '#00f0ff');
      drawBone(rElbow, rWrist, '#00f0ff');

      // Spine & Hip Connections (Violet)
      drawBone(shoulderCenter, hipCenter, '#a855f7');
      drawBone(lShoulder, lHip, 'rgba(168, 85, 247, 0.6)');
      drawBone(rShoulder, rHip, 'rgba(168, 85, 247, 0.6)');
      drawBone(lHip, rHip, '#a855f7');

      // Lower Body Leg Bones (Emerald)
      drawBone(lHip, lKnee, '#10b981');
      drawBone(lKnee, lAnkle, '#10b981');
      drawBone(rHip, rKnee, '#10b981');
      drawBone(rKnee, rAnkle, '#10b981');

      // Head / Collar Anchor
      drawBone(shoulderCenter, nose, 'rgba(255, 255, 255, 0.5)');

      // Landmark Nodes
      [lShoulder, rShoulder, lHip, rHip, lElbow, rElbow, lWrist, rWrist, lKnee, rKnee, lAnkle, rAnkle, nose].forEach(n => {
        drawNode(n, 4.5, '#ffffff', '#00f0ff');
      });
    }

    // ── 3. High-Tech AR Telemetry HUD Overlay ──
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 28, 0.78)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(20, 20, 280, 75, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('● AR POSE TRACKING: LOCKED', 34, 42);

    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`CONFIDENCE: ${avgScore > 0 ? (avgScore * 100).toFixed(1) : 98.4}%  |  FPS: ${fps}`, 34, 60);
    ctx.fillText(`TILT: ${(torsoAngle * (180 / Math.PI)).toFixed(1)}°  |  WIDTH: ${Math.round(shoulderWidth)}px`, 34, 78);

    ctx.restore();
    ctx.restore();
  }, [selectedTop, selectedBottom, showSkeleton, garmentScale, verticalOffset, garmentOpacity, blendMode, fps, getLoadedImage]);

  // ── Initialize MediaPipe Pose Model & Camera ──
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      if (!videoElement || !canvasElement) return;

      // 1. Ensure MediaPipe is loaded and initialize Pose
      await ensureMediaPipeLoaded();
      const PoseConstructor = window.Pose;
      if (!PoseConstructor) {
        throw new Error('MediaPipe Pose could not be loaded from CDN.');
      }
      const pose = new PoseConstructor({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onPoseResults);
      poseInstanceRef.current = pose;

      // 2. Stream User Camera (requires Secure Context / HTTPS on mobile)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Mobile browsers require HTTPS to access the camera. Please open https://" + (window.location.hostname || '192.168.29.217') + ":5173");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      videoElement.srcObject = stream;
      await videoElement.play();

      // Ensure canvas matches video resolution
      const vWidth = videoElement.videoWidth || 1280;
      const vHeight = videoElement.videoHeight || 720;
      canvasElement.width = vWidth;
      canvasElement.height = vHeight;

      // 3. Process Frames with Camera Utility
      const CameraConstructor = window.Camera;
      if (!CameraConstructor) {
        throw new Error('MediaPipe Camera could not be loaded.');
      }
      const camera = new CameraConstructor(videoElement, {
        onFrame: async () => {
          if (videoRef.current && poseInstanceRef.current) {
            await poseInstanceRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });

      await camera.start();
      cameraInstanceRef.current = camera;
      setCameraActive(true);
      setIsDemoMode(false);
      success('Live WebAR Runway Mirror activated!');
    } catch (err) {
      console.error('Camera or Pose initialization failed:', err);
      toastError(`Camera error: ${err.message}. Starting Demo Simulator Mode...`);
      startDemoMode();
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraInstanceRef.current) {
      try { cameraInstanceRef.current.stop(); } catch (e) {}
      cameraInstanceRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCameraActive(false);
    setIsDemoMode(false);
  };

  // ── Switch Front / Back Camera ──
  const toggleCameraFacing = async () => {
    stopCamera();
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    setTimeout(() => {
      startCamera();
    }, 400);
  };

  // ── Demo Simulator Mode (Generates Virtual Runway Avatar for Testing Without Webcam) ──
  const startDemoMode = () => {
    stopCamera();
    setIsDemoMode(true);
    setCameraActive(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1280;
    canvas.height = 720;

    let tick = 0;
    const renderLoop = () => {
      tick += 0.04;
      const sway = Math.sin(tick) * 0.08;
      const breathe = Math.sin(tick * 1.5) * 0.015;

      // Draw custom runway stage background for simulation
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0a0d17');
        bgGrad.addColorStop(0.5, '#121829');
        bgGrad.addColorStop(1, '#05070c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Runway stage lights
        ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height * 0.95, 380, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.15, canvas.height);
        ctx.lineTo(canvas.width * 0.35, canvas.height * 0.4);
        ctx.moveTo(canvas.width * 0.85, canvas.height);
        ctx.lineTo(canvas.width * 0.65, canvas.height * 0.4);
        ctx.stroke();
      }

      // Synthetic pose landmarks simulating a runway model walking/breathing
      const syntheticResults = {
        poseLandmarks: [
          { x: 0.5 + sway * 0.5, y: 0.18 + breathe, z: 0, visibility: 0.99 }, // 0: Nose
          ...Array(10).fill({ x: 0.5, y: 0.2, visibility: 0.5 }),
          { x: 0.62 + sway, y: 0.28 + breathe, z: -0.05, visibility: 0.98 }, // 11: L Shoulder
          { x: 0.38 + sway, y: 0.28 + breathe, z: 0.05, visibility: 0.98 },  // 12: R Shoulder
          { x: 0.68 + sway, y: 0.44, z: 0, visibility: 0.95 },               // 13: L Elbow
          { x: 0.32 + sway, y: 0.44, z: 0, visibility: 0.95 },               // 14: R Elbow
          { x: 0.72 + sway, y: 0.58, z: 0, visibility: 0.92 },               // 15: L Wrist
          { x: 0.28 + sway, y: 0.58, z: 0, visibility: 0.92 },               // 16: R Wrist
          ...Array(6).fill({ x: 0.5, y: 0.4, visibility: 0.5 }),
          { x: 0.58 + sway * 0.8, y: 0.58 + breathe, z: 0, visibility: 0.98 },// 23: L Hip
          { x: 0.42 + sway * 0.8, y: 0.58 + breathe, z: 0, visibility: 0.98 },// 24: R Hip
          { x: 0.60 + Math.sin(tick * 2) * 0.03, y: 0.78, z: 0, visibility: 0.95 }, // 25: L Knee
          { x: 0.40 - Math.sin(tick * 2) * 0.03, y: 0.78, z: 0, visibility: 0.95 }, // 26: R Knee
          { x: 0.61, y: 0.94, z: 0, visibility: 0.92 },                      // 27: L Ankle
          { x: 0.39, y: 0.94, z: 0, visibility: 0.92 },                      // 28: R Ankle
          ...Array(4).fill({ x: 0.5, y: 0.9, visibility: 0.5 })
        ]
      };

      onPoseResults(syntheticResults);
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ── Snapshot Runway Look ──
  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    // Draw video feed if live camera
    if (videoRef.current && cameraActive && !isDemoMode) {
      ctx.save();
      ctx.translate(exportCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, exportCanvas.width, exportCanvas.height);
      ctx.restore();
    }

    // Draw AR canvas overlay on top
    ctx.drawImage(canvas, 0, 0);

    // Add futuristic watermark badge
    ctx.fillStyle = 'rgba(6, 9, 18, 0.85)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(canvas.width - 340, canvas.height - 85, 310, 65, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('ZYNTRA AR RUNWAY STUDIO', canvas.width - 320, canvas.height - 52);

    ctx.font = '500 10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('AUGMENTED & VIRTUAL REALITY LAB • 2026', canvas.width - 320, canvas.height - 34);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `zyntra-ar-runway-${Date.now()}.png`;
    a.click();
    success('Runway Look snapshot captured & saved!');
  };

  // Mobile AR URL
  const mobileArUrl = `${window.location.protocol}//${mobileIp}:${window.location.port || '5173'}/avatar`;

  return (
    <div className="ar-studio-page container">
      {/* ── Header ── */}
      <header className="ar-studio-header">
        <div className="ar-header-left">
          <div className="ar-badge-pill">
            <span className="live-dot" />
            <span>VR & AR Spatial Intelligence</span>
          </div>
          <h1 className="ar-title font-heading">
            Zyntra <span className="gradient-text">AR Studio</span>
          </h1>
          <p className="ar-subtitle">
            Experience next-generation fashion through real-time markerless WebAR body tracking and room-scale spatial holograms.
          </p>
        </div>

        {/* ── Mode Switcher Tabs ── */}
        <div className="ar-tabs-nav">
          <button
            className={`ar-tab-btn ${activeTab === 'magic_mirror' ? 'active' : ''}`}
            onClick={() => setActiveTab('magic_mirror')}
          >
            <span className="tab-icon">🪞</span>
            <span>Live AR Magic Mirror</span>
          </button>
          <button
            className={`ar-tab-btn ${activeTab === 'room_scale_ar' ? 'active' : ''}`}
            onClick={() => {
              stopCamera();
              setActiveTab('room_scale_ar');
            }}
          >
            <span className="tab-icon">📱</span>
            <span>Room-Scale 3D Hologram</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: LIVE WEBAR MAGIC RUNWAY MIRROR (IDEA 1)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'magic_mirror' && (
        <div className="ar-mirror-layout">
          {/* Main Viewport Container */}
          <div className="ar-viewport-card glass-card">
            {/* Live Camera Video (Natively displayed beneath canvas, hardware accelerated) */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`ar-video-feed ${cameraActive && !isDemoMode ? 'active' : ''}`}
            />

            {/* Canvas for Garments + HUD Overlay */}
            <canvas
              ref={canvasRef}
              className="ar-canvas"
            />

            {/* Standby / Initial State Overlay */}
            {!cameraActive && (
              <div className="ar-standby-overlay animate-fade-in">
                <div className="ar-standby-content">
                  <div className="ar-standby-icon">🪞</div>
                  <h2>Step in Front of the Smart Mirror</h2>
                  <p>
                    Zyntra tracks 33 body landmarks using high-speed computer vision to map and warp garments dynamically onto your frame.
                  </p>
                  <div className="ar-action-buttons">
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={startCamera}
                      disabled={cameraLoading}
                    >
                      {cameraLoading ? (
                        <>
                          <div className="loader-spinner" style={{ width: 18, height: 18 }} />
                          <span>Initializing MediaPipe Neural Model...</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                          <span>Start Live AR Camera</span>
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={startDemoMode}
                    >
                      <span>Simulate Runway Model (Demo Mode)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active AR Controls Overlay Bar */}
            {cameraActive && (
              <div className="ar-hud-bottom-bar animate-fade-in">
                <div className="ar-hud-left">
                  <button
                    className={`btn-ar-control ${showSkeleton ? 'active' : ''}`}
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    title="Toggle Neon Landmark Skeleton HUD"
                  >
                    <span>⚡ Skeleton HUD: {showSkeleton ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    className="btn-ar-control"
                    onClick={toggleCameraFacing}
                    title="Flip between selfie and rear camera"
                  >
                    <span>🔄 Flip Camera</span>
                  </button>
                  <button
                    className="btn-ar-control btn-snapshot"
                    onClick={captureSnapshot}
                    title="Take a high-res photo with watermark"
                  >
                    <span>📸 Snapshot</span>
                  </button>
                </div>

                <div className="ar-hud-right">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={stopCamera}
                  >
                    <span>Stop Camera</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Adjustment & Wardrobe Panel */}
          <aside className="ar-controls-sidebar glass-card">
            {/* 1. Fit & Calibration */}
            <div className="control-group">
              <h3 className="control-group-title">🎯 AR Fit & Alignment</h3>

              <div className="slider-item">
                <div className="slider-label">
                  <span>Garment Scale</span>
                  <span className="slider-val">{Math.round(garmentScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.35"
                  step="0.05"
                  value={garmentScale}
                  onChange={(e) => setGarmentScale(parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-item">
                <div className="slider-label">
                  <span>Collar / Vertical Height</span>
                  <span className="slider-val">{verticalOffset}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="2"
                  value={verticalOffset}
                  onChange={(e) => setVerticalOffset(parseInt(e.target.value))}
                />
              </div>

              <div className="slider-item">
                <div className="slider-label">
                  <span>Garment Opacity</span>
                  <span className="slider-val">{Math.round(garmentOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={garmentOpacity}
                  onChange={(e) => setGarmentOpacity(parseFloat(e.target.value))}
                />
              </div>

              <div className="blend-mode-picker">
                <span className="sub-label">Fabric Blend Shading:</span>
                <div className="btn-toggle-group">
                  <button
                    className={`btn-toggle ${blendMode === 'source-over' ? 'active' : ''}`}
                    onClick={() => setBlendMode('source-over')}
                  >
                    Standard
                  </button>
                  <button
                    className={`btn-toggle ${blendMode === 'multiply' ? 'active' : ''}`}
                    onClick={() => setBlendMode('multiply')}
                  >
                    Realistic Fabric
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Live Active Garments Selector */}
            <div className="control-group">
              <h3 className="control-group-title">👕 Active Top (Shirt / Jacket)</h3>
              <div className="garment-pills-scroll">
                {DEFAULT_PRESETS.tops.map((top) => (
                  <button
                    key={top._id}
                    className={`garment-pill-btn ${selectedTop?._id === top._id ? 'active' : ''}`}
                    onClick={() => setSelectedTop(top)}
                  >
                    <span className="pill-dot" style={{ background: top.color?.primary }} />
                    <span className="pill-name">{top.name}</span>
                  </button>
                ))}
                {userItems
                  .filter((i) => i && (i.category === 'tops' || i.category === 'outerwear' || i.category === 'dresses'))
                  .map((item) => (
                    <button
                      key={item._id}
                      className={`garment-pill-btn ${selectedTop?._id === item._id ? 'active' : ''}`}
                      onClick={() => setSelectedTop(item)}
                    >
                      <span className="pill-dot" style={{ background: item.dominantColors?.[0] || '#7c3aed' }} />
                      <span className="pill-name">{item.name}</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="control-group">
              <h3 className="control-group-title">👖 Active Bottom (Pants / Jeans)</h3>
              <div className="garment-pills-scroll">
                {DEFAULT_PRESETS.bottoms.map((bot) => (
                  <button
                    key={bot._id}
                    className={`garment-pill-btn ${selectedBottom?._id === bot._id ? 'active' : ''}`}
                    onClick={() => setSelectedBottom(bot)}
                  >
                    <span className="pill-dot" style={{ background: bot.color?.primary }} />
                    <span className="pill-name">{bot.name}</span>
                  </button>
                ))}
                {userItems
                  .filter((i) => i && i.category === 'bottoms')
                  .map((item) => (
                    <button
                      key={item._id}
                      className={`garment-pill-btn ${selectedBottom?._id === item._id ? 'active' : ''}`}
                      onClick={() => setSelectedBottom(item)}
                    >
                      <span className="pill-dot" style={{ background: item.dominantColors?.[0] || '#2563eb' }} />
                      <span className="pill-name">{item.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: ROOM-SCALE 3D HOLOGRAPHIC MANNEQUIN (IDEA 3)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'room_scale_ar' && (
        <div className="ar-roomscale-layout">
          <div className="ar-3d-card glass-card">
            {/* Native Google Model-Viewer for WebAR (ARCore / ARKit) */}
            <model-viewer
              src={selectedModel}
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate
              shadow-intensity="1.5"
              shadow-softness="0.8"
              environment-image={modelLighting}
              exposure="1.1"
              alt="3D Holographic Mannequin wearing Zyntra Runway Outfit"
              style={{ width: '100%', height: '100%', minHeight: '560px' }}
            >
              {/* Native AR Launch Button */}
              <button
                slot="ar-button"
                className="btn-place-in-ar animate-pulse-glow"
              >
                <span>📱 Place Mannequin in My Room (AR)</span>
              </button>

              <div slot="ar-prompt" className="ar-prompt-hud">
                <span>Point your phone at the floor and move slowly...</span>
              </div>
            </model-viewer>

            {/* Quick 3D HUD Top Bar */}
            <div className="ar-3d-hud-bar">
              <div className="ar-3d-badge">
                <span className="live-dot" />
                <span>WebXR SLAM Surface Plane Tracking Ready</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowQrModal(true)}
              >
                <span>📲 Scan QR to Open on Mobile</span>
              </button>
            </div>
          </div>

          {/* 3D Model & Lighting Options */}
          <aside className="ar-3d-sidebar glass-card">
            <div className="control-group">
              <h3 className="control-group-title">👗 3D Garment Geometry</h3>
              <div className="model-choice-list">
                {[
                  { label: "Men's Runway T-Shirt", path: '/models/male_tshirt_template.glb' },
                  { label: "Women's Fitted Tee", path: '/models/female_tshirt_template.glb' },
                  { label: "Men's Relaxed Jeans", path: '/models/male_jeans_template.glb' },
                  { label: "Women's Tailored Denim", path: '/models/female_jeans_template.glb' }
                ].map((m) => (
                  <button
                    key={m.path}
                    className={`model-select-btn ${selectedModel === m.path ? 'active' : ''}`}
                    onClick={() => setSelectedModel(m.path)}
                  >
                    <span>{m.label}</span>
                    {selectedModel === m.path && <span className="check-mark">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <h3 className="control-group-title">💡 Studio Lighting Environment</h3>
              <div className="lighting-preset-grid">
                {[
                  { id: 'neutral', label: 'Studio Neutral' },
                  { id: 'legacy', label: 'Runway Spotlight' },
                  { id: 'sunset', label: 'Warm Glow' }
                ].map((l) => (
                  <button
                    key={l.id}
                    className={`lighting-btn ${modelLighting === l.id ? 'active' : ''}`}
                    onClick={() => setModelLighting(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <h3 className="control-group-title">📐 Surface Anchoring Guide</h3>
              <div className="ar-guide-box">
                <div className="guide-step">
                  <span className="step-num">1</span>
                  <p>Click <strong>"Place Mannequin in My Room"</strong> on your phone (or scan the QR code).</p>
                </div>
                <div className="guide-step">
                  <span className="step-num">2</span>
                  <p>Point your camera at a flat floor in your room. ARCore / ARKit will detect the plane.</p>
                </div>
                <div className="guide-step">
                  <span className="step-num">3</span>
                  <p>A 1:1 human-scale model appears. Walk 360° around it to inspect the fit and drape!</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop-to-Mobile QR Code Modal ── */}
      {showQrModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowQrModal(false)}>
          <div className="modal-content glass-card qr-modal-box animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-heading">Instant Mobile WebAR</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowQrModal(false)}>✕</button>
            </div>
            <div className="qr-modal-body">
              <p>Scan with your iPhone or Android camera to drop the 3D outfit into your physical room:</p>
              
              <div className="qr-img-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileArUrl)}`}
                  alt="Zyntra AR QR Code"
                />
              </div>

              <div className="qr-lan-config">
                <label className="qr-lan-label">Computer's Wi-Fi / LAN IP:</label>
                <input
                  type="text"
                  className="qr-lan-input"
                  value={mobileIp}
                  onChange={(e) => setMobileIp(e.target.value)}
                  placeholder="e.g. 192.168.29.217"
                />
              </div>

              <span className="qr-url-hint">Target URL: {mobileArUrl}</span>
              <p className="qr-wifi-note">
                💡 Ensure your phone and computer are connected to the same Wi-Fi network.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
