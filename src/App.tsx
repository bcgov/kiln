import "./App.css";
import NewFormPage from "./NewFormPage";
import NewPortalFormPage from "./NewPortalFormPage";
import EditFormPage from "./EditFormPage";
import ViewFormPage from "./ViewFormPage";
import PreviewFormPage from "./PreviewFormPage";
import ExternalPreviewPage from "./ExternalPreviewPage";
import GenerateFormPage from "./GenerateFormPage";
import UnauthorizedPage from "./UnauthorizedPage";
import ErrorPage from "./ErrorPage";
import "@carbon/styles/css/styles.css";
import "@fontsource/noto-sans";

import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import { initializeKeycloak } from "./keycloak";
import { PrivateRoute } from "./PrivateRoute";
import { ExternalStateProvider } from './ExternalStateContext';

export const AuthenticationContext = createContext<any>(null);

const App: React.FC = () => {
  const [keycloak, setKeycloak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Get the current route

  const isPortalIntegrated = import.meta.env.VITE_IS_PORTAL_INTEGRATED === "true";
  console.log("Is PortalIntegrated",isPortalIntegrated);
  
  const isStandaloneMode = import.meta.env.VITE_STANDALONE_MODE === "true";
  // Public Routes
  const publicRoutes = [
    "/preview",
    "/unauthorized",
    "/printToPDF",
    "/error",
    ...(isPortalIntegrated ? ["/new"] : []),
  ];
  const NewFormConditionalRoute = isPortalIntegrated ? (
    <NewPortalFormPage/>
  ) :(
    <PrivateRoute>
      <NewFormPage />
    </PrivateRoute>
  ) ;
 

  useEffect(() => {
    // Skip authentication in standalone mode
    if (isStandaloneMode) {
      setLoading(false);
      return;
    }

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
      <ExternalStateProvider>

      <Routes>
        {/* Root route - redirect to preview in standalone mode, otherwise to new */}
        <Route path="/" element={<Navigate to={isStandaloneMode ? "/preview" : "/new"} replace />} />
          
        {/* Public Routes */}
        <Route path="/preview" element={<PreviewFormPage />} />
          <Route path="/preview/:id" element={<ExternalPreviewPage />} />
        <Route path="/generateForm" element={<GenerateFormPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/error" element={<ErrorPage />} />

        {/* Protected Routes - bypass PrivateRoute in standalone mode */}
        {isStandaloneMode ? (
            <>
              <Route path="/new" element={<NewFormPage />} />
              <Route path="/edit" element={<EditFormPage />} />
              <Route path="/view" element={<ViewFormPage />} />
            </>
          ) : (
            <>
              <Route path="/new" element={NewFormConditionalRoute}/>
              <Route path="/edit" element={<PrivateRoute><EditFormPage /></PrivateRoute>} />
              <Route path="/view" element={<PrivateRoute><ViewFormPage /></PrivateRoute>} />
            </>
          )}
      </Routes>
      </ExternalStateProvider>
    </AuthenticationContext.Provider>
  );
};

// const WrappedApp = () => (
//   <Router>
//     <App />
//   </Router>
// );

export default App;