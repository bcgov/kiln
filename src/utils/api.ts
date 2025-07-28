import { getApiUrl } from "./helpers";

function getKlammApiBaseUrl(): string {
  const prod = import.meta.env.VITE_KLAMM_PROD_URL;
  const dev = import.meta.env.VITE_KLAMM_DEV_URL;
  const test = import.meta.env.VITE_KLAMM_TEST_URL;
  const defaultUrl = import.meta.env.VITE_KLAMM_URL || "";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (dev && host.endsWith(new URL(dev).hostname)) return dev;
    if (test && host.endsWith(new URL(test).hostname)) return test;
    if (prod && host === new URL(prod).hostname) return prod;
  }
  return defaultUrl;
}


export const API = {
  saveData: getApiUrl("/saveData", import.meta.env.VITE_COMM_API_SAVEDATA_ENDPOINT_URL),
  generate: getApiUrl("/generate", import.meta.env.VITE_COMM_API_GENERATE_ENDPOINT_URL),
  edit: getApiUrl("/edit", import.meta.env.VITE_COMM_API_EDIT_ENDPOINT_URL),
  saveICMData: getApiUrl("/saveICMData", import.meta.env.VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL),
  loadICMData: getApiUrl("/loadICMData", import.meta.env.VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL),
  unlockICMData: getApiUrl("/clearICMLockedFlag", import.meta.env.VITE_COMM_API_UNLOCK_ICM_FORM_URL),
  loadSavedJson: getApiUrl("/loadSavedJson", import.meta.env.VITE_COMM_API_LOADSAVEDJSON_ENDPOINT_URL),  
  pdfTemplate:  getApiUrl("/pdfRender", import.meta.env.VITE_COMM_API_PDFTEMPLATE_ENDPOINT_URL),
  getFormById: `${getKlammApiBaseUrl()}/api/form-versions/`,
  getFormKlammURL: `${getKlammApiBaseUrl()}/forms/form-versions/`,
  generatePortalForm: getApiUrl("/generatePortalForm", import.meta.env.VITE_COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL),
  generateStandalone: getApiUrl("/generateStandalone", import.meta.env.VITE_COMM_API_GENERATE_STANDALONE_ENDPOINT_URL),  
  submitForButtonAction: getApiUrl("/submitForPortalAction", import.meta.env.VITE_COMM_API_SUBMIT_TO_ACTION_ENDPOINT_URL),
};