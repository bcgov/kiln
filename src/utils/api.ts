import { getApiUrl } from "./helpers";

export const API = {
  saveData: getApiUrl("/saveData", import.meta.env.VITE_COMM_API_SAVEDATA_ENDPOINT_URL),
  generate: getApiUrl("/generate", import.meta.env.VITE_COMM_API_GENERATE_ENDPOINT_URL),
  edit: getApiUrl("/edit", import.meta.env.VITE_COMM_API_EDIT_ENDPOINT_URL),
  saveICMData: getApiUrl("/saveICMData", import.meta.env.VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL),
  loadICMData: getApiUrl("/loadICMData", import.meta.env.VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL),
  unlockICMData: getApiUrl("/clearICMLockedFlag", import.meta.env.VITE_COMM_API_UNLOCK_ICM_FORM_URL),
  loadSavedJson: getApiUrl("/loadSavedJson", import.meta.env.VITE_COMM_API_LOADSAVEDJSON_ENDPOINT_URL),  
  pdfTemplate:  getApiUrl("/pdfRender", import.meta.env.VITE_COMM_API_PDFTEMPLATE_ENDPOINT_URL),
  generatePortalForm: getApiUrl("/generatePortalForm", import.meta.env.VITE_COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL),
};