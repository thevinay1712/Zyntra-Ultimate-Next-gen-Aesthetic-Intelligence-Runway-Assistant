import React, { useState } from 'react';
import TryOnViewport from '../components/TryOnViewport';

const TryOnPlayground = () => {
  const [scaleMatrix, setScaleMatrix] = useState({ x: 1, y: 1, z: 1 });
  const [segmentedImage, setSegmentedImage] = useState(null);
  const [skinTone, setSkinTone] = useState('#f1c27d');
  const [showGarment, setShowGarment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [details, setDetails] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleTryOnSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert("Please upload a photo of yourself.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('height', height);
    formData.append('weight', weight);
    formData.append('details', details);

    try {
      const response = await fetch('http://localhost:5000/api/tryon/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.scaleMatrix) {
        setScaleMatrix(data.scaleMatrix);
        if (data.skinTone) setSkinTone(data.skinTone);
        if (data.segmentedImage) {
          setSegmentedImage(`data:image/png;base64,${data.segmentedImage}`);
        }
      } else {
        alert(data.message || 'Failed to extract scaling matrix');
      }
    } catch (error) {
      console.error('Error generating tryon:', error);
      alert('Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">3D Try-On Playground</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleTryOnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Height (cm):</label>
              <input 
                type="number" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 170"
                style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Weight (kg):</label>
              <input 
                type="number" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 70"
                style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Additional Details:</label>
              <textarea 
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Broad shoulders, slim fit preference..."
                style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px', minHeight: '80px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Upload your photo for pose extraction:</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                style={{ width: '100%', color: '#aaa' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                backgroundColor: loading ? '#555' : '#8a2be2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Generating...' : 'Generate Avatar'}
            </button>
          </form>
          
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h3 className="text-xl font-semibold mb-4">Current Scaling Matrix</h3>
            {loading ? (
              <p className="text-neutral-400 animate-pulse">Extracting pose via MediaPipe AI...</p>
            ) : (
              <pre className="text-green-400 text-sm overflow-x-auto">
                {JSON.stringify(scaleMatrix, null, 2)}
              </pre>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-neutral-200">3D Preview</h3>
            <label className="flex items-center space-x-2 cursor-pointer bg-neutral-800 px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-700 transition">
              <input 
                type="checkbox" 
                checked={showGarment}
                onChange={(e) => setShowGarment(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 bg-neutral-900 border-neutral-600"
              />
              <span className="text-sm font-medium text-neutral-300">Wear Zyntra Bodysuit</span>
            </label>
          </div>
          <TryOnViewport scaleMatrix={scaleMatrix} skinTone={skinTone} showGarment={showGarment} />
        </div>
      </div>
    </div>
  );
};

export default TryOnPlayground;
