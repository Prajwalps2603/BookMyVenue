import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BMV from "../assets/BMV.png";
import "../auth.css";

const u = (id) => `https://images.unsplash.com/photo-${id}?w=700&q=75`;

// Three columns of venue photos that scroll forever (middle one in reverse)
const WALL = [
  [
    { src: u("1519167758481-83f550bb49b3"), label: "Grand wedding hall", city: "Bengaluru", h: 270 },
    { src: u("1465495976277-4387d4b0b4c6"), label: "Sea-view terrace", city: "Mumbai", h: 200 },
    { src: u("1510076857177-7470076d4098"), label: "Heritage banquet", city: "Delhi", h: 250 },
  ],
  [
    { src: u("1530103862676-de8c9debad1d"), label: "Rooftop party", city: "Mumbai", h: 210 },
    { src: u("1464366400600-7168b8af9bc3"), label: "Garden villa", city: "Bengaluru", h: 290 },
    { src: u("1547153760-18fc86324498"), label: "Club night", city: "Bengaluru", h: 220 },
  ],
  [
    { src: u("1587825140708-dfaf72ae4b04"), label: "Convention centre", city: "Hyderabad", h: 240 },
    { src: u("1500534314209-a25ddb2bd429"), label: "Sunset farmhouse", city: "Jaipur", h: 260 },
    { src: u("1558618666-fcd25c85cd64"), label: "Birthday studio", city: "Mumbai", h: 200 },
  ],
];

const QUOTES = [
  { text: "Found our dream wedding hall in two days. Booking was effortless.", who: "Priya & Arjun", tag: "💍 Wedding" },
  { text: "Perfect venue for our product launch. Confirmed in minutes.", who: "Rahul S.", tag: "🏢 Corporate" },
  { text: "The rooftop for my 30th was unreal. Everyone asked where I booked it.", who: "Sneha P.", tag: "🎂 Birthday" },
];

const ICONS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Wall() {
  return (
    <div className="au-wall" aria-hidden="true">
      {WALL.map((col, ci) => (
        <div key={ci} className={`au-col au-col-${ci}`}>
          <div className="au-track">
            {[...col, ...col].map((p, i) => (
              <figure key={i} className="au-tile" style={{ height: p.h }}>
                <img src={p.src} alt="" loading="lazy" />
                <figcaption><strong>{p.label}</strong><span>{p.city}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuthShell({ mode, title, subtitle, children }) {
  const [q, setQ] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQ((n) => (n + 1) % QUOTES.length), 4500);
    return () => clearInterval(t);
  }, []);
  const quote = QUOTES[q];

  return (
    <div className="au-page">
      {/* ───────── Left: moving photo wall + story ───────── */}
      <aside className="au-visual">
        <Wall />
        <div className="au-visual-shade" />
        <div className="au-visual-inner">
          <div className="au-chip"><i /> 36 venues · 7 cities · live now</div>
          <h2>
            {mode === "login" ? <>Where every <em>celebration</em> begins.</> : <>Plan it. Book it. <em>Celebrate</em> it.</>}
          </h2>
          <div className="au-perks">
            <span>✅ Verified venues</span>
            <span>🔒 Date-locked booking</span>
            <span>↩️ Easy refunds</span>
          </div>
          <div className="au-quote" key={q}>
            <p>“{quote.text}”</p>
            <div><strong>{quote.who}</strong><span>{quote.tag}</span></div>
          </div>
          <div className="au-dots">
            {QUOTES.map((_, i) => <i key={i} className={i === q ? "on" : ""} />)}
          </div>
        </div>
      </aside>

      {/* ───────── Right: form card ───────── */}
      <section className="au-form-side">
        <span className="au-blob au-blob-1" aria-hidden="true" />
        <span className="au-blob au-blob-2" aria-hidden="true" />
        <div className="au-card">
          <Link to="/" className="au-brand" aria-label="BookMyVenue home">
            <img src={BMV} alt="" />
            <span>Book<b>My</b>Venue</span>
          </Link>

          <div className="au-switch" role="tablist">
            <Link to="/login" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""}>Sign In</Link>
            <Link to="/register" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "on" : ""}>Sign Up</Link>
            <span className="au-switch-pill" style={{ transform: `translateX(${mode === "login" ? 0 : 100}%)` }} />
          </div>

          <h1>{title}</h1>
          <p className="au-sub">{subtitle}</p>
          {children}
        </div>
        <Link to="/" className="au-home">← Back to home</Link>
      </section>
    </div>
  );
}

// Floating-label input; `icon` is an icon name, `right` an optional element (e.g. the eye button)
export function Field({ label, icon, right, ...props }) {
  return (
    <div className="au-field">
      <span className="au-field-icon"><Icon name={icon} /></span>
      <input placeholder=" " {...props} />
      <label>{label}</label>
      {right}
    </div>
  );
}

export function PasswordField({ label = "Password", value, onChange, autoComplete, minLength, children }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Field
        label={label}
        icon="lock"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        right={
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        }
      />
      {children}
    </>
  );
}
