import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import BMV from "../assets/BMV.png"

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"
];

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { ids: favIds } = useFavorites();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [city, setCity] = useState("All India");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // The profile menu stays open until you click outside it (or pick an item / press Esc)
  useEffect(() => {
    if (!showUserMenu) return;
    const close = (e) => { if (!userMenuRef.current?.contains(e.target)) setShowUserMenu(false); };
    const esc = (e) => { if (e.key === "Escape") setShowUserMenu(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [showUserMenu]);

  // Sign in / Sign up are full-screen pages that carry their own logo
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <img  className="logo-icon" src={BMV} alt="logo" />
          <span className="logo-text">Book<span className="logo-accent">My</span>Venue</span>
        </Link>

        {/* City Selector */}
        <div className="city-selector" onClick={() => setShowCityDropdown(!showCityDropdown)}>
          <span className="city-pin">📍</span>
          <span className="city-name">{city}</span>
          <span className="city-arrow">{showCityDropdown ? "▲" : "▼"}</span>
          {showCityDropdown && (
            <div className="city-dropdown">
              <p className="dropdown-label">Select Your City</p>
              <div className="city-grid">
                {CITIES.map(c => (
                  <button
                    key={c}
                    className={`city-btn ${city === c ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setCity(c); setShowCityDropdown(false); navigate(`/venues?city=${encodeURIComponent(c)}`); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <div className="nav-links">
          <Link to="/venues" className="nav-link">Venues</Link>
          <Link to="/venues?type=wedding" className="nav-link">Weddings</Link>
          <Link to="/venues?type=corporate" className="nav-link">Corporate</Link>
          <Link to="/planner" className="nav-link">Budget Planner</Link>
        </div>

        {/* Auth Section */}
        <div className="nav-auth">
          {user && (
            <Link to="/favorites" className="fav-link" aria-label="Favourites" title="Favourites">
              ♥{favIds.length > 0 && <span className="fav-count">{favIds.length}</span>}
            </Link>
          )}
          {user ? (
            <div className="user-menu-wrap" ref={userMenuRef}>
              <button type="button" className="user-menu-btn" onClick={() => setShowUserMenu(!showUserMenu)} aria-expanded={showUserMenu}>
                <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <span className="user-name-short">{user.name?.split(" ")[0]}</span>
              </button>
              {showUserMenu && (
                <div className="user-dropdown" onClick={() => setShowUserMenu(false)}>
                  {isAdmin && <Link to="/admin" className="dropdown-item">Admin Dashboard</Link>}
                  <Link to="/bookings" className="dropdown-item">My Bookings</Link>
                  <Link to="/favorites" className="dropdown-item">Favourites</Link>
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <button className="dropdown-item logout-btn" onClick={() => { logout(); navigate("/"); }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Login</Link>
              <Link to="/register" className="btn-signup">Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/venues" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Venues</Link>
          <Link to="/venues?type=wedding" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Weddings</Link>
          <Link to="/venues?type=party" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Parties</Link>
          <Link to="/venues?type=corporate" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Corporate</Link>
          <Link to="/planner" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Budget Planner</Link>
          {user && <Link to="/bookings" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>My Bookings</Link>}
          {user && <Link to="/favorites" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Favourites</Link>}
          {isAdmin && <Link to="/admin" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Admin Dashboard</Link>}
          {user && <button className="mobile-link" onClick={() => { logout(); setMobileMenuOpen(false); navigate("/"); }}>Logout</button>}
          {!user && (
            <div className="mobile-auth">
              <Link to="/login" className="btn-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn-signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}