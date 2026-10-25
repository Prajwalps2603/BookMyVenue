import { BrowserRouter, HashRouter } from "react-router-dom";

// GitHub Pages cannot rewrite deep links, so the static build uses #/ routes
const Router = import.meta.env.VITE_STATIC === "true" ? HashRouter : BrowserRouter;
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import "./App.css";
import "./extras.css";

export default function App() {
  return (
    <Router>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ScrollToTop />
              <div className="app">
                <Navbar />
                <main className="main-content">
                  <AppRoutes />
                </main>
                <Footer />
              </div>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
    </Router>
  );
}
