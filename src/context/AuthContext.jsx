/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getToken, setToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only show a loading state if there is a token to verify
  const [ready, setReady] = useState(() => !getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Token expired / account removed → drop the session
  useEffect(() => {
    window.addEventListener("bmv:unauthorized", logout);
    return () => window.removeEventListener("bmv:unauthorized", logout);
  }, [logout]);

  const login = async (email, password) => {
    const r = await api.login({ email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const register = async (form) => {
    const r = await api.register(form);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const updateProfile = async (patch) => {
    const r = await api.updateMe(patch);
    setUser(r.user);
    return r.user;
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateProfile, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
