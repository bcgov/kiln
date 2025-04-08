import "./App.css";
import NewFormPage from "./NewFormPage";
import EditFormPage from "./EditFormPage";
import ViewFormPage from "./ViewFormPage";
import PreviewFormPage from "./PreviewFormPage";
import PrintFormPage from "./PrintFormPage";
import UnauthorizedPage from "./UnauthorizedPage";
import "@carbon/styles/css/styles.css";

import React, { useState, useEffect, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { initializeKeycloak } from "./keycloak";
import { PrivateRoute } from "./PrivateRoute";

export const AuthenticationContext = createContext<any>(null);

const App: React.FC = () => {
  const [keycloak, setKeycloak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Get the current route

  // Public Routes
  const publicRoutes = ["/preview", "/unauthorized", "/printToPDF"];

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const _keycloak = await initializeKeycloak();
        setKeycloak(_keycloak);
      } catch (error) {
        console.error("Keycloak initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initialize Keycloak for protected routes
    if (!publicRoutes.includes(location.pathname)) {
      initKeycloak();
    } else {
      setLoading(false);
    }
  }, []);

  //Loading page when waiting for authentication
  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthenticationContext.Provider value={keycloak}>
      <Routes>
        {/* Public Routes */}
        <Route path="/preview" element={<PreviewFormPage />} />
        <Route path="/printToPDF" element={<PrintFormPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes */}
        <Route path="/new" element={<PrivateRoute><NewFormPage /></PrivateRoute>} />
        <Route path="/edit" element={<PrivateRoute><EditFormPage /></PrivateRoute>} />
        <Route path="/view" element={<PrivateRoute><ViewFormPage /></PrivateRoute>} />
      </Routes>
    </AuthenticationContext.Provider>
  );
};

const WrappedApp = () => (
  <Router>
    <App />
  </Router>
);

export default WrappedApp;