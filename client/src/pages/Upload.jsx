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

const CATEGORIES = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const OCCASIONS = ['casual', 'formal', 'sport', 'party'];

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

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, detectedColor });
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

  // Background removal settings
  const [autoRemove, setAutoRemove] = useState(true);
  const [tolerance, setTolerance] = useState(35);
  const [keyColor, setKeyColor] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [samplingMode, setSamplingMode] = useState(false);

  // Zyntra Web Finder states
  const [finderQuery, setFinderQuery] = useState('');
  const [finderResults, setFinderResults] = useState([]);
  const [finderScanning, setFinderScanning] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [selectedFinderId, setSelectedFinderId] = useState(null);

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

  // Sync finderQuery when name changes (for ease of search)
  useEffect(() => {
    if (formData.name && !finderQuery) {
      setFinderQuery(formData.name);
    }
  }, [formData.name]);

  // Trigger background removal on original image changes
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
        
        // Clean up previous processed url to avoid memory leaks
        if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
        
        const newUrl = URL.createObjectURL(result.blob);
        setBgRemovedUrl(newUrl);
        
        if (!keyColor) {
          setKeyColor(result.detectedColor);
        }
      } catch (err) {
        console.error('Background removal failed:', err);
      } finally {
        setProcessing(false);
      }
    }, 300); // Debounce slider inputs

    return () => clearTimeout(timer);
  }, [originalUrl, keyColor, tolerance, autoRemove]);

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
      setSelectedFinderId(null);
    } else {
      error('Please select a valid image file');
    }
  };

  const handleSearchWebClick = (e) => {
    e.preventDefault();
    if (!finderQuery.trim()) {
      return error('Please type a search query first');
    }
    setPermissionRequested(true);
  };

  const handleConfirmSearch = async () => {
    setPermissionRequested(false);
    setPermissionGranted(true);
    setFinderScanning(true);
    setFinderResults([]);
    setSelectedFinderId(null);

    const query = finderQuery.trim();
    const category = formData.category || 'tops';

    try {
      const res = await imageSearchAPI.search(query, category);
      const results = res.data?.results || [];

      if (results.length === 0) {
        error('No results found. Try a different search term.');
      } else {
        setFinderResults(results);
        success(`Found ${results.length} matching items for "${query}"!`);
      }
    } catch (err) {
      console.error('Web Finder search failed:', err);
      error('Search failed. Check your connection and try again.');
    } finally {
      setFinderScanning(false);
    }
  };

  const handleSelectCatalogItem = async (item) => {
    try {
      setProcessing(true);
      const response = await fetch(item.url);
      const blob = await response.blob();
      const file = new File([blob], `${item.title.toLowerCase().replace(/\s+/g, '-')}-catalog.jpg`, { type: 'image/jpeg' });
      
      setOriginalFile(file);
      const localUrl = URL.createObjectURL(file);
      setOriginalUrl(localUrl);
      
      setFormData(prev => ({
        ...prev,
        name: item.title,
        brand: item.brand,
      }));

      setAutoRemove(true);
      setTolerance(32);
      
      setBgRemovedBlob(null);
      setBgRemovedUrl(null);
      setKeyColor(null);
      setSelectedFinderId(item.id);
      success(`Successfully fetched transparent catalog photo for ${item.title}!`);
    } catch (err) {
      console.error('Failed to fetch catalog image:', err);
      error('Web fetch failed or was blocked. Using local preview.');
    } finally {
      setProcessing(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalFile) return error('Please select an image');
    if (!formData.name) return error('Please provide a name');

    setLoading(true);
    const data = new FormData();
    
    // Choose between processed transparent png blob or original file
    if (autoRemove && bgRemovedBlob) {
      // Append as PNG file
      data.append('image', bgRemovedBlob, `${formData.name.toLowerCase().replace(/\s+/g, '-')}-transparent.png`);
    } else {
      data.append('image', originalFile);
    }

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
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to upload item');
      setLoading(false);
    }
  };

  const currentPreviewSrc = autoRemove && bgRemovedUrl ? bgRemovedUrl : originalUrl;

  return (
    <div className="main-content" id="upload-page">
      <div className="container max-w-4xl">
        <div className="upload-header animate-fade-in">
          <h1 className="dashboard-title">Add to Wardrobe</h1>
          <p className="dashboard-subtitle">Digitize a new piece of clothing with visual adjustments</p>
        </div>

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
                  <img
                    ref={imageElementRef}
                    src={currentPreviewSrc}
                    alt="Preview"
                    className="image-preview"
                  />
                  <button className="btn btn-icon btn-remove-img" onClick={(e) => { e.stopPropagation(); clearFile(); }} title="Remove image">
                    <IconX />
                  </button>
                  {!processing && bgRemovedUrl && (
                    <div className="bg-removed-badge">✂️ Background removed</div>
                  )}
                  {processing && (
                    <div className="bg-removed-badge processing">⏳ Removing background...</div>
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



            {/* Zyntra Web Finder Assistant */}
            <div className="web-finder-panel glass-card" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <div className="web-finder-banner">
                <span className="web-finder-banner-icon">🔍</span>
                <div className="web-finder-banner-text">
                  <h4 className="font-heading">Zyntra Web Finder</h4>
                  <p>Photo quality low? Fetch transparent catalog photos of your item directly from the web!</p>
                </div>
              </div>

              <div className="web-finder-search-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Enter brand or description (e.g. Levi's Indigo Jeans)"
                  value={finderQuery}
                  onChange={(e) => setFinderQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSearchWebClick}
                  disabled={finderScanning}
                  style={{ minWidth: '100px' }}
                >
                  Search Web
                </button>
              </div>

              {finderScanning && (
                <div className="web-finder-scanning">
                  <div className="scanning-ring-container">
                    <div className="scanning-ring" />
                    <div className="scanning-glow" />
                  </div>
                  <p className="font-heading" style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                    Scanning web catalogs for "{finderQuery}"...
                  </p>
                </div>
              )}

              {!finderScanning && finderResults.length > 0 && (
                <div className="web-finder-results-grid animate-slide-up">
                  {finderResults.map((item) => {
                    const isSelected = selectedFinderId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`web-finder-item-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCatalogItem(item)}
                      >
                        {isSelected && <div className="web-finder-select-badge">✓</div>}
                        <div className="web-finder-item-img-container">
                          <img src={item.url} alt={item.title} className="web-finder-item-img" />
                        </div>
                        <div className="web-finder-item-footer">
                          <span className="web-finder-item-title">{item.title}</span>
                          <span className="web-finder-item-brand">{item.brand}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
              <input
                id="name"
                name="name"
                className="input"
                placeholder="e.g., Black Denim Jacket"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                className="input filter-select"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* ADVANCED DETAILS DROPDOWN (Perfect for lazy users, keeps upload simple!) */}
            <div className="advanced-accordion">
              <button
                type="button"
                className="advanced-toggle font-heading"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>🚀 Stylist Details (Optional)</span>
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
                        placeholder="Add tag and press Enter"
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
              <button
                type="submit"
                className="btn btn-primary btn-lg submit-btn"
                disabled={loading || !originalFile || processing}
                id="btn-upload-submit"
              >
                {loading ? <span className="loader-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Add to Wardrobe'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Zyntra Web Finder Permission Dialog */}
      {permissionRequested && (
        <div className="permission-modal-overlay animate-fade-in" onClick={() => setPermissionRequested(false)}>
          <div className="permission-modal-content glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="permission-modal-icon-circle">🌐</div>
            <h3 className="font-heading">Web Search Permission</h3>
            <p>
              Zyntra would like to connect to web product search indexers to look up clean, high-resolution catalog photos matching <strong>"{finderQuery}"</strong>. 
              <br /><br />
              Do you authorize Zyntra to query catalog indexers?
            </p>
            <div className="permission-modal-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPermissionRequested(false);
                  error('Search permission denied.');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSearch}
              >
                Authorize & Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
