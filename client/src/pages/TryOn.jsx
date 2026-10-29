import { useState } from 'react';
import Avatar from './Avatar';
import './TryOn.css';

/**
 * Zyntra AR Try-On Modal Component
 * Wraps the full-power AR Studio (MediaPipe Live AR Mirror + 3D Room-Scale Hologram)
 * directly inside an interactive modal for recommended outfits and closet views.
 */
export default function TryOn({ outfit = null, onClose = null }) {
  return (
    <div className="modal-overlay ar-tryon-modal animate-fade-in" onClick={onClose}>
      <div 
        className="modal-content glass-card ar-tryon-modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ar-modal-top-bar">
          <div className="ar-modal-title-group">
            <span className="live-dot" />
            <h3 className="font-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
              Zyntra AR Studio <span className="badge badge-cyan" style={{ marginLeft: 8, fontSize: '0.7rem' }}>VR/AR Lab</span>
            </h3>
          </div>
          <button 
            className="btn btn-icon btn-ghost ar-modal-close-btn" 
            onClick={onClose}
            title="Close AR Studio"
          >
            ✕
          </button>
        </div>

        <div className="ar-modal-scrollable-body">
          <Avatar initialOutfit={outfit} />
        </div>
      </div>
    </div>
  );
}
