export const generateUniqueId = (
    groupId: string | number,
    groupIndex: number,
    fieldId: string
  ) => `${groupId}-${groupIndex}-${fieldId}`;
  
export  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(event.currentTarget.href, "_blank", "noopener,noreferrer");
  };
  
  
export const validateField = (field: any, fieldValue: any) => {
    
    const validations = field.validation;

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

export const isFieldRequired = (validations: Array<any>): boolean => {
    return validations.some((validation) => validation.type === "required");
  };  
  
export  const doesFieldHaveSaveOnSubmitFlag = (item: any ) : boolean => { 
    
    if (!item.conditions || item.conditions.length === 0) {
      return false; // Default to visible if there are no conditions
    }

    return  item.conditions.some((condition: { type: string; value: boolean; }) => {
      if (condition.type === 'saveOnSubmit'  && condition.value !== undefined) {
        return condition.value;
      }
      return false;
    });   
} 

export  const isFieldReadOnly = (item: any ) : boolean => { 
    
  if (!item.conditions || item.conditions.length === 0) {
    return false; // Default to false if there are no conditions
  }  
  const readOnlyCondition = item.conditions.find((condition: { type: string, value:boolean}) => condition.type === 'readOnly');
  if (readOnlyCondition) {
    return readOnlyCondition.value;
  }
  return false;
} 
   