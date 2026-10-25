import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import VenueGrid, { SkeletonCards, ErrorBox } from "../components/VenueGrid";
import SearchBar from "../components/SearchBar";
import { useVenues } from "../hooks/useVenues";
import { capacityOf } from "../services/format";

const TYPES = ["All", "Wedding", "Party", "Corporate", "Outdoor", "Birthday", "Reception"];
const SORT_OPTIONS = ["Recommended", "Price: Low to High", "Price: High to Low", "Top Rated"];
const AMENITIES = ["AC", "Parking", "Catering", "DJ", "Garden", "Bar", "WiFi", "Stage"];

export default function Venues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { venues, loading, error, reload } = useVenues();
  const [typeOverride, setTypeOverride] = useState(null);
  const [sortBy, setSortBy] = useState("Recommended");
  const [maxPrice, setMaxPrice] = useState(200000);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);

  // The URL (?type= ?q= ?city= ?guests=) is the source of truth; clicking a pill overrides the type
  const urlType = (searchParams.get("type") || "").toLowerCase();
  const activeType = typeOverride && typeOverride.url === urlType
    ? typeOverride.value
    : (TYPES.find(t => t.toLowerCase() === urlType) || "All");
  const q = (searchParams.get("q") || "").toLowerCase();
  const city = searchParams.get("city") || "";
  const guests = Number(searchParams.get("guests")) || 0;

  const setActiveType = (t) => setTypeOverride({ url: urlType, value: t });

  const filtered = useMemo(() => {
    let result = venues.filter(v =>
      (activeType === "All" || v.type.toLowerCase() === activeType.toLowerCase()) &&
      (!q || [v.name, v.location, v.city, v.type].some(x => x.toLowerCase().includes(q))) &&
      (!city || city === "All India" || v.city === city) &&
      (!guests || capacityOf(v) >= (guests === 1000 ? 500 : guests)) &&
      v.price <= maxPrice &&
      selectedAmenities.every(a => v.amenities?.includes(a))
    );
    if (sortBy === "Price: Low to High") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "Price: High to Low") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "Top Rated") result.sort((a, b) => b.rating - a.rating);
    else result.sort((a, b) => Number(b.featured) - Number(a.featured));
    return result;
  }, [venues, activeType, q, city, guests, maxPrice, selectedAmenities, sortBy]);

  const toggleAmenity = (a) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const clearAll = () => {
    setTypeOverride(null);
    setSearchParams({});
    setMaxPrice(200000);
    setSelectedAmenities([]);
    setSortBy("Recommended");
  };

  const activeFilterCount = [
    activeType !== "All" ? 1 : 0,
    city && city !== "All India" ? 1 : 0,
    q ? 1 : 0,
    maxPrice < 200000 ? 1 : 0,
    selectedAmenities.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="venues-page">
      {/* Hero */}
      <div className="venues-hero">
        <h1>Find Your Venue</h1>
        <p>Explore {venues.length || "our"} verified venues across India</p>
        <SearchBar />
      </div>

      {/* ── Inline Top Filter Bar ── */}
      <div className="top-filter-bar">
        <div className="top-filter-inner">

          {/* Type Pills */}
          <div className="type-pills-scroll">
            {TYPES.map(t => (
              <button
                key={t}
                className={`type-pill ${activeType === t ? "active" : ""}`}
                onClick={() => setActiveType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="filter-bar-divider" />

          {/* Sort */}
          <select
            className="inline-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>

          {/* Price quick filter */}
          <div className="price-quick">
            <span className="price-quick-label">Max ₹{(maxPrice / 1000).toFixed(0)}K</span>
            <input
              type="range" min={20000} max={200000} step={10000}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="price-quick-range"
            />
          </div>

          {/* More Filters (opens sidebar) */}
          <button
            className={`more-filters-btn ${showSidebar ? "active" : ""}`}
            onClick={() => setShowSidebar(s => !s)}
          >
            ⚙ Filters {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button className="clear-inline-btn" onClick={clearAll}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {(activeType !== "All" || selectedAmenities.length > 0 || maxPrice < 200000 || q || (city && city !== "All India")) && (
        <div className="active-chips">
          {city && city !== "All India" && <span className="chip">📍 {city} <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("city"); setSearchParams(p); }}>✕</button></span>}
          {q && <span className="chip">"{q}" <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("q"); setSearchParams(p); }}>✕</button></span>}
          {activeType !== "All" && (
            <span className="chip">{activeType} <button onClick={() => setActiveType("All")}>✕</button></span>
          )}
          {maxPrice < 200000 && (
            <span className="chip">≤ ₹{(maxPrice/1000).toFixed(0)}K <button onClick={() => setMaxPrice(200000)}>✕</button></span>
          )}
          {selectedAmenities.map(a => (
            <span key={a} className="chip">{a} <button onClick={() => toggleAmenity(a)}>✕</button></span>
          ))}
        </div>
      )}

      <div className="venues-layout-new">
        {/* ── Slide-in Sidebar ── */}
        <aside className={`filter-drawer ${showSidebar ? "open" : ""}`} >
          <div className="drawer-header">
            <h3>More Filters</h3>
            <button className="drawer-close" onClick={() => setShowSidebar(false)}>✕</button>
          </div>

          <div className="filter-group">
            <label className="filter-label">Event Type</label>
            {TYPES.map(t => (
              <button
                key={t}
                className={`filter-type-btn ${activeType === t ? "active" : ""}`}
                onClick={() => setActiveType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <label className="filter-label">Max Budget</label>
            <div className="range-value">₹{maxPrice.toLocaleString()}</div>
            <input
              type="range" min={20000} max={200000} step={5000}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="range-input"
            />
            <div className="range-limits"><span>₹20K</span><span>₹2L</span></div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Amenities</label>
            <div className="amenity-check-grid">
              {AMENITIES.map(a => (
                <label key={a} className={`amenity-check ${selectedAmenities.includes(a) ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="drawer-footer">
            <button className="clear-filters-btn" onClick={clearAll}>Clear All</button>
            <button className="apply-btn" onClick={() => setShowSidebar(false)}>
              Show {filtered.length} Results
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {showSidebar && <div className="drawer-overlay" onClick={() => setShowSidebar(false)} />}

        {/* ── Main Results ── */}
        <main className="venues-main-new">
          <p className="results-count">
            <strong>{filtered.length}</strong> venues found
            {activeType !== "All" && ` for "${activeType}"`}
          </p>

          {error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : loading ? (
            <SkeletonCards />
          ) : filtered.length > 0 ? (
            <VenueGrid venues={filtered} />
          ) : (
            <div className="no-results">
              <span>😔</span>
              <h3>No venues found</h3>
              <p>Try adjusting your filters or search query</p>
              <button className="clear-filters-btn" onClick={clearAll}>Clear Filters</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}