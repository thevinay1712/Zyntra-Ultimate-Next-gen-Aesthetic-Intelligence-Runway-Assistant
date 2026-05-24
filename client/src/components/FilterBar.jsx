import './FilterBar.css';

const IconSearch = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconFilter = () => <svg viewBox="0 0 24 24" className="icon icon-sm"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;

export default function FilterBar({ filters, setFilters }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters((prev) => ({ ...prev, season: '', occasion: '', search: '' }));
  };

  const hasActiveFilters = filters.season || filters.occasion || filters.search;

  return (
    <div className="filter-bar glass">
      <div className="filter-search">
        <IconSearch />
        <input
          type="text"
          name="search"
          placeholder="Search items, brands, tags..."
          value={filters.search}
          onChange={handleChange}
          className="search-input"
        />
      </div>

      <div className="filter-options">
        <div className="filter-icon-wrapper">
          <IconFilter />
        </div>
        
        <select
          name="season"
          value={filters.season}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">All Seasons</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
        </select>

        <select
          name="occasion"
          value={filters.occasion}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">All Occasions</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
          <option value="sport">Sport</option>
          <option value="party">Party</option>
        </select>

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm btn-clear" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
