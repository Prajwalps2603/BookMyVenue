import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useToast } from "../context/ToastContext";
import { useVenues, pushRecent, invalidateVenues } from "../hooks/useVenues";
import { api } from "../services/api";
import { quote, inr, capacityOf, fallbackImg } from "../services/format";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import StarRating from "../components/StarRating";
import VenueCard from "../components/VenueCard";

export default function VenueDetails() {
  const { id } = useParams();
  const venueId = parseInt(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { has, toggle } = useFavorites();
  const { venues, loading } = useVenues();
  const venue = venues.find(v => v.id === venueId);

  const [activeImg, setActiveImg] = useState(0);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(100);
  const [eventType, setEventType] = useState("Wedding");
  const [booked, setBooked] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => { pushRecent(venueId); }, [venueId]);

  useEffect(() => {
    let cancelled = false;
    api.availability(venueId).then(r => !cancelled && setBooked(r.booked)).catch(() => {});
    api.reviews(venueId).then(r => !cancelled && setReviews(r)).catch(() => {});
    return () => { cancelled = true; };
  }, [venueId]);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!venue) {
    return (
      <div className="not-found">
        Venue not found <button onClick={() => navigate("/venues")}>Browse Venues</button>
      </div>
    );
  }

  const cap = capacityOf(venue);
  const guestCount = Math.min(Number(guests), cap);
  const q = quote(venue.price);
  const similar = venues.filter(v => v.id !== venue.id && (v.type === venue.type || v.city === venue.city)).slice(0, 3);
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${venue.name}, ${venue.location}, ${venue.city}`)}&output=embed`;

  const handleBook = () => {
    if (!user) {
      navigate("/login", { state: { from: `/venues/${id}` } });
      return;
    }
    if (!date) { toast("Pick an available date from the calendar first", "error"); return; }
    navigate("/booking", { state: { venue, date, guests: guestCount, eventType } });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: venue.name, url });
      else { await navigator.clipboard.writeText(url); toast("Link copied to clipboard", "success"); }
    } catch { /* user dismissed the share sheet */ }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!myRating) { toast("Tap a star rating first", "error"); return; }
    setPosting(true);
    try {
      const r = await api.addReview(venueId, { rating: myRating, comment: myComment });
      setReviews(rs => [r, ...rs]);
      setMyRating(0);
      setMyComment("");
      invalidateVenues(); // refresh the average rating
      toast("Thanks for your review!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="venue-details-page">
      {/* Image Gallery */}
      <div className="gallery">
        <div className="gallery-main">
          <img src={venue.images?.[activeImg] || venue.image} alt={venue.name} onError={fallbackImg} />
          <button className="gallery-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="gallery-actions">
            <button className="round-btn" onClick={share} aria-label="Share">🔗</button>
            <button className={`round-btn ${has(venue.id) ? "saved" : ""}`} onClick={() => toggle(venue.id)} aria-label="Favourite">
              {has(venue.id) ? "♥" : "♡"}
            </button>
          </div>
        </div>
        {venue.images?.length > 1 && (
          <div className="gallery-thumbs">
            {venue.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className={`thumb ${activeImg === i ? "active" : ""}`}
                onClick={() => setActiveImg(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="details-layout">
        {/* Left: Info */}
        <div className="details-info">
          <div className="details-header">
            <div>
              <span className="details-type-badge">{venue.type}</span>
              <h1 className="details-title">{venue.name}</h1>
              <p className="details-location">📍 {venue.location}, {venue.city}</p>
            </div>
            <div className="details-rating-wrap">
              <span className="details-rating">⭐ {venue.rating}</span>
              <span className="details-reviews">({venue.reviews} reviews)</span>
            </div>
          </div>

          <div className="details-highlights">
            <div className="highlight"><span>👥</span><span>Up to {venue.capacity}</span></div>
            <div className="highlight"><span>💰</span><span>From {inr(venue.price)}/day</span></div>
            <div className="highlight"><span>✅</span><span>Verified Venue</span></div>
            <div className="highlight"><span>🎉</span><span>{venue.type} Friendly</span></div>
          </div>

          <div className="details-section">
            <h2>About This Venue</h2>
            <p>{venue.description}</p>
          </div>

          <div className="details-section">
            <h2>Amenities & Features</h2>
            <div className="amenities-grid">
              {venue.amenities?.map(a => (
                <div key={a} className="amenity-item">✔ {a}</div>
              ))}
            </div>
          </div>

          <div className="details-section">
            <h2>Location</h2>
            <iframe
              title="Venue location"
              className="map-frame"
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="details-section">
            <h2>Venue Policies</h2>
            <ul className="policy-list">
              <li>🕘 Available from 8:00 AM to 11:00 PM</li>
              <li>🚫 Outside alcohol/catering may be restricted</li>
              <li>📋 50% advance payment required at booking</li>
              <li>↩️ Full refund of the advance if cancelled 15+ days before the event, 50% after that</li>
            </ul>
          </div>

          <div className="details-section">
            <h2>Reviews ({reviews.length})</h2>
            {user ? (
              <form className="review-form" onSubmit={submitReview}>
                <StarRating value={myRating} onChange={setMyRating} size={28} />
                <textarea
                  className="form-input form-textarea"
                  placeholder="Share your experience…"
                  value={myComment}
                  onChange={e => setMyComment(e.target.value)}
                  maxLength={500}
                />
                <button className="btn-primary" disabled={posting}>{posting ? "Posting…" : "Post Review"}</button>
              </form>
            ) : (
              <p className="login-hint"><Link to="/login" state={{ from: `/venues/${id}` }}>Log in</Link> to write a review.</p>
            )}
            {reviews.length === 0 && <p className="muted">No written reviews yet. Be the first!</p>}
            <div className="review-list">
              {reviews.map(r => (
                <div key={r.id} className="review">
                  <div className="review-top">
                    <div className="testimonial-avatar">{r.userName.charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{r.userName}</strong>
                      <div><StarRating value={r.rating} size={14} /> <span className="muted">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span></div>
                    </div>
                  </div>
                  <p>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Booking Card */}
        <div className="booking-card">
          <h2>Book This Venue</h2>
          <div className="booking-price">
            <span className="bp-amount">{inr(venue.price)}</span>
            <span className="bp-unit">/ day</span>
          </div>

          <div className="booking-form">
            <div className="form-group">
              <label>Event Date {date && <strong>· {date}</strong>}</label>
              <AvailabilityCalendar booked={booked} value={date} onChange={setDate} />
            </div>
            <div className="form-group">
              <label>Event Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className="form-input">
                <option>Wedding</option>
                <option>Engagement</option>
                <option>Birthday Party</option>
                <option>Corporate Event</option>
                <option>Reception</option>
              </select>
            </div>
            <div className="form-group">
              <label>Expected Guests: <strong>{guestCount}</strong></label>
              <input
                type="range"
                min={10}
                max={cap}
                step={10}
                value={guestCount}
                onChange={e => setGuests(e.target.value)}
                className="range-input"
              />
              <div className="range-limits"><span>10</span><span>{cap}</span></div>
            </div>

            <div className="booking-summary">
              <div className="bs-row"><span>Venue Charge</span><span>{inr(q.price)}</span></div>
              <div className="bs-row"><span>Service Fee (5%)</span><span>{inr(q.fee)}</span></div>
              <div className="bs-row bs-total"><span>Total Estimate</span><span>{inr(q.total)}</span></div>
            </div>

            <button className="book-now-btn" onClick={handleBook}>
              {user ? "Book Now" : "Login to Book"}
            </button>
            {!user && <p className="login-hint">Please login to complete your booking</p>}
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="section similar-section">
          <div className="section-header"><h2>You might also like</h2></div>
          <div className="venues-grid">{similar.map(v => <VenueCard key={v.id} venue={v} />)}</div>
        </section>
      )}
    </div>
  );
}
