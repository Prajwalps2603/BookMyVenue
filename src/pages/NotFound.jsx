import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="nf-emoji">🎈</div>
      <h1>404</h1>
      <p>Looks like this party has moved to another venue.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
