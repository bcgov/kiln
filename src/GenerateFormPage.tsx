import { useState, useEffect } from "react";
import "./App.css";
import Presenter from "./Presenter";
import "@carbon/styles/css/styles.css";
import { API } from "./utils/api";

const PrintFormPage: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object>({});


  useEffect(() => {

    const { search, pathname } = window.location;

    if (search) {
      const params = Object.fromEntries(new URLSearchParams(search).entries()) as Record<string,string>;
      sessionStorage.setItem("formParams", JSON.stringify(params));
      handleLoadSavedJson(params);
      window.history.replaceState({}, document.title, pathname);
    }
    else {
      const stored = sessionStorage.getItem("formParams");
      if (stored) {
        const params = JSON.parse(stored) as Record<string,string>;
        handleLoadSavedJson(params);
      }}

  }, []);

  const handleLoadSavedJson = async (params: { [key: string]: string | null }) => {

    try {

      const loadSavedJsonEndpoint = API.loadSavedJson;

      const response = await fetch(loadSavedJsonEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params

        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      setJsonContent(result);

    } catch (error) {
      console.error("Failed to generate template:", error);
    }
  };

  return <Presenter data={jsonContent} mode="generate" />;
};

export default PrintFormPage;