import { useState, useEffect } from "react";
import "./App.css";
import Presenter from "./Presenter";
import "@carbon/styles/css/styles.css";
import { useNavigate } from 'react-router-dom';
import { API } from "./utils/api";
import LoadingOverlay from "./common/LoadingOverlay";


const ViewPortalFormPage: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object>({});  
  const navigate = useNavigate();
  const [isViewPageLoading, setIsViewPageLoading] = useState(false);

  useEffect(() => {
    console.log("for view endpoint in use effect here");
    //
     const { search, pathname } = window.location;

    if (search) {
      const params = Object.fromEntries(new URLSearchParams(search).entries()) as Record<string,string>;
      sessionStorage.setItem("formParams", JSON.stringify(params));
      handleLoadTemplate(params);
      window.history.replaceState({}, document.title, pathname);
    }
    else {
      const stored = sessionStorage.getItem("formParams");
      if (stored) {
        const params = JSON.parse(stored) as Record<string,string>;
        handleLoadTemplate(params);
      }}
  }, []);

  function getCookie(name: string): string | null {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  const handleLoadTemplate = async (params: { [key: string]: string | null }) => {
    setIsViewPageLoading(true);

    try {
      const loadDataEndpoint = API.loadPortalForm;       
      const body: Record<string, any> = { ...params };
      const originalServer = getCookie("originalServer");
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(originalServer ? { "X-Original-Server": originalServer } : {})
      };
     
      const response = await fetch(loadDataEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json(); // Parse error response        
        throw new Error(errorData.error || "Something went wrong");
      } else {
        const result = await response.json();        
        setJsonContent(result);        
      }

    } catch (error) {
      navigate("/error", { state: { message: error instanceof Error ? error.message : String(error) } }); // Pass error
      console.error("Failed to generate template:", error);
    }
    finally {
      setIsViewPageLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={isViewPageLoading} message="Please wait while the form is being loaded." />
      <Presenter data={jsonContent} mode="view" />
    </>
  );
};

export default ViewPortalFormPage