/*
Construct unique id for an element in a group
*/
export const generateUniqueId = (
    groupId: string | number,
    groupIndex: number,
    fieldId: string
  ) => `${groupId}-${groupIndex}-${fieldId}`;
  
export  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(event.currentTarget.href, "_blank", "noopener,noreferrer");
  };
  
  
/*
validate passed field iterating through the validation array in the item
*/
export const validateField = (field: any, fieldValue: any) => {    
    const validations = field?.validation;
    if (validations) {
      for (const validation of validations) {
        switch (validation.type) {
          case "required":
            if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
              return validation.errorMessage || `${field.label} is required.`;
            }
            break;
          case "pattern":
            if (fieldValue !== null && fieldValue.trim()!==""){
              const regex = new RegExp(validation.value);
              if (!regex.test(fieldValue)) {
                return (
                  validation.errorMessage ||
                  `${field.label} is of invalid format.`
                );
              }
            }
            break;
          // Add more validation types as needed
          case "minLength":
            if (fieldValue !== null && fieldValue.trim()!==""){              
              if (fieldValue.length < validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} must be at least ${validation.value} characters.`
                );
              }
            }
            break;
          case "maxLength":
            if (fieldValue !== null && fieldValue.trim()!==""){
              if (fieldValue.length > validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} must be at most ${validation.value} characters.`
                );
              }
            }
            break;
          case "minDate":
            if (fieldValue !== null && fieldValue.trim()!==""){
              if (validation.value && fieldValue < validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} should not be earlier than ${validation.value}`
                );
              }
            }
            break;
          case "maxDate":
            if (fieldValue !== null && fieldValue.trim()!==""){
              if (validation.value && fieldValue > validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} should not be later than ${validation.value}`
                );
              }
            }
            break;
          case "minValue":
            if (fieldValue !== null ){
              if (validation.value && fieldValue < validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} should not be less than ${validation.value}`
                );
              }
            }
            break;
          case "maxValue":
            if (fieldValue !== null){
              if (validation.value && fieldValue > validation.value) {
                return (
                  validation.errorMessage ||
                  `${field.label} should not be greater than ${validation.value}`
                );
              }
            }
            break;
        case "javascript":
            if (fieldValue !== null && fieldValue.trim()!==""){
              try {
                  // Dynamically execute JavaScript validation
                  const validateFunction = new Function('value', validation.value);
                  const isValid = validateFunction(fieldValue);
                  if (!isValid) {
                      return validation.errorMessage || `${field.label} is invalid.`;
                  }
              } catch (error) {
                  console.error('Error executing custom validation:', error);
                  return 'Invalid custom validation script.';
              }
            }
            break; 
           
          default:
            break;
        }
      }
      return "";
    }
    return "";   
  };

  /*
  Check to see if validation 'required' is set
  */
export const isFieldRequired = (validations: Array<any>): boolean => {
    return validations.some((validation) => validation.type === "required");
  };  
  
export function getApiUrl(path: string, envVar?: string): string {
    const isDev = import.meta.env.DEV;
    if (isDev && envVar) {
      return envVar;
    }

    const match = window.location.pathname.match(/^\/(formfoundry-[^/]+|form)(?:\/|$)/);
    const prefix = match ? `/${match[1]}` : "";
  
    // ensure path starts with a slash
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
  

    return `${prefix}/api${cleanPath}`;
}


   