import { useNavigate } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { fallbackImg } from "../services/format";

export default function VenueCard({ venue }) {
  const navigate = useNavigate();
  const { has, toggle } = useFavorites();
  const saved = has(venue.id);

  return (
    <div className="venue-card" onClick={() => navigate(`/venues/${venue.id}`)}>
      <div className="card-img-wrap">
        <img src={venue.image} alt={venue.name} className="card-img" loading="lazy" onError={fallbackImg} />
        <div className="card-badge">{venue.type}</div>
        {venue.featured && <div className="card-featured">⭐ Featured</div>}
        <button
          className={`heart-btn ${saved ? "saved" : ""}`}
          aria-label={saved ? "Remove from favourites" : "Save to favourites"}
          onClick={(e) => { e.stopPropagation(); toggle(venue.id); }}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <div className="card-body">
        <h3 className="card-title">{venue.name}</h3>
        <p className="card-location">📍 {venue.location}, {venue.city}</p>
        <div className="card-meta">
          <span className="card-capacity">👥 Up to {venue.capacity}</span>
          <span className="card-rating">⭐ {venue.rating} ({venue.reviews})</span>
        </div>
        <div className="card-tags">
          {venue.amenities?.slice(0, 3).map(a => (
            <span key={a} className="tag">{a}</span>
          ))}
        </div>
        <div className="card-footer">
          <div className="card-price">
            <span className="price-label">Starting from</span>
            <span className="price-amount">₹{venue.price?.toLocaleString("en-IN")}</span>
            <span className="price-unit">/day</span>
          </div>
          <button className="card-btn">View Details</button>
        </div>
      </div>
    </div>
  );
}
