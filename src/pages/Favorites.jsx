import { Link } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useVenues } from "../hooks/useVenues";
import VenueGrid, { SkeletonCards } from "../components/VenueGrid";

export default function Favorites() {
  const { ids } = useFavorites();
  const { venues, loading } = useVenues();
  const saved = venues.filter((v) => ids.includes(v.id));

  return (
    <div className="page-wrap">
      <h1 className="page-title">♥ Your Favourites</h1>
      {loading ? (
        <SkeletonCards n={3} />
      ) : saved.length === 0 ? (
        <div className="no-results">
          <span>💔</span>
          <h3>Nothing saved yet</h3>
          <p>Tap the heart on any venue to keep it here.</p>
          <Link to="/venues" className="clear-filters-btn">Browse venues</Link>
        </div>
      ) : (
        <VenueGrid venues={saved} />
      )}
    </div>
  );
}
