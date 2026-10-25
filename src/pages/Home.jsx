import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import VenueCard from "../components/VenueCard";
import { eventCategories } from "../services/Data";
import { useVenues, getRecent } from "../hooks/useVenues";
import { SkeletonCards, ErrorBox } from "../components/VenueGrid";

// Counts up from 0 when it first renders
function Counter({ to, suffix = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!to) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / 1200, 1);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}{suffix}</>;
}

const testimonials = [
  { name: "Priya & Arjun", event: "Wedding", text: "BookMyVenue made our dream wedding a reality! Found the perfect garden venue in just 2 days.", avatar: "P" },
  { name: "Rahul Sharma", event: "Corporate Event", text: "Booked a great convention center for our product launch. Seamless experience from search to confirmation.", avatar: "R" },
  { name: "Sneha Patel", event: "Birthday Party", text: "The rooftop venue for my 30th birthday was absolutely stunning. Got exactly what we wanted!", avatar: "S" },
];

function CategoryRow({ category, venues }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const catVenues = venues.filter(v => v.type.toLowerCase() === category.id.toLowerCase());
  const displayVenues = catVenues.slice(0, 6);
  const hasMore = catVenues.length > 6;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
    }
  };

  if (catVenues.length === 0) return null;

  return (
    <div className="cat-row">
      <div className="cat-row-header">
        <div className="cat-row-title">
          <div>
            <h2>{category.label} Venues</h2>
            <p>{catVenues.length} venues across India</p>
          </div>
        </div>
        <div className="cat-row-actions">
          <div className="scroll-btns">
            <button className="scroll-btn" onClick={() => scroll(-1)}>‹</button>
            <button className="scroll-btn" onClick={() => scroll(1)}>›</button>
          </div>
          <button
            className="view-all-btn"
            onClick={() => navigate(`/venues?type=${category.id}`)}
          >
            View All {category.label} →
          </button>
        </div>
      </div>

      <div className="cat-scroll-wrap">
        <div className="cat-scroll-track" ref={scrollRef}>
          {displayVenues.map(v => (
            <div className="cat-scroll-item" key={v.id}>
              <VenueCard venue={v} />
            </div>
          ))}
          {hasMore && (
            <div className="cat-scroll-item">
              <div
                className="view-more-card"
                onClick={() => navigate(`/venues?type=${category.id}`)}
              >
                <span className="view-more-text">More {category.label} Venues</span>
                <span className="view-more-arrow">→</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { venues, loading, error, reload } = useVenues();
  const recent = getRecent().map(id => venues.find(v => v.id === id)).filter(Boolean).slice(0, 4);
  const topRated = [...venues].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 4);
  const cities = new Set(venues.map(v => v.city)).size;
  const avg = venues.length ? venues.reduce((s, v) => s + v.rating, 0) / venues.length : 0;

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg"><div className="hero-overlay" /></div>
        <div className="hero-content">
          <div className="hero-badge">🎉 India's #1 Venue Booking Platform</div>
          <h1 className="hero-title">
            Find Your Perfect<br />
            <span className="hero-highlight">Celebration Venue</span>
          </h1>
          <p className="hero-subtitle">
            Discover and book stunning venues for weddings, parties, corporate events & more.<br />
            {venues.length > 0 ? `${venues.length} verified venues across ${cities} cities.` : "Verified venues across India."}
          </p>
          <SearchBar large />
          <div className="hero-stats">
            <div className="stat"><span className="stat-num"><Counter to={venues.length} /></span><span className="stat-label">Venues</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num"><Counter to={cities} /></span><span className="stat-label">Cities</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num"><Counter to={eventCategories.length} /></span><span className="stat-label">Event Types</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">{avg ? avg.toFixed(1) : "–"}★</span><span className="stat-label">Avg Rating</span></div>
          </div>
        </div>
      </section>

      {/* Quick Category Pills */}
      <section className="quick-cats">
        <div className="quick-cats-inner">
          {eventCategories.map(cat => (
            <button
              key={cat.id}
              className="quick-cat-pill"
              onClick={() => navigate(`/venues?type=${cat.id}`)}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {loading && <div className="section"><SkeletonCards n={3} /></div>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {recent.length > 0 && (
        <section className="section mini-section">
          <div className="section-header"><h2>Recently Viewed</h2><p>Pick up where you left off</p></div>
          <div className="venues-grid">{recent.map(v => <VenueCard key={v.id} venue={v} />)}</div>
        </section>
      )}

      {topRated.length > 0 && (
        <section className="section mini-section">
          <div className="section-header"><h2>🏆 Top Rated</h2><p>Loved by our customers</p></div>
          <div className="venues-grid">{topRated.map(v => <VenueCard key={v.id} venue={v} />)}</div>
        </section>
      )}

      {/* Category Rows */}
      <div className="all-cat-rows">
        {eventCategories.map(cat => (
          <CategoryRow key={cat.id} category={cat} venues={venues} />
        ))}
      </div>

      {/* Why BookMyVenue */}
      <section className="section why-section">
        <div className="section-header">
          <h2>Why BookMyVenue?</h2>
          <p>Everything you need for a perfect celebration</p>
        </div>
        <div className="features-grid">
          {[
            { icon: "🔍", title: "Easy Discovery", desc: "Filter by location, capacity, price and more to find your ideal venue in minutes." },
            { icon: "✅", title: "Verified Venues", desc: "Every venue is personally verified by our team. No surprises on your big day." },
            { icon: "💰", title: "Best Prices", desc: "Direct bookings mean no middleman markups. Get the best price guaranteed." },
            { icon: "🛡️", title: "Secure Booking", desc: "Safe payment gateway with instant confirmation and booking protection." },
            { icon: "📞", title: "24/7 Support", desc: "Dedicated support team to assist you at every step of your journey." },
            { icon: "⭐", title: "Trusted Reviews", desc: "Real reviews from real customers to help you make informed decisions." },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="section-header">
          <h2>Happy Celebrations</h2>
          <p>What our customers say</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map(t => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-quote">"</div>
              <p className="testimonial-text">{t.text}</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div>
                  <p className="testimonial-name">{t.name}</p>
                  <p className="testimonial-event">{t.event}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Own a Venue? List It Free!</h2>
          <p>Reach thousands of customers looking for the perfect event space.</p>
          <button className="cta-btn" onClick={() => navigate("/register")}>List Your Venue →</button>
        </div>
      </section>
    </div>
  );
}