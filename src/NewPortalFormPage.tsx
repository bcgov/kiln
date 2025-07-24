import { useState, useEffect } from "react";
import "./App.css";
import Presenter from "./Presenter";
import "@carbon/styles/css/styles.css";
import { useNavigate } from 'react-router-dom';
import { API } from "./utils/api";
import LoadingOverlay from "./common/LoadingOverlay";


const NewPortalFormPage: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object>({});  
  const navigate = useNavigate();
  const [isNewPageLoading, setIsNewPageLoading] = useState(false);

  useEffect(() => {
    console.log("for new endpoint in useeffect");
    //
     const { search, pathname } = window.location;

    if (search) {
      const params = Object.fromEntries(new URLSearchParams(search).entries()) as Record<string,string>;
      sessionStorage.setItem("formParams", JSON.stringify(params));
      handleGenerateTemplate(params);
      window.history.replaceState({}, document.title, pathname);
    }
    else {
      const stored = sessionStorage.getItem("formParams");
      if (stored) {
        const params = JSON.parse(stored) as Record<string,string>;
        handleGenerateTemplate(params);
      }}

    //

    /*const queryParams = new URLSearchParams(window.location.search);
    const params: { [key: string]: string | null } = {};

    // Iterate over all query parameters and store them in the params object
    queryParams.forEach((value, key) => {
      params[key] = value;
    });

    if (params) {

      handleGenerateTemplate(params);
    }*/


  }, []);

  const handleGenerateTemplate = async (params: { [key: string]: string | null }) => {
    setIsNewPageLoading(true);

    try {
       console.log("for new endpoint in handleGenerateTemplate befoire");
      const generateDataEndpoint = API.generatePortalForm;
     
      console.log("for new endpoint in handleGenerateTemplate");
      const body: Record<string, any> = { ...params };

     
      const response = await fetch(generateDataEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      <Presenter data={jsonContent} mode="standalone" />
    </>
  );
};

export default NewPortalFormPage