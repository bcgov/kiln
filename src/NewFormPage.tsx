import { useState, useEffect, useContext } from "react";
import "./App.css";
import Presenter from "./Presenter";
import "@carbon/styles/css/styles.css";
import { AuthenticationContext } from "./App";
import { useNavigate } from 'react-router-dom';
import { API } from "./utils/api";
import LoadingOverlay from "./common/LoadingOverlay";

const NewFormPage: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object>({});
  const keycloak = useContext(AuthenticationContext);
  const navigate = useNavigate();
  const [isNewPageLoading, setIsNewPageLoading] = useState(false);

  useEffect(() => {

    const { search, pathname } = window.location;

    if (search) {
      const params = Object.fromEntries(new URLSearchParams(search).entries()) as Record<string, string>;
      sessionStorage.setItem("formParams", JSON.stringify(params));
      handleGenerateTemplate(params);
      window.history.replaceState({}, document.title, pathname);
    }
    else {
      const stored = sessionStorage.getItem("formParams");
      if (stored) {
        const params = JSON.parse(stored) as Record<string, string>;
        handleGenerateTemplate(params);
      }
    }


  }, []);

  function getCookie(name: string): string | null {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  const handleGenerateTemplate = async (params: { [key: string]: string | null }) => {
    setIsNewPageLoading(true);

    try {
      const generateDataEndpoint = API.generate;

      const token = keycloak?.token ?? null;

      const body: Record<string, any> = { ...params };

      if (token) {
        body.token = token;
      } else {
        const username = getCookie("username");
        if (username) {
          body.username = username.trim();
        }
      }

      const originalServer = getCookie("originalServer");
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(originalServer ? { "X-Original-Server": originalServer } : {})
      };

      const response = await fetch(generateDataEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Parse error response        
        throw new Error(errorData.error || "Something went wrong");
      } else {
        const result = await response.json();
        setJsonContent(result.save_data);
      }

    } catch (error) {
      navigate("/error", { state: { message: error instanceof Error ? error.message : String(error) } }); // Pass error
      console.error("Failed to generate template:", error);
    }
    finally {
      setIsNewPageLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={isNewPageLoading} message="Please wait while the form is being loaded." />
      <Presenter data={jsonContent} mode="edit" />
    </>
  );
};

export default NewFormPage;