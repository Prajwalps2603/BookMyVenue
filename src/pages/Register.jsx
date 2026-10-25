import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthShell, { Field, PasswordField } from "../components/AuthShell";

const PLANS = [
  { id: "wedding", icon: "💍", label: "Wedding" },
  { id: "party", icon: "🎉", label: "Party" },
  { id: "corporate", icon: "🏢", label: "Corporate" },
  { id: "birthday", icon: "🎂", label: "Birthday" },
];

const LEVELS = ["Too short", "Weak", "Okay", "Good", "Strong"];

function strength(pw) {
  if (pw.length < 6) return 0;
  let s = 1;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const level = form.password ? strength(form.password) : -1;
  const mismatch = form.confirm && form.confirm !== form.password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.phone || !form.password) { setError("All fields are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!agree) { setError("Please accept the Terms to continue."); return; }

    setLoading(true);
    try {
      const u = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast(`Welcome to BookMyVenue, ${u.name.split(" ")[0]}! 🎉`, "success");
      // no page to return to: jump straight to venues for the event they picked
      navigate(from === "/" && plan ? `/venues?type=${plan}` : from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="register" title="Create your account ✨" subtitle="Takes under a minute. No card needed.">
      {error && <div className="au-error" role="alert">⚠️ {error}</div>}

      <form onSubmit={handleSubmit} className="au-form" noValidate>
        <Field label="Full name" icon="user" value={form.name} onChange={set("name")} autoComplete="name" autoFocus />
        <div className="au-row">
          <Field label="Email address" icon="mail" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          <Field label="Phone" icon="phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </div>

        <div className="au-plan">
          <span>I'm planning a…</span>
          <div className="au-plan-row">
            {PLANS.map((p) => (
              <button type="button" key={p.id} className={plan === p.id ? "on" : ""} onClick={() => setPlan(plan === p.id ? "" : p.id)}>
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="au-row">
          <PasswordField label="Password" value={form.password} onChange={set("password")} autoComplete="new-password" />
          <PasswordField label="Confirm" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        </div>

        {(level >= 0 || form.confirm) && (
          <div className="au-meter" aria-live="polite">
            <div className="au-meter-bars">
              {[1, 2, 3, 4].map((n) => <i key={n} className={n <= level ? `on l${level}` : ""} />)}
            </div>
            <span>{level >= 0 ? LEVELS[level] : ""}</span>
            {form.confirm && <span className={`au-hint ${mismatch ? "bad" : "good"}`}>{mismatch ? "✕ No match" : "✓ Match"}</span>}
          </div>
        )}

        <label className="au-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree to the Terms of Service and Privacy Policy</span>
        </label>

        <button type="submit" className="au-submit" disabled={loading}>
          {loading ? <><span className="spinner sm" /> Creating account…</> : "Create Account →"}
        </button>
      </form>

      <p className="au-foot">
        Already a member? <Link to="/login" state={location.state}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
