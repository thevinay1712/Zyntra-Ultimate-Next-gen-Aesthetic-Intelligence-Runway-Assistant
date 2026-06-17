import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clothingAPI } from '../lib/api';
import ClothingCard from '../components/ClothingCard';
import FilterBar from '../components/FilterBar';
import './Dashboard.css';

const IconPlus = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconShirt = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20.38 3.46L16 2a8 8 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>;
const IconPants = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M15.5 22H21v-3.5L18.5 7 17 3H7L5.5 7 3 18.5V22h5.5v-3.5h7V22z M11 3v12 M13 3v12"/></svg>;
const IconShoe = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M4 16v4h16v-4 M4 16s1.5-2 4-2 3 2 4 2 2-2 4-2 2 2 4 2 M4 12c0-2 2-4 4-4s3 2 4 2 2-2 4-2 2 2 4 2"/></svg>;
const IconCoat = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><path d="M20 5l-4-3-4 3 M4 5l4-3 4 3 M6 10v12h12V10 M6 10l6-4 6 4"/></svg>;
const IconWatch = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="12" cy="12" r="6"/><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="9" y="18" width="6" height="4" rx="1"/><path d="M12 9v3l1.5 1.5"/></svg>;
const IconEmpty = () => <svg viewBox="0 0 24 24" className="icon icon-xl" style={{ width: 64, height: 64 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><path d="M14 8h3 M14 12h3 M14 16h3"/></svg>;

export default function Dashboard() {
  const [clothes, setClothes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    season: '',
    occasion: '',
    search: '',
  });
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: 'tops',
    subcategory: '',
    brand: '',
    season: [],
    occasion: [],
    tags: []
  });
  const [modalTagInput, setModalTagInput] = useState('');

  useEffect(() => {
    fetchClothes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clothes, filters]);

  const fetchClothes = async () => {
    try {
      const { data } = await clothingAPI.getAll();
      setClothes(data.clothes || []);
    } catch (err) {
      console.error('Failed to fetch clothes:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...clothes];

    if (filters.category) {
      result = result.filter((c) => c.category === filters.category);
    }
    if (filters.season) {
      result = result.filter((c) => c.season?.includes(filters.season));
    }
    if (filters.occasion) {
      result = result.filter((c) => c.occasion?.includes(filters.occasion));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.subcategory?.toLowerCase().includes(q) ||
          c.brand?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    setFiltered(result);
  };

  const handleDelete = async (id) => {
    try {
      await clothingAPI.delete(id);
      setClothes((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name || '',
      category: item.category || 'tops',
      subcategory: item.subcategory || '',
      brand: item.brand || '',
      season: item.season || [],
      occasion: item.occasion || [],
      tags: item.tags || []
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { data } = await clothingAPI.update(editingItem._id, editFormData);
      setClothes((prev) => prev.map((c) => c._id === editingItem._id ? data.clothing : c));
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const categories = [
    { id: 'tops', label: 'Tops', Icon: IconShirt },
    { id: 'bottoms', label: 'Bottoms', Icon: IconPants },
    { id: 'outerwear', label: 'Outerwear', Icon: IconCoat },
    { id: 'shoes', label: 'Shoes', Icon: IconShoe },
    { id: 'accessories', label: 'Accessories', Icon: IconWatch },
  ];

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat.id] = clothes.filter((c) => c.category === cat.id).length;
    return acc;
  }, {});

  return (
    <div className="main-content" id="dashboard-page">
      <div className="container">
        {/* Stats Header */}
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 className="dashboard-title">My Wardrobe</h1>
            <p className="dashboard-subtitle">
              {clothes.length} item{clothes.length !== 1 ? 's' : ''} organized
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-pills animate-fade-in delay-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill ${filters.category === cat.id ? 'active' : ''}`}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: prev.category === cat.id ? '' : cat.id,
                }))
              }
            >
              <cat.Icon />
              <span className="pill-label">{cat.label}</span>
              <span className="pill-count">{categoryCounts[cat.id]}</span>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar filters={filters} setFilters={setFilters} />

        {/* Clothing Grid */}
        {loading ? (
          <div className="clothes-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton clothing-skeleton" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="clothes-grid">
            {/* Dedicated "Add Clothes" Card Box */}
            <Link to="/upload" className="clothing-card glass-card add-card animate-fade-in-scale">
              <div className="card-image-wrap add-card-image-wrap">
                <div className="add-card-plus">+</div>
              </div>
              <div className="card-content add-card-content">
                <h3 className="card-title" style={{ color: 'var(--accent-violet-light)' }}>Add Clothes</h3>
                <p className="card-category">Digitize new garment</p>
                <div className="card-footer" style={{ borderTop: 'none', padding: 0, marginTop: 'auto' }}>
                  <span className="card-tag" style={{ background: 'var(--accent-violet-soft)', color: 'var(--accent-violet-light)' }}>Quick Upload</span>
                </div>
              </div>
            </Link>

            {filtered.map((item, i) => (
              <ClothingCard
                key={item._id}
                item={item}
                onDelete={handleDelete}
                onEdit={handleEditClick}
                style={{ animationDelay: `${((i + 1) % 10) * 0.05}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon-wrap">
              <div className="empty-glow" />
              <IconEmpty />
            </div>
            <h3 className="empty-title">
              {clothes.length === 0 ? 'Your closet is empty' : 'No items found'}
            </h3>
            <p className="empty-subtitle">
              {clothes.length === 0
                ? 'Start digitizing your wardrobe by uploading your first piece.'
                : 'Try adjusting your search or filters.'}
            </p>
            {clothes.length === 0 && (
              <Link to="/upload" className="btn btn-primary" id="btn-empty-upload">
                <IconPlus /> Upload First Item
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="modal-overlay animate-fade-in" onClick={() => setEditingItem(null)}>
          <div className="modal-content glass-card animate-slide-up" style={{ maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="form-section-title" style={{ marginTop: 0 }}>Edit Item</h3>
            
            <div className="modal-item-preview">
              <img src={`http://localhost:5000${editingItem.imageUrl}`} alt="Preview" />
            </div>

            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="input-group">
                <label>Item Name</label>
                <input
                  type="text"
                  className="input"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label>Category</label>
                <select
                  className="input filter-select"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  required
                >
                  <option value="tops">Tops</option>
                  <option value="bottoms">Bottoms</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="shoes">Shoes</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div className="input-group">
                <label>Subcategory</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Hoodie, Graphic Tee"
                  value={editFormData.subcategory}
                  onChange={(e) => setEditFormData({ ...editFormData, subcategory: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Brand</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Nike, Zara"
                  value={editFormData.brand}
                  onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                />
              </div>

              <div className="selection-groups">
                <div className="selection-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Seasons</label>
                  <div className="chip-group">
                    {['spring', 'summer', 'fall', 'winter'].map((season) => {
                      const active = editFormData.season?.includes(season);
                      return (
                        <button
                          key={season}
                          type="button"
                          className={`chip ${active ? 'active' : ''}`}
                          onClick={() => {
                            const current = editFormData.season || [];
                            const updated = current.includes(season)
                              ? current.filter((s) => s !== season)
                              : [...current, season];
                            setEditFormData({ ...editFormData, season: updated });
                          }}
                        >
                          {season}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="selection-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Occasions</label>
                  <div className="chip-group">
                    {['casual', 'formal', 'sport', 'party'].map((occasion) => {
                      const active = editFormData.occasion?.includes(occasion);
                      return (
                        <button
                          key={occasion}
                          type="button"
                          className={`chip ${active ? 'active' : ''}`}
                          onClick={() => {
                            const current = editFormData.occasion || [];
                            const updated = current.includes(occasion)
                              ? current.filter((o) => o !== occasion)
                              : [...current, occasion];
                            setEditFormData({ ...editFormData, occasion: updated });
                          }}
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
                    {(editFormData.tags || []).map((tag, idx) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                        <button
                          type="button"
                          className="remove-tag-btn"
                          onClick={() => {
                            const updated = editFormData.tags.filter((_, i) => i !== idx);
                            setEditFormData({ ...editFormData, tags: updated });
                          }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Any memories you own. Press Enter once done."
                    value={modalTagInput}
                    onChange={(e) => setModalTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const tag = modalTagInput.trim().toLowerCase().replace(/,/g, '');
                        if (tag && !editFormData.tags.includes(tag)) {
                          setEditFormData({ ...editFormData, tags: [...editFormData.tags, tag] });
                        }
                        setModalTagInput('');
                      }
                    }}
                    className="tags-subinput"
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
