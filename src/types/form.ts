// Form field base interface
export interface BaseFormField {
  type?: string;
  id?: string | null;
  label?: string;
  helperText?: string;
  value?: any;
  name?: string | null;
}

export interface TextInfoField extends BaseFormField {
  type: "text-info";
  value?: string | null;
}

export interface TextInputField extends BaseFormField {
  type: "text-input";
  value?: string | null;
}

export interface TextAreaField extends BaseFormField {
  type: "text-area";
  value?: string | null;
}

export interface DropdownField extends BaseFormField {
  type: "dropdown";
  value?: string | null;
}

export interface RadioField extends BaseFormField {
  type: "radio";
  value?: string | null;
}

export interface CheckboxField extends BaseFormField {
  type: "checkbox";
  value?: string | boolean | null;
}

export interface ToggleField extends BaseFormField {
  type: "toggle";
  value?: string | boolean | null;
}

export interface DateField extends BaseFormField {
  type: "date";
  value?: string | null;
}

export interface GroupField extends BaseFormField {
  type: "group";
  groupId?: string;
  repeater?: boolean;
  codeContext?: {
    name: string;
  };
  groupItems?: Array<{
    fields: FormField[];
  }>;
}

export type FormField =
  | TextInfoField
  | TextInputField
  | TextAreaField
  | DropdownField
  | RadioField
  | CheckboxField
  | ToggleField
  | DateField
  | GroupField;

// Data source interface
export interface DataSource {
  [key: string]: any;
}

// Form definition DTO
export interface FormDefinitionDto {
  id?: string;
  version: number;
  ministry_id: number;
  form_id: string;
  title: string;
  deployed_to: string;
  lastModified: string;
  data: {
    items: FormField[];
  };
  dataSources: DataSource[];
}

// Log entry DTO
export interface LogEntryDto {
  id: number;
  log_name: string;
  description: string;
  subject_type: string;
  subject_id: number;
  event: string;
  causer_type: string;
  causer_id: number;
  properties: {
    attributes: Record<string, any>;
    old: Record<string, any>;
  };
  batch_uuid: string | null;
  created_at: string;
  updated_at: string;
}

// Form version DTO
export interface FormVersionDto {
  id: string;
  form_id: string;
  version: number;
  version_number: string;
  status: string;
}

// API response DTO
export interface ApiDataResponse {
  form_template: FormDefinitionDto;
  form_version: FormVersionDto;
  logs: Record<string, LogEntryDto>;
  data?: {
    items?: Array<{
      id?: string;
      value?: any;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface FormData {
  form_definition: FormDefinitionDto;
  form_version: FormVersionDto;
  logs: Record<string, LogEntryDto>;
  data: Record<string, string>;
  metadata: Record<string, unknown>;
}

export interface URLParams {
  id: string;
  [key: string]: string | undefined;
}

export interface ApiDataItem {
  id?: string;
  value?: any;
  [key: string]: any;
}
