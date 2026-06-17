import { useState } from 'react';
import './ClothingCard.css';

const IconTrash = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6"/></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconTag = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01"/></svg>;
const IconCheck = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><polyline points="20 6 9 17 4 12"/></svg>;

export default function ClothingCard({ item, onDelete, onEdit, selectable, selected, onSelect, style }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const primaryColor = item.color?.primary || '#888888';
  
  // Format tags for display
  const displayTags = [...(item.season || []), ...(item.occasion || [])].slice(0, 2);

  return (
    <div 
      className={`clothing-card glass-card animate-fade-in-scale ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''}`}
      style={{
        ...style,
        '--card-accent': primaryColor
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={selectable ? () => onSelect(item) : undefined}
    >
      {/* Accent glow line at top */}
      <div className="card-accent-line" style={{ backgroundColor: primaryColor }} />

      <div className="card-image-wrap">
        {!imageLoaded && <div className="card-image-skeleton skeleton" />}
        
        <img
          src={`http://localhost:5000${item.imageUrl}`}
          alt={item.name}
          className={`card-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease',
            opacity: imageLoaded ? 1 : 0
          }}
        />
        
        {/* Color dots overlay */}
        <div className="card-color-overlay">
          <div className="card-color-dot" style={{ backgroundColor: primaryColor }} title="Primary Color" />
          {item.color?.secondary && (
            <div className="card-color-dot" style={{ backgroundColor: item.color.secondary }} title="Secondary Color" />
          )}
        </div>

        {selectable && selected && (
          <div className="card-selected-overlay">
            <div className="card-selected-check">
              <IconCheck />
            </div>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title" title={item.name}>{item.name}</h3>
          <div className="card-actions">
            {onEdit && (
              <button 
                className="btn btn-ghost btn-icon btn-action" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                title="Edit item"
              >
                <IconEdit />
              </button>
            )}
            {onDelete && (
              <button 
                className="btn btn-ghost btn-icon btn-action btn-delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item._id);
                }}
                title="Delete item"
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>

        <p className="card-category">
          {item.subcategory ? `${item.category} / ${item.subcategory}` : item.category}
        </p>

        {item.brand && <p className="card-brand">{item.brand}</p>}

        <div className="card-footer">
          <div className="card-tags">
            {displayTags.map(tag => (
              <span key={tag} className="card-tag">
                {tag}
              </span>
            ))}
            {displayTags.length === 0 && <span className="card-tag empty">No tags</span>}
          </div>
          
          <div className="card-stats" title={`Worn ${item.wearCount || 0} times`}>
            <IconTag />
            <span>{item.wearCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
