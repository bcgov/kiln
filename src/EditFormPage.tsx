import { useState, useEffect, useContext } from "react";
import "./App.css";
import Presenter from "./Presenter";
import "@carbon/styles/css/styles.css";
import { AuthenticationContext } from "./App";
import { useNavigate } from 'react-router-dom';
import { API } from "./utils/api";


const EditFormPage: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object>({});
  const keycloak = useContext(AuthenticationContext);
  const navigate = useNavigate();

  useEffect(() => {

    const queryParams = new URLSearchParams(window.location.search);
    const params: { [key: string]: string | null } = {};

    // Iterate over all query parameters and store them in the params object
    queryParams.forEach((value, key) => {
      params[key] = value;
    });

    if (params) {

      handleLoadTemplate(params);
    }


  }, []);

  const handleLoadTemplate = async (params: { [key: string]: string | null }) => {

    try {
      const loadDataEndpoint = API.loadICMData;//import.meta.env.VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL;
      console.log(loadDataEndpoint);

      const token = keycloak.token;

      const response = await fetch(loadDataEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(result);
      setJsonContent(result);

    } catch (error) {
      navigate('/unauthorized');
      console.error("Failed to generate template:", error);
    }
  };

  return <Presenter data={jsonContent} mode="edit" />;
};

export default EditFormPage;