/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const FavoritesContext = createContext({ ids: [], has: () => false, toggle: () => {} });

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loaded, setLoaded] = useState({ userId: null, ids: [] });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.favorites().then((ids) => !cancelled && setLoaded({ userId: user.id, ids })).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // ignore ids that belong to a previous session
  const ids = user && loaded.userId === user.id ? loaded.ids : [];

  const toggle = async (venueId) => {
    if (!user) {
      toast("Log in to save favourites", "info");
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    const was = ids.includes(venueId);
    // optimistic update, roll back on failure
    setLoaded({ userId: user.id, ids: was ? ids.filter((x) => x !== venueId) : [...ids, venueId] });
    try {
      const next = await api.toggleFavorite(venueId);
      setLoaded({ userId: user.id, ids: next });
      toast(was ? "Removed from favourites" : "Saved to favourites ❤️", "success");
    } catch (e) {
      setLoaded({ userId: user.id, ids });
      toast(e.message, "error");
    }
  };

  return (
    <FavoritesContext.Provider value={{ ids, has: (id) => ids.includes(id), toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
