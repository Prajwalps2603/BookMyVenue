import VenueCard from "./VenueCard";

export function SkeletonCards({ n = 6 }) {
  return (
    <div className="venues-grid">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="venue-card skeleton-card">
          <div className="skeleton sk-img" />
          <div className="card-body">
            <div className="skeleton sk-line w70" />
            <div className="skeleton sk-line w50" />
            <div className="skeleton sk-line w90" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="no-results">
      <span>🔌</span>
      <h3>Couldn't load venues</h3>
      <p>{message}</p>
      {onRetry && <button className="clear-filters-btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export default function VenueGrid({ venues }) {
  return (
    <div className="venues-grid">
      {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
    </div>
  );
}
