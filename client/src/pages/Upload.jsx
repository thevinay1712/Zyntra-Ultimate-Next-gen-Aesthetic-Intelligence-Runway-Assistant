import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clothingAPI, imageSearchAPI } from '../lib/api';
import { useToast } from '../context/ToastContext';
import './Upload.css';

/* SVG Icons */
const IconUpload = () => <svg viewBox="0 0 24 24" className="icon icon-xl"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12"/></svg>;
const IconImage = () => <svg viewBox="0 0 24 24" className="icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconX = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevronDown = ({ open }) => (
  <svg viewBox="0 0 24 24" className={`icon icon-sm transition-transform ${open ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.2s ease' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconShirt = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20.38 3.46L16 2a8 8 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>;
const IconPants = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M15.5 22H21v-3.5L18.5 7 17 3H7L5.5 7 3 18.5V22h5.5v-3.5h7V22z M11 3v12 M13 3v12"/></svg>;
const IconShoe = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M4 16v4h16v-4 M4 16s1.5-2 4-2 3 2 4 2 2-2 4-2 2 2 4 2 M4 12c0-2 2-4 4-4s3 2 4 2 2-2 4-2 2 2 4 2"/></svg>;
const IconCoat = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20 5l-4-3-4 3 M4 5l4-3 4 3 M6 10v12h12V10 M6 10l6-4 6 4"/></svg>;
const IconWatch = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="12" cy="12" r="6"/><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="9" y="18" width="6" height="4" rx="1"/><path d="M12 9v3l1.5 1.5"/></svg>;

const CATEGORY_ITEMS = [
  { id: 'tops', label: 'Tops', Icon: IconShirt },
  { id: 'bottoms', label: 'Bottoms', Icon: IconPants },
  { id: 'outerwear', label: 'Outerwear', Icon: IconCoat },
  { id: 'shoes', label: 'Shoes', Icon: IconShoe },
  { id: 'accessories', label: 'Accessories', Icon: IconWatch },
];

const CATEGORIES = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const OCCASIONS = ['casual', 'formal', 'sport', 'party'];

const FASHION_QUOTES = [
  { text: "Fashions fade, style is eternal.", author: "Yves Saint Laurent" },
  { text: "Fashion is the armor to survive the reality of everyday life.", author: "Bill Cunningham" },
  { text: "Dressing well is a form of good manners.", author: "Tom Ford" },
  { text: "Style is a way to say who you are without having to speak.", author: "Rachel Zoe" },
  { text: "Clothes mean nothing until someone lives in them.", author: "Marc Jacobs" },
  { text: "In order to be irreplaceable, one must always be different.", author: "Coco Chanel" },
  { text: "Elegance is not standing out, but being remembered.", author: "Giorgio Armani" },
  { text: "Fashion should be a form of escapism, and not a form of imprisonment.", author: "Alexander McQueen" },
  { text: "Style is primarily a matter of instinct.", author: "Bill Blass" },
  { text: "The joy of dressing is an art.", author: "John Galliano" },
  { text: "Looking good isn't self-importance; it's self-respect.", author: "Charles Hix" },
  { text: "Make it simple, but significant.", author: "Don Draper" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "You can have anything you want in life if you dress for it.", author: "Edith Head" },
  { text: "Fashion is instant language.", author: "Miuccia Prada" },
  { text: "One is never over-dressed or under-dressed with a Little Black Dress.", author: "Karl Lagerfeld" },
  { text: "Create your own visual style... let it be unique.", author: "Orson Welles" },
  { text: "Fashion is about dressing according to what's fashionable. Style is about being yourself.", author: "Oscar de la Renta" },
  { text: "Dressing is a way of life.", author: "Yves Saint Laurent" }
];

/* ========================================================
   CANVAS HELPER FUNCTIONS FOR BACKGROUND REMOVAL
   ======================================================== */

// Samples color under relative click coordinates
const samplePixelColor = (imgElement, clickX, clickY) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  ctx.drawImage(imgElement, 0, 0);

  const rect = imgElement.getBoundingClientRect();
  const scaleX = imgElement.naturalWidth / rect.width;
  const scaleY = imgElement.naturalHeight / rect.height;
  const x = Math.max(0, Math.min(imgElement.naturalWidth - 1, Math.floor(clickX * scaleX)));
  const y = Math.max(0, Math.min(imgElement.naturalHeight - 1, Math.floor(clickY * scaleY)));

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return { r: pixel[0], g: pixel[1], b: pixel[2] };
};

// ============================================================
// IMPROVED BACKGROUND REMOVAL: Edge-based Flood Fill
// Much more accurate than global chroma-key — starts from image
// borders and floods inward, only removing pixels that are
// connected to the background edge, preserving clothing details.
// ============================================================
const processImageFloodFill = (imageSrc, keyColor, tolerance, feather = 8) => {
  return new Promise((resolve, reject) => {
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
      const width = canvas.width;
      const height = canvas.height;
      const total = width * height;

      // Detect target background color from corners if not specified
      let rT = 255, gT = 255, bT = 255;
      if (keyColor) {
        rT = keyColor.r; gT = keyColor.g; bT = keyColor.b;
      } else {
        // Sample 4 corners and pick the most common-looking one
        const corners = [
          [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
        ];
        let bestCorner = corners[0];
        // Use top-left corner as primary
        const c = corners[0];
        const ci = (c[1] * width + c[0]) * 4;
        rT = data[ci]; gT = data[ci + 1]; bT = data[ci + 2];
      }

      const detectedColor = { r: rT, g: gT, b: bT };

      // Helper: color distance
      const dist = (i) => Math.sqrt(
        (data[i] - rT) ** 2 +
        (data[i + 1] - gT) ** 2 +
        (data[i + 2] - bT) ** 2
      );

      // === PHASE 1: Flood Fill from all 4 edges ===
      // Use a BFS queue seeded with every border pixel that matches the bg color
      const visited = new Uint8Array(total); // 0=unvisited,1=bg,2=fg
      const queue = [];

      const enqueue = (x, y) => {
        const idx = y * width + x;
        if (visited[idx]) return;
        const di = idx * 4;
        if (dist(di) <= tolerance) {
          visited[idx] = 1; // mark as background
          queue.push(idx);
        } else {
          visited[idx] = 2; // mark as foreground (clothing)
        }
      };

      // Seed from all 4 borders
      for (let x = 0; x < width; x++) {
        enqueue(x, 0);
        enqueue(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        enqueue(0, y);
        enqueue(width - 1, y);
      }

      // BFS flood fill inward
      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        const x = idx % width;
        const y = Math.floor(idx / width);

        // Check 4 neighbours
        const neighbours = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];
        for (const [nx, ny] of neighbours) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = ny * width + nx;
          if (visited[nidx]) continue;
          const ndi = nidx * 4;
          if (dist(ndi) <= tolerance) {
            visited[nidx] = 1;
            queue.push(nidx);
          } else {
            visited[nidx] = 2;
          }
        }
      }

      // === PHASE 2: Apply transparency to flood-filled background pixels ===
      // Also apply soft feathering to pixels near the bg boundary
      for (let idx = 0; idx < total; idx++) {
        const di = idx * 4;
        if (visited[idx] === 1) {
          // Confirmed background pixel — fully transparent
          data[di + 3] = 0;
        } else if (visited[idx] === 0) {
          // Unvisited interior — keep fully opaque (it's clothing)
        } else {
          // Foreground near bg edge — check for soft feathering
          const d = dist(di);
          if (d < tolerance + feather) {
            // Smooth anti-aliased edge transition
            const alpha = Math.min(1, (d - tolerance) / feather);
            data[di + 3] = Math.round(alpha * data[di + 3]);
          }
        }
      }

      // Analyze border pixels to check if background was cleanly isolated
      let borderBgCount = 0;
      let borderTotal = 0;
      for (let x = 0; x < width; x++) {
        borderTotal += 2;
        if (visited[x] === 1) borderBgCount++;
        if (visited[(height - 1) * width + x] === 1) borderBgCount++;
      }
      for (let y = 1; y < height - 1; y++) {
        borderTotal += 2;
        if (visited[y * width] === 1) borderBgCount++;
        if (visited[y * width + (width - 1)] === 1) borderBgCount++;
      }
      const borderBgRatio = borderBgCount / borderTotal;
      const isImperfect = borderBgRatio < 0.82; // Less than 82% of edge pixels flood-filled as bg = splotchy/cluttered

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, detectedColor, isImperfect });
        } else {
          reject(new Error('Canvas blob generation failed'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

/* ========================================================
   UPLOAD COMPONENT
   ======================================================== */

export default function Upload() {
  const [originalFile, setOriginalFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [bgRemovedBlob, setBgRemovedBlob] = useState(null);
  const [bgRemovedUrl, setBgRemovedUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeQuote, setActiveQuote] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Background removal settings
  const [autoRemove, setAutoRemove] = useState(true);
  const [tolerance, setTolerance] = useState(35);
  const [keyColor, setKeyColor] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isBgRemovalImperfect, setIsBgRemovalImperfect] = useState(false);
  const [samplingMode, setSamplingMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const imageElementRef = useRef(null);
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'tops',
    subcategory: '',
    brand: '',
    season: [],
    occasion: [],
  });

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [nameValidationError, setNameValidationError] = useState(null);
  // Trigger background removal on original image changes
  /* Comment out frontend local background removal process to eliminate UI lag
  useEffect(() => {
    if (!originalUrl || !autoRemove) {
      setBgRemovedBlob(null);
      setBgRemovedUrl(null);
      return;
    }

    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const result = await processImageFloodFill(originalUrl, keyColor, tolerance);
        setBgRemovedBlob(result.blob);
        
        if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
        
        const newUrl = URL.createObjectURL(result.blob);
        setBgRemovedUrl(newUrl);
        setIsBgRemovalImperfect(result.isImperfect);
        
        if (!keyColor) {
          setKeyColor(result.detectedColor);
        }
      } catch (err) {
        console.error('Background removal failed:', err);
      } finally {
        setProcessing(false);
      }
    }, 300);

  }, [originalUrl, keyColor, tolerance, autoRemove]);
  */



  const handleFile = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      // Clear previous resources
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);

      setOriginalFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setOriginalUrl(url);
      setKeyColor(null); // Reset target color for auto-detection
      setBgRemovedBlob(null);
      setBgRemovedUrl(null);
      setSamplingMode(false);
      setIsBgRemovalImperfect(false);
      setNameValidationError(null);
    } else {
      error('Please select a valid image file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const autoDetectCategory = (nameVal) => {
    const lower = nameVal.toLowerCase();
    const keywords = {
      tops: ['t-shirt', 'tshirt', 'shirt', 'tee', 'top', 'blouse', 'sweater', 'hoodie', 'polo', 'jersey', 'tank', 'cardigan', 'pullover'],
      bottoms: ['jeans', 'pants', 'trouser', 'shorts', 'skirt', 'leggings', 'sweatpants', 'cargo', 'joggers', 'chino', 'slacks'],
      shoes: ['shoe', 'sneaker', 'boot', 'heel', 'loafer', 'sandal', 'slipper', 'oxford', 'footwear'],
      outerwear: ['jacket', 'coat', 'blazer', 'trench', 'parka', 'vest', 'windbreaker', 'overcoat'],
      accessories: ['watch', 'tie', 'belt', 'scarf', 'glass', 'sunglass', 'hat', 'cap', 'bag', 'wallet', 'purse', 'glove', 'socks', 'jewelry', 'ring', 'necklace', 'bracelet', 'accessory']
    };

    for (const [cat, words] of Object.entries(keywords)) {
      for (const word of words) {
        const regex = new RegExp(`\\b${word}`, 'i');
        if (regex.test(lower)) {
          return cat;
        }
      }
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setNameValidationError(null);
    }
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'name') {
        const detected = autoDetectCategory(value);
        if (detected) {
          updated.category = detected;
        }
      }
      return updated;
    });
  };

  const toggleChip = (field, item) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/,/g, '');
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handlePreviewClick = (e) => {
    if (!samplingMode || !originalUrl || !imageElementRef.current) return;
    
    const rect = imageElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
 
    try {
      const color = samplePixelColor(imageElementRef.current, clickX, clickY);
      setKeyColor(color);
      setSamplingMode(false);
      success('Background key color updated!');
    } catch (err) {
      console.error('Sampling failed:', err);
    }
  };

  const clearFile = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
    setOriginalFile(null);
    setOriginalUrl(null);
    setBgRemovedBlob(null);
    setBgRemovedUrl(null);
    setKeyColor(null);
    setSamplingMode(false);
    setIsBgRemovalImperfect(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalFile) return error('Please select an image');
    if (!formData.name) return error('Please provide a name');

    /* Comment out imperfect background removal blocking
    if (autoRemove && isBgRemovalImperfect) {
      error('Upload Blocked: The background of your photo was not removed properly. Please re-upload a different photo with a plain, clean background for correct isolation.');
      return;
    }
    */

    setLoading(true);
    
    // Select and show a random fashion quote instantly (guaranteed to be different than previous!)
    let newQuote = activeQuote;
    while (!newQuote || newQuote.text === activeQuote?.text) {
      newQuote = FASHION_QUOTES[Math.floor(Math.random() * FASHION_QUOTES.length)];
    }
    setActiveQuote(newQuote);
    setShowModal(true);

    const startTime = Date.now();
    const data = new FormData();
    
    // Append the original file directly to be processed by the server-side AI API
    data.append('image', originalFile);

    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('subcategory', formData.subcategory);
    data.append('brand', formData.brand);
    data.append('season', JSON.stringify(formData.season));
    data.append('occasion', JSON.stringify(formData.occasion));
    data.append('tags', JSON.stringify(tags));

    try {
      await clothingAPI.upload(data);
      success('Item added to your wardrobe successfully!');
      setIsClosing(true);
      setTimeout(() => {
        setShowModal(false);
        setIsClosing(false);
        setLoading(false);
        navigate('/dashboard');
      }, 400); // Wait 400ms for exit animation
    } catch (err) {
      setIsClosing(true);
      setTimeout(() => {
        setShowModal(false);
        setIsClosing(false);
        setLoading(false);
      }, 400);
      if (err.response?.data?.message === 'Garment mismatch') {
        setNameValidationError(err.response.data.detectedLabel);
        error(`Upload Blocked: It appears like, ${err.response.data.detectedLabel}`);
      } else {
        error(err.response?.data?.message || 'Failed to upload item');
      }
    }
  };

  const badgeItemStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '120px'
  };

  const currentPreviewSrc = (autoRemove && bgRemovedUrl) ? bgRemovedUrl : originalUrl;

  return (
    <div className="main-content" id="upload-page">
      <div className="container">
        <div className="upload-header animate-fade-in">
          <h1 className="dashboard-title">Add to your Wardrobe</h1>
          <p className="dashboard-subtitle">Upload a photo of your clothing to add it to your digital wardrobe</p>
        </div>

        {/* Upload Guidelines Card */}
        <div className="glass-card animate-fade-in" style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-violet-light)', fontSize: '0.95rem' }}>💡 Styling Tips for Best AI Scan</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <div>✔ <strong>Lay clothing flat</strong> to prevent shadows.</div>
            <div>✔ <strong>Ensure full visibility</strong> (avoid crops).</div>
            <div>✔ <strong>Use bright lighting</strong> for color analysis.</div>
            <div>✔ <strong>Avoid folds/wrinkles</strong> for clean patterns.</div>
            <div>✔ <strong>Plain background</strong> preferred for outline detection.</div>
          </div>
        </div>

        {/* Quote Loading Modal Overlay */}
        {showModal && (
          <div className={`quote-modal-overlay animate-fade-in ${isClosing ? 'closing' : ''}`}>
            <div className={`quote-modal-box animate-slide-up ${isClosing ? 'closing' : ''}`}>
              <div className="quote-loader-circle" style={{ marginBottom: '16px' }}>
                <div className="quote-loader-spin" />
                <span style={{ fontSize: '1.5rem', zIndex: 2 }}>✨</span>
              </div>
              
              <div className="quote-body" style={{ margin: '14px 0' }}>
                <span className="quote-icon" style={{ fontSize: '2rem', color: 'rgba(139, 92, 246, 0.4)', display: 'block', height: '20px', lineHeight: '1' }}>“</span>
                <p className="quote-text font-heading animate-fade-in" style={{ fontSize: '0.925rem', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)', margin: '8px 0', fontStyle: 'italic', fontWeight: 600 }}>
                  {activeQuote?.text}
                </p>
                <span className="quote-author" style={{ fontSize: '0.725rem', color: 'var(--accent-violet-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  — {activeQuote?.author}
                </span>
              </div>

              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', margin: '12px 0 0 0' }}>
                🧠 Digitizing and analyzing your fashion items in the background...
              </p>
            </div>
          </div>
        )}

        <div className="upload-container">
          {/* Left Column: Image Upload & Background Editor */}
          <div className="upload-zone-wrapper animate-slide-up">
            <div
              className={`upload-dropzone glass-card ${dragActive ? 'active' : ''} ${originalUrl ? 'has-preview' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !originalUrl && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden-input"
              />

              {originalUrl ? (
                <div className="preview-container">
                  {/* Blurred backdrop to fill different aspect ratios beautifully without layout shifts */}
                  <img
                    src={currentPreviewSrc}
                    alt="Preview blur backdrop"
                    className="image-preview-backdrop"
                  />
                  <img
                    ref={imageElementRef}
                    src={currentPreviewSrc}
                    alt="Preview"
                    className="image-preview"
                  />
                  <button className="btn btn-icon btn-remove-img" onClick={(e) => { e.stopPropagation(); clearFile(); }} title="Remove image">
                    <IconX />
                  </button>
                  {originalUrl && (
                    <div className="bg-removed-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet-light)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      ✨ Zyntra AI Background Isolation Active
                    </div>
                  )}
                  <div className="preview-overlay" onClick={() => fileInputRef.current?.click()}>
                    <IconImage />
                    <span>Click to change image</span>
                  </div>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon-circle">
                    <IconUpload />
                  </div>
                  <h3>Drag & drop an image</h3>
                  <p>or click to browse from your device</p>
                  <span className="upload-hint">Supports JPG, PNG, WEBP (Max 10MB)</span>
                </div>
              )}
            </div>

            {originalUrl && bgRemovedUrl && isBgRemovalImperfect && (
              <div className="bg-removal-warning-box animate-slide-up" style={{ marginTop: '16px', padding: '18px 20px', borderRadius: '16px', border: '1px dashed #ef4444', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.06) 100%)', boxShadow: '0 8px 32px rgba(239,68,68,0.2)', backdropFilter: 'blur(10px)', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem', marginTop: '-2px', flexShrink: 0 }}>🛑</span>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>Background Not Removed Properly</h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Zyntra's vision scan detected background splotches or shadows that couldn't be fully cleared. <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Upload is blocked.</strong> Please re-upload a photo taken against a <strong style={{ color: 'rgba(255,255,255,0.75)' }}>plain, solid-color wall</strong> for clean isolation.
                    </p>
                    <button
                      type="button"
                      onClick={() => { clearFile(); setTimeout(() => fileInputRef.current?.click(), 80); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.02em' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.8)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                    >
                      📸 Try a Different Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="upload-info-box">
              <h4>✨ Smart Closet Power</h4>
              <p>Zyntra isolates clothing items from backgrounds automatically, extracts color signatures, and calculates color theory scoring instantly.</p>
            </div>
          </div>

          {/* Right Column: Details Form (Collapsible and Gamified) */}
          <form className="upload-form glass-card animate-slide-up delay-1" onSubmit={handleSubmit}>
            <h3 className="form-section-title">Item Details</h3>
            
            <div className="input-group">
              <label htmlFor="name">Item Name *</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="name"
                  name="name"
                  className={`input ${nameValidationError ? 'error-input' : ''}`}
                  placeholder="e.g., Black Denim Jacket"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%' }}
                />
                {nameValidationError && (
                  <div className="name-validation-popup animate-fade-in">
                    <span className="popup-arrow" />
                    <span className="popup-icon">⚠️</span>
                    <span className="popup-text">it appears like, {nameValidationError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="input-group">
              <label>Category *</label>
              <div 
                className="category-radio-grid" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', 
                  gap: '12px', 
                  marginTop: '4px' 
                }}
              >
                {CATEGORY_ITEMS.map((cat) => {
                  const CatIcon = cat.Icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`category-radio-card glass-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '20px 10px 14px 10px',
                        cursor: 'pointer',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--accent-violet-soft)' : 'rgba(255, 255, 255, 0.01)',
                        color: isSelected ? 'var(--accent-violet-light)' : 'var(--text-secondary)',
                        boxShadow: isSelected ? 'var(--shadow-glow-violet)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        textAlign: 'center',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-medium)';
                          e.currentTarget.style.background = 'var(--bg-glass-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {/* Round Radio Indicator at Top-Right */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          right: '10px', 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          border: isSelected ? '4px solid var(--accent-violet-light)' : '1px solid var(--border-strong)', 
                          background: isSelected ? 'var(--bg-primary)' : 'transparent', 
                          transition: 'all 0.25s ease' 
                        }} 
                      />
                      
                      <div className="radio-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isSelected ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.25s ease' }}>
                        <CatIcon />
                      </div>
                      
                      <span style={{ fontSize: '0.813rem', fontWeight: 600, letterSpacing: '0.01em', textTransform: 'capitalize' }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADVANCED DETAILS DROPDOWN (Perfect for lazy users, keeps upload simple!) */}
            <div className="advanced-accordion">
              <button
                type="button"
                className="advanced-toggle font-heading"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>Want to add more info ?</span>
                <IconChevronDown open={showAdvanced} />
              </button>

              {showAdvanced && (
                <div className="advanced-content animate-slide-up">
                  <div className="input-group">
                    <label htmlFor="subcategory">Subcategory</label>
                    <input
                      id="subcategory"
                      name="subcategory"
                      className="input"
                      placeholder="e.g., Hoodie, Graphic Tee, Boots"
                      value={formData.subcategory}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="brand">Brand</label>
                    <input
                      id="brand"
                      name="brand"
                      className="input"
                      placeholder="e.g., Zara, Levi's, Nike"
                      value={formData.brand}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="selection-groups">
                    <div className="selection-group">
                      <label>Seasons</label>
                      <div className="chip-group">
                        {SEASONS.map((season) => {
                          const active = formData.season.includes(season);
                          return (
                            <button
                              key={season}
                              type="button"
                              className={`chip ${active ? 'active' : ''}`}
                              onClick={() => toggleChip('season', season)}
                            >
                              {season}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="selection-group">
                      <label>Occasions</label>
                      <div className="chip-group">
                        {OCCASIONS.map((occasion) => {
                          const active = formData.occasion.includes(occasion);
                          return (
                            <button
                              key={occasion}
                              type="button"
                              className={`chip ${active ? 'active' : ''}`}
                              onClick={() => toggleChip('occasion', occasion)}
                            >
                              {occasion}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Tags</label>
                    <div className="tags-input-container input">
                      <div className="tags-list">
                        {tags.map((tag, idx) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                            <button type="button" className="remove-tag-btn" onClick={() => handleRemoveTag(idx)}>
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Any memories you own. Press Enter once done."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="tags-subinput"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              {isBgRemovalImperfect && (
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#f87171', textAlign: 'center', fontWeight: 600 }}>
                  🛑 Fix background removal above before uploading
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-lg submit-btn"
                disabled={loading || !originalFile || processing || (autoRemove && isBgRemovalImperfect)}
                id="btn-upload-submit"
                title={isBgRemovalImperfect ? 'Background removal imperfect — please re-upload with a plain background' : ''}
              >
                {loading ? <span className="loader-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Add to your Wardrobe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
