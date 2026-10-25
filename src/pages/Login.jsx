import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthShell, { Field, PasswordField } from "../components/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }

    setLoading(true);
    try {
      const u = await login(email, password);
      toast(`Welcome back, ${u.name.split(" ")[0]}!`, "success");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // One-click demo account: sign in, or create it the first time
  const demoLogin = async () => {
    setError("");
    setLoading(true);
    const demo = { name: "Demo User", email: "demo@bookmyvenue.com", phone: "9999999999", password: "demo1234" };
    try {
      try {
        await login(demo.email, demo.password);
      } catch {
        await register(demo);
      }
      toast("Signed in as Demo User 🎉", "success");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="login" title="Welcome back 👋" subtitle="Demo mode: any email and password works.">
      {error && <div className="au-error" role="alert">⚠️ {error}</div>}

      <form onSubmit={handleSubmit} className="au-form" noValidate>
        <Field label="Email address" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

        <button type="submit" className="au-submit" disabled={loading}>
          {loading ? <><span className="spinner sm" /> Signing in…</> : "Sign In →"}
        </button>
      </form>

      <div className="au-or"><span>or</span></div>
      <button type="button" className="au-demo" onClick={demoLogin} disabled={loading}>
        <span>⚡</span> Continue with Demo Account
      </button>

      <p className="au-foot">
        New to BookMyVenue? <Link to="/register" state={location.state}>Create a free account</Link>
      </p>
    </AuthShell>
  );
}
