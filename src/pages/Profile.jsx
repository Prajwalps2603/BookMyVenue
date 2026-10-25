import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useFavorites } from "../context/FavoritesContext";
import { api } from "../services/api";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { ids } = useFavorites();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy("profile");
    try {
      await updateProfile(form);
      toast("Profile updated", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy("");
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy("pw");
    try {
      await api.changePassword(pw);
      setPw({ current: "", next: "" });
      toast("Password changed", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="page-wrap narrow">
      <div className="profile-head">
        <div className="user-avatar big">{user.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="page-title">{user.name}</h1>
          <p className="muted">{user.email} · {user.role === "admin" ? "Administrator" : "Member"} · {ids.length} favourite{ids.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <form className="panel" onSubmit={saveProfile}>
        <h2>Personal details</h2>
        <div className="form-group">
          <label>Full name</label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Email (cannot be changed)</label>
          <input className="form-input" value={user.email} disabled />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={busy === "profile"}>Save changes</button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h2>Change password</h2>
        <div className="form-group">
          <label>Current password</label>
          <input type="password" className="form-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>New password (min 6 characters)</label>
          <input type="password" className="form-input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} />
        </div>
        <button className="btn-primary" disabled={busy === "pw"}>Update password</button>
      </form>
    </div>
  );
}
