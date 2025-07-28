export interface Item {
  type: string;
  label?: string;
  placeholder?: string;
  id: string;
  class?: string;
  mask?: string;
  codeContext?: { name: string };
  header?: string;
  offText?: string;
  onText?: string;
  size?: string;
  listItems?: { value: string; text: string }[];
  groupItems?: { fields: Item[] }[];
  repeater?: boolean;
  clear_button?: boolean;
  labelText: string;
  helperText?: string;
  value?: string;
  filenameStatus?: string;
  labelDescription?: string;
  initialRows?: string;
  initialColumns?: string;
  initialHeaderNames?: string;
  repeaterItemLabel?: string;
  validation?: {
    type: string;
    value: string | number | boolean;
    errorMessage: string;
  }[];
  conditions?: {
    type: string;
    value: string;
  }[];
  webStyles?: {
    [key: string]: string | number;
  };
  pdfStyles?: {
    [key: string]: string | number;
  };
  containerItems?: Item[];
  attributes?: { [key: string]: any }; // Additional attributes components
}

export interface EndpointAction {
  type: "endpoint";
  host: string;
  path: string;
  authentication: string;
  headers: { key: string }[];
  body: { key: string }[];
  parameters: { key: string }[];
}

export interface EmailAction {
  type: "email";
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: { fileid?: string; fieldid?: string }[];
  host: string;
}

export interface JavaScriptAction {
  type: "JavaScript";
  function: string;
}

export type Action = EndpointAction | EmailAction | JavaScriptAction;

export interface InterfaceElement {
  type: "Button";
  label: string;
  style?: string;
  actions: Action[];
}

export interface Template {
  version: string;
  ministry_id: string;
  id: string;
  lastModified: string;
  title: string;
  readOnly?: boolean;
  form_id: string;
  footer: string;
  pdf_template_id?: string;
  data: {
    items: Item[];
  };
  interface?: InterfaceElement[];
}

export interface SavedFieldData {
  [key: string]: FieldValue | GroupFieldValueItem[];
}

export type FieldValue = string | boolean | number | { [key: string]: any };

export interface GroupFieldValueItem {
  [key: string]: FieldValue;
}

export interface SavedData {
  data: SavedFieldData;
  form_definition: Template;
  metadata: {};
  params?: {};
}

export type GroupState = { [key: string]: string }[];
