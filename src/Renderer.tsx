import "./App.css";
import "./print.css";
import '@carbon/styles/css/styles.css';
import "./page.scss";
import React, { useState, useEffect, useRef, useContext } from "react";
import { useHref } from 'react-router-dom';
import CustomModal from "./common/CustomModal"; // Import the modal component
import LoadingOverlay from "./common/LoadingOverlay";
import { AuthenticationContext } from "./App";
import { useExternalState } from "./hooks/ExternalStateHook";
import {
  TextInput,
  Dropdown,
  Checkbox,
  Toggle,
  DatePicker,
  DatePickerInput,
  Row,
  TextArea,
  Button,
  NumberInput,
  Link,
  FileUploader,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
} from "carbon-components-react";
import DynamicTable from "./DynamicTable";
import { parseISO, format as formatDate, parse } from "date-fns";
import { FlexGrid } from "@carbon/react";
import { Add, TrashCan  } from '@carbon/icons-react';
import InputMask from "react-input-mask";
import { CurrencyInput } from "react-currency-mask";
import filterInvalidDOMProps from 'filter-invalid-dom-props';
import { API } from "./utils/api";
import {
  generateUniqueId,
  handleLinkClick,
  validateField,
  isFieldRequired,

} from "./utils/helpers"; // Import from the helpers file
import {
  createFieldRegistration,
  registerAllFields as registerAllFieldsUtil,
} from "./utils/context";

/*creating the structure of object Item. 
All the form elements coming in the json will of the format type Item.
Optional attributes are denied with ?
Typescript requires the type  to be defined*/  
import { Template, GroupState,
  Item, SavedFieldData, FieldValue, SavedData,
  InterfaceElement} from "./types/template";
import ButtonRenderer from "./common/ButtonRenderer";

/*
Each type of fields should be defined in th component mapping
to map to its corresponding Carbon element to be rendered on screen
The key should match the 'type' attribute in  Item
*/
const componentMapping: { [key: string]: React.ElementType } = {
  "text-input": TextInput,
  dropdown: Dropdown,
  checkbox: Checkbox,
  toggle: Toggle,
  "date-picker": DatePicker,
  "date": DatePicker,
  "text-area": TextArea,
  button: Button,
  "number-input": NumberInput,
  "text-info": "div",
  link: Link,
  file: FileUploader,
  table: DynamicTable,
  group: FlexGrid,
  radio: RadioButtonGroup,
  select: Select,
  "currency-input": TextInput,
  "container": "div",
};

/*
The object for the props passed from other pages
*/
interface RendererProps {
  data: any,
  mode: string;
  goBack?: () => void; // Add a goBack prop
}



const Renderer: React.FC<RendererProps> = ({ data, mode, goBack }) => {
  const { store } = useExternalState();

  /*
  the states of the field ouside of the group will be saved in formStates
  the states of the group and the fields in the group will be saved in groupStates
  */
  const [formStates, setFormStates] = useState<{ [key: string]: string }>({});
  const [groupStates, setGroupStates] = useState<{ [key: string]: GroupState }>(
    {}
  );
  const [formData, setFormData] = useState<Template>(
    JSON.parse(JSON.stringify(data.form_definition))
  );
  const [formErrors, setFormErrors] = useState<{
    [key: string]: string | null;
  }>({});
  const isFormCleared = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("KILN");
  const [modalMessage, setModalMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Create Initial field registration in external store
  const createFieldRegistrationWrapper = (fieldId: string, groupId?: string, groupIndex?: number) => {
    return createFieldRegistration({
      fieldId,
      groupId,
      groupIndex,
      store,
      formData,
      groupStates,
      formStates,
      setFormErrors,
      handleInputChange,
      validateField,
    });
  };

  // Register all fields with the external store
  const registerAllFields = (items: Item[], parentGroupId?: string, parentGroupIndex?: number) => {
    registerAllFieldsUtil({
      items,
      parentGroupId,
      parentGroupIndex,
      createFieldRegistration: createFieldRegistrationWrapper,
    });
  };

  if (!data.form_definition) {
    return <div>Invalid Form</div>;
  }

  // only layout (grid‐column / pageBreak) for the wrapper
  const applyWrapperStyles = (item: Item): React.CSSProperties => ({
    gridColumn: `span ${item.webStyles?.webColumns || 4}`,
    breakBefore: item.pdfStyles?.pageBreak as React.CSSProperties["breakBefore"] || "auto",
  });

  //Hide based on Web or PDF styles
  const isHidden = (item: Item) => {
    if (!isPrinting && item.webStyles?.display === 'none') return true;
    if (isPrinting && item.pdfStyles?.display === 'none') return true;
    return false;
  };

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const keycloak = useContext(AuthenticationContext);
  const [isPrinting, setIsPrinting] = useState(false);

  //Switches between web and pdf CSS based on mode
  useEffect(() => {
    const mediaQueryList = window.matchMedia("print");

    const handlePrint = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsPrinting(true);
        document.body.offsetHeight; // Force reflow
      } else {
        setIsPrinting(false);
      }
    };

    mediaQueryList.addEventListener("change", handlePrint);
    return () => mediaQueryList.removeEventListener("change", handlePrint);
  }, []);

   //Manage style and script tags for web and pdf
  function getByType<T extends { type: string; content: string }>(arr: T[] | undefined, type: string): string | undefined {
    return arr?.find((item) => item.type === type)?.content;
  }

  const styles = data?.form_definition?.data?.styles;
  const scripts = data?.form_definition?.data?.scripts;

  const webStyleSheet = getByType(styles, 'web');
  const pdfStyleSheet = getByType(styles, 'pdf');
  const webFormScript = getByType(scripts, 'web');
  const pdfFormScript = getByType(scripts, 'pdf');

  useEffect(() => {
    const mode = isPrinting ? 'pdf' : 'web';
    const styleId = `${mode}-form-styles`;
    const scriptId = `${mode}-form-script`;

    // Remove any existing style/script tags for both modes
    ['web', 'pdf'].forEach((m) => {
      const s = document.getElementById(`${m}-form-styles`);
      if (s) s.remove();
      const sc = document.getElementById(`${m}-form-script`);
      if (sc) sc.remove();
    });

    // Add current mode's style/script if present
    const styleContent = mode === 'pdf' ? pdfStyleSheet : webStyleSheet;
    const scriptContent = mode === 'pdf' ? pdfFormScript : webFormScript;

    if (styleContent) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = styleContent;
      document.head.appendChild(style);
    }
    if (scriptContent) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.appendChild(document.createTextNode(scriptContent));
      document.head.appendChild(script);
      
      setTimeout(() => {
        try {
          const executeScript = document.createElement('script');
          executeScript.type = 'text/javascript';
          executeScript.appendChild(document.createTextNode(scriptContent));
          document.body.appendChild(executeScript);
          document.body.removeChild(executeScript);
          
          setTimeout(() => {
            store.reinitializeExternalScript();
          }, 100);
          
        } catch (error) {
          console.error('Error executing mode-specific script:', error);
        }
      }, 0);
    }

    // Cleanup on unmount
    return () => {
      const style = document.getElementById(styleId);
      if (style) style.remove();
      const script = document.getElementById(scriptId);
      if (script) script.remove();
    };
  }, [isPrinting, webStyleSheet, pdfStyleSheet, webFormScript, pdfFormScript]);

  useEffect(() => {
    if (store.getRegistrationStatus().totalFields > 0) {
      store.reinitializeExternalScript();
    }
  }, [isPrinting, store, store.getRegistrationStatus().totalFields]);
  
  const isStandaloneMode = mode === "standalone" || import.meta.env.VITE_STANDALONE_MODE === "true";

  //on close, execute unlock form
  useEffect(() => {
    if (isStandaloneMode) return;

    const handleClose = (event: BeforeUnloadEvent) => {
      if (isFormCleared.current === false) {
        event.preventDefault();
        unlockICMFinalFlags();
      }
    }
    if (mode != "standalone" && mode != "portal") {
    window.addEventListener("beforeunload", handleClose);
    return () => window.removeEventListener("beforeunload", handleClose);
    }
  }, [isStandaloneMode]);

  /*
  Initialization on page load
  The states need to be initialised with ids of the elements that appera on screen on loading.
  Some attributes need to be set for paging for PDF generation
  */
  useEffect(() => {
    store.clearRegistrations();
    // Update formData when new data is received
    setFormData(JSON.parse(JSON.stringify(data.form_definition)));
    
    const initialFormStates: { [key: string]: string } = {};
    const initialGroupStates: { [key: string]: GroupState } = {}; // Changed type here   

    /*
    recursive anonymous helper function to process the items in the form json initially.
    It will create states for the ids to be rendered.
    */

    const processItemsInitially = (items: Item[]) => {
      items.forEach((item) => {
        if (item.type === "container" && item.containerItems) {
          processItemsInitially(item.containerItems);
        }
        else if (item.type === "group") {
          initialGroupStates[item.id] =
            item.groupItems?.map((groupItem, groupIndex) => {
              const groupState: { [key: string]: string } = {};
              
              // Recursive function to process nested groups
              const processNestedFields = (fields: Item[], parentGroupId: string, parentGroupIndex: number) => {
                fields.forEach((field) => {
                  if (field.type === "group") {
                    // Generate a unique ID for the nested group
                    const nestedGroupId = generateUniqueId(parentGroupId, parentGroupIndex, field.id);
                    field.id = nestedGroupId;
                    
                    // Initialize nested group states if they don't exist
                    if (!initialGroupStates[nestedGroupId]) {
                      initialGroupStates[nestedGroupId] = [];
                    }
                    
                    // Process nested group items
                    if (field.groupItems) {
                      field.groupItems.forEach((nestedGroupItem, nestedGroupIndex) => {
                        const nestedGroupState: { [key: string]: string } = {};
                        processNestedFields(nestedGroupItem.fields, nestedGroupId, nestedGroupIndex);                       
                        // Add the nested group state
                        initialGroupStates[nestedGroupId][nestedGroupIndex] = nestedGroupState;
                      });
                    }
                  } else {
                    // Set class to the original id for all group fields
                    if (!field.class) {
                      field.class = field.id;
                    }
                    const fieldId = generateUniqueId(parentGroupId, parentGroupIndex, field.id);
                    field.id = fieldId;
                  }
              });
            };
              processNestedFields(groupItem.fields, item.id, groupIndex);
              return groupState;
            }) || [];
        } else {
          initialFormStates[item.id] = "";
        }
      });
    }

    if (formData?.data?.items) {
      processItemsInitially(formData.data.items);
    }
    setFormStates(initialFormStates);
    setGroupStates(initialGroupStates);

    /*
    After the ids are set in state , iterate through the data section (databinding) of the 
    form and set the value for the ids in state varaible if any. 
    */
    // Populate values from dataBindings
    Object.keys(data.data).forEach((key: string) => {
      const value = data.data[key];
      if (Array.isArray(value)) {
        // If the value is an array, it corresponds to a group
        if (initialGroupStates[key]) {
          value.forEach((groupItem, groupIndex) => {
            // Assign the values from dataBindings to the correct field in the group
            if (initialGroupStates[key][groupIndex]) {
              Object.keys(groupItem).forEach((fieldKey) => {
                initialGroupStates[key][groupIndex][fieldKey] =
                  groupItem[fieldKey];
              });
            } else {
              handleAddGroupItem(key, groupItem);
            }
          });
        }
      } else {
        // Non-group fields
        initialFormStates[key] = value;
      }
    });
  }, [data]);

  useEffect(() => {
    const items = formData?.data?.items;
    if (!items || Object.keys(formStates).length === 0) return;

    registerAllFields(items);

    const syncFields = (values: Record<string, any>) => {
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null && value !== "") {
          store.setState(fieldId, value);
        }
      }
    };

    // Sync all current form values to the store
    syncFields(formStates);
    for (const groupArray of Object.values(groupStates)) {
      groupArray.forEach(syncFields);
    }

    store.initializeExternalScript();
  }, [formStates, groupStates, formData]);

  /*
  The following function is used to handle if any input value is change
  It will first validate the value based on the validations on the Item that came along 
  with the form. If valid , state is updated. 
  This is triggered when any value is cahnged on the element
  */
  const handleInputChange = (
    fieldId: string,
    value: any,
    groupId: string | null = null,
    groupIndex: number | null = null,
    field: Item
  ) => {
    let validationError: string | null = null;

    if (groupId !== null && groupIndex !== null) {
      validationError = validateField(field, value);
      setGroupStates((prevState) => {
        // Ensure the group exists in state
        if (!prevState[groupId]) {
          console.warn(`Group ${groupId} not found in state, initializing...`);
          return {
            ...prevState,
            [groupId]: [{[fieldId]: value}]
          };
        }
        
        // Ensure the group index exists
        if (!prevState[groupId][groupIndex]) {
          console.warn(`Group index ${groupIndex} not found for group ${groupId}, initializing...`);
          const newGroupStates = [...prevState[groupId]];
          newGroupStates[groupIndex] = {[fieldId]: value};
          return {
            ...prevState,
            [groupId]: newGroupStates
          };
        }

        return {
        ...prevState,
        [groupId]: prevState[groupId].map((item, index) =>
          index === groupIndex ? { ...item, [fieldId]: value } : item
        ),
        };
      });
    } else {
      validationError = validateField(field, value);
      setFormStates((prevState) => ({
        ...prevState,
        [fieldId]: value,
      }));
    }
    // Update external store
    store.setState(fieldId, value);
    
    setFormErrors((prevErrors) => ({
      ...prevErrors,
      [fieldId]: validationError,
    }));
  };

  /*
  Helper function to find the group passing the groupId
  */
  const findGroup = (items: Item[], groupId: string): Item | undefined => {
    for (const item of items) {
      if (item.id === groupId && item.type === "group") {
        return item; // Found the group
      }
      if (item.type === "container" && item.containerItems) {
        const foundGroup = findGroup(item.containerItems, groupId);
        if (foundGroup) return foundGroup;
      }
      // Search within group items for nested groups
      if (item.type === "group" && item.groupItems) {
        for (const groupItem of item.groupItems) {
          const foundGroup = findGroup(groupItem.fields, groupId);
          if (foundGroup) return foundGroup;
        }
      }
    }
    return undefined;
  };

  // Find and update a nested group
  const updateNestedGroup = (items: Item[], groupId: string, updateFn: (group: Item) => void): boolean => {
    for (const item of items) {
      if (item.id === groupId && item.type === "group") {
        updateFn(item);
        return true;
      }
      if (item.type === "container" && item.containerItems) {
        if (updateNestedGroup(item.containerItems, groupId, updateFn)) {
          return true;
        }
      }
      if (item.type === "group" && item.groupItems) {
        for (const groupItem of item.groupItems) {
          if (updateNestedGroup(groupItem.fields, groupId, updateFn)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  /*
  Function called when an item is added to a group which is a repeater.
  This is called when clicking the Add button
  This will create one more set of states for the group with incresed index 
  so that the new ones will appear on the screen
  */
  const handleAddGroupItem = (
    groupId: string,
    initialData: { [key: string]: any } | null = null
  ) => {
    setFormData((prevState) => {
      const newFormData = { ...prevState };

      const updateGroup = (group: Item) => {
        if (group.groupItems) {
        const groupIndex = group.groupItems.length;

        // Create a deep copy of the first group item and modify its IDs
        const newGroupItem = JSON.parse(JSON.stringify(group.groupItems[0]));
          
          // Recursively update field IDs in the new group item
          const updateFieldIds = (fields: Item[], currentGroupId: string, currentGroupIndex: number) => {
            fields.forEach((field: Item) => {
              if (field.type === "group" && field.groupItems) {
                // For nested groups, generate a new unique ID
                const originalGroupId = field.id.includes('-') ? 
                  field.id.split("-").slice(-1)[0] : field.id;
                const nestedGroupId = generateUniqueId(currentGroupId, currentGroupIndex, originalGroupId);
                field.id = nestedGroupId;
                
                // Process nested group items
                field.groupItems.forEach((nestedGroupItem, nestedIndex) => {
                  updateFieldIds(nestedGroupItem.fields, nestedGroupId, nestedIndex);
                });
              } else {
                // Set class to the original id before mutating id
                if (!field.class) {
                  field.class = field.id;
                }
                const originalFieldId = field.class;
                field.id = generateUniqueId(currentGroupId, currentGroupIndex, originalFieldId);
              }
            });
          };

          updateFieldIds(newGroupItem.fields, groupId, groupIndex);
        group.groupItems.push(newGroupItem);
      }
      };

      updateNestedGroup(newFormData.data.items, groupId, updateGroup);
      return newFormData;
    });

    setGroupStates((prevGroupStates) => {
      const newState = { ...prevGroupStates };
      const newGroupItemState: { [key: string]: string } = {};
      const group = findGroup(formData?.data?.items || [], groupId);
      const groupIndex = newState[groupId]?.length || 0;
      const firstGroupItem = group?.groupItems?.[0];

      // Recursively create states for nested fields
      const createNestedStates = (fields: Item[], parentGroupId: string, parentGroupIndex: number) => {
        fields.forEach((field: Item) => {
          if (field.type === "group") {
            // Extract original group ID and create unique nested group ID
            const originalGroupId = field.id.includes('-') ? 
              field.id.split("-").slice(-1)[0] : field.id;
            const nestedGroupId = generateUniqueId(parentGroupId, parentGroupIndex, originalGroupId);
            
            // Initialize nested group state if it doesn't exist
            if (!newState[nestedGroupId]) {
              newState[nestedGroupId] = [];
            }
            
            // Add initial group items for nested groups
            if (field.groupItems) {
              field.groupItems.forEach((nestedGroupItem, nestedIndex) => {
                const nestedGroupState: { [key: string]: string } = {};
                createNestedStates(nestedGroupItem.fields, nestedGroupId, nestedIndex);
                
                // Ensure we don't overwrite existing nested group states
                if (!newState[nestedGroupId][nestedIndex]) {
                  newState[nestedGroupId][nestedIndex] = nestedGroupState;
                }
              });
            }
          } else {
            const newFieldId = field.id.includes('-') ? field.id : 
            generateUniqueId(parentGroupId, parentGroupIndex, field.id);
            newGroupItemState[newFieldId] = initialData && initialData[newFieldId] ? initialData[newFieldId] : "";
          }
        });
      };

      if (firstGroupItem) {
        createNestedStates(firstGroupItem.fields, groupId, groupIndex);
      }

      // Check parent group exists before adding to it
      if (!newState[groupId]) {
        newState[groupId] = [];
      }

      return {
        ...newState,
        [groupId]: [...(newState[groupId] || []), newGroupItemState],
      };
    });
  };

  /*
  Function to remove a group item from a group. Triggered on Remove button.
  This method will update the group states by removing the states of the fields 
  and the groupItem based on the index passed. Also updates the index for the rest of the groupItems
  if the removed groupItem is in between indexes
  */
  const handleRemoveGroupItem = (groupId: string, groupItemIndex: number) => {
    setFormData((prevState) => {
      const newFormData = { ...prevState };
      
      const updateGroup = (group: Item) => {
        if (group.groupItems) {
          group.groupItems.splice(groupItemIndex, 1);
          group.groupItems.forEach((groupItem, newIndex) => {
            const updateFieldIds = (fields: Item[], currentGroupId: string, currentGroupIndex: number) => {
              fields.forEach((field: Item) => {
                if (field.type === "group" && field.groupItems) {
                  field.groupItems.forEach((nestedGroupItem, nestedIndex) => {
                    updateFieldIds(nestedGroupItem.fields, field.id, nestedIndex);
                  });
                } else {
                  // Preserve the original field ID for the class if it doesn't already have one
                  if (!field.class) {
                    const originalFieldId = field.id.includes('-') ? 
                      field.id.split("-").slice(2).join("-") : field.id;
                    field.class = originalFieldId;
                  }
                  
                  field.id = generateUniqueId(currentGroupId, currentGroupIndex, field.class);
                }
          });
            };

            updateFieldIds(groupItem.fields, groupId, newIndex);
        });
        }
      };

      updateNestedGroup(newFormData.data.items, groupId, updateGroup);
      return newFormData;
    });

    setGroupStates((prevGroupStates) => {
      const newState = { ...prevGroupStates };
      const updatedGroup = newState[groupId].filter(
        (_, index) => index !== groupItemIndex
      );

      // Reindex the remaining items correctly
      const reindexedGroup = updatedGroup.map((groupItem, newIndex) => {
        const newGroupItem: { [key: string]: string } = {};
        Object.keys(groupItem).forEach((key) => {
          const newKey = generateUniqueId(
            groupId,
            newIndex,
            key.split("-").slice(2).join("-")
          );
          newGroupItem[newKey] = groupItem[key];
        });
        return newGroupItem;
      });

      const group = findGroup(formData?.data?.items || [], groupId);
      if (group?.groupItems) {
        group.groupItems[0]?.fields.forEach((field) => {
          if (field.type === "group") {
            // Remove orphaned nested group states
            if (newState[field.id] && newState[field.id].length > reindexedGroup.length) {
              newState[field.id] = newState[field.id].slice(0, reindexedGroup.length);
            }
          }
        });
      }

      return {
        ...newState,
        [groupId]: reindexedGroup,
      };
    });
  };

  /*
   Function to clear the fields in a group.Triggered on Clear button.
   This method will update the group states by removing the states of the fields 
   and any validation errors
  */
  const handleClearGroup = (groupId: string) => {
    // Clear the values in groupStates
    setGroupStates(prev => {
      const clearedGroup = prev[groupId].map(groupItem =>
        Object.fromEntries(
          Object.keys(groupItem).map(fieldId => [fieldId, ""])
        ) as { [key: string]: string }
      );
      return { ...prev, [groupId]: clearedGroup };
    });

    // Clear any validation errors on those fields
    setFormErrors(prev => {
      const next = { ...prev };
      const sampleItem = groupStates[groupId]?.[0] || {};
      Object.keys(sampleItem).forEach(fieldId => {
        next[fieldId] = null;
      });
      return next;
    });
  };

  /*
   Function to clear the fields in a container.Triggered on Clear button.
   This method will clear all the fields and and a group if its nested within the container.
   Also clear any validation errors.
 */
  const handleClearContainer = (containerId: string) => {
    const containerDef = formData.data.items.find(
      (it) => it.id === containerId && it.type === "container"
    );
    if (!containerDef || !containerDef.containerItems) {
      return;
    }
    const items = containerDef.containerItems;

    // Clear the value of the fields
    setFormStates((prev) => {
      const next = { ...prev };
      for (const ci of items) {
        if (ci.type !== "group") {
          next[ci.id] = "";
        }
      }
      return next;
    });

    // If any of those items are themselves groups, go to handleClearGroup
    for (const ci of items) {
      if (ci.type === "group") {
        handleClearGroup(ci.id);
      }
    }

    // Remove any validation errors 
    setFormErrors((prev) => {
      const next = { ...prev };
      for (const ci of items) {
        if (ci.type === "group") {
          const sample = groupStates[ci.id]?.[0] || {};
          for (const fid of Object.keys(sample)) {
            next[fid] = null;
          }
        } else {
          next[ci.id] = null;
        }
      }
      return next;
    });
  };


  /*
  Function to verify whether the state of the element should be included in savedJson or not.
  We check whether the field is visible . If not we check whether saveOnSubmit condition is 
  set to be true for the element . If the field is not visible (hidden) and if the
  saveOnSubmit condition is set to be true , it means that it need to be saved.
  */
  const shouldFieldBeIncludedForSaving = (item: Item, groupId: string | null = null,
    groupIndex: number | null = null): boolean => {

    if (isFieldVisible(item, groupId, groupIndex) || doesFieldHasCondition("saveOnSubmit", item, groupId, groupIndex)) {
      return true; // Field is not visible based on condition
    }

    return false;
  }

  const isFieldVisible = (item: Item, groupId: string | null = null,
    groupIndex: number | null = null): boolean => {

    if (!item.conditions || item.conditions.length === 0) {
      return true; // Default to visible if there are no conditions
    }

    const visibilityCondition = item.conditions.find(condition => condition.type === 'visibility');

    if (visibilityCondition) {
      try {
        // If the field is in a group, pass groupStates and groupIndex
        if (groupId !== null && groupIndex !== null) {
          const conditionFunction = new Function(
            "formStates",
            "groupStates",
            "groupId",
            "groupIndex",
            visibilityCondition.value
          );

          return conditionFunction(formStates, groupStates, groupId, groupIndex);
        } else {
          // For non-group fields, evaluate using formStates
          const conditionFunction = new Function(
            "formStates",
            "groupStates",
            visibilityCondition.value
          );
          return conditionFunction(formStates, groupStates);
        }
      } catch (error) {
        console.error("Error evaluating condition script:", error);
        return true; // Default to visible if the script fails
      }
    } else {
      return true;
    }

  }

  const executeFooter = (footer: string) => {
    const footerFunction = new Function("formStates", "groupStates", footer);
    return footerFunction(formStates, groupStates);
  }

  const executeCalculatedValueAndSetIfExists = (item: Item, groupId: string | null = null,
    groupIndex: number | null = null): boolean => {

    if (!item.conditions || item.conditions.length === 0) {
      return false; // Default to false if there are no conditions
    }

    const calculatedValCondition = item.conditions.find(condition => condition.type === 'calculatedValue');

    if (calculatedValCondition) {
      try {
        let calculatedFieldValue = "";

        const calculationFunction = new Function(
          "formStates",
          "groupStates",
          "groupId",
          "groupIndex",
          calculatedValCondition.value
        );


        calculatedFieldValue = calculationFunction(formStates, groupStates, groupId, groupIndex);

        let currentValue;

        if (groupId !== null && groupIndex !== null) {
          currentValue = groupStates[groupId]?.[groupIndex]?.[item.id];
        } else {
          currentValue = formStates[item.id];
        }
        if (calculatedFieldValue !== currentValue) {
          setFieldValue(item.id, calculatedFieldValue, groupId, groupIndex);

        }
        return true;

      } catch (error) {

        return false; // Default to false if the script fails
      }
    }


    return false;
  }

  const doesFieldHasCondition = (type: string, item: Item, groupId: string | null = null,
    groupIndex: number | null = null): boolean => {

    if (!item.conditions || item.conditions.length === 0) {
      return false; // Default to false if there are no conditions
    }
    const typeCondition = item.conditions.find((condition) => condition.type === type);
    if (typeCondition) {
      try {


        const typeConditionFunction = new Function(
          "formStates",
          "groupStates",
          "groupId",
          "groupIndex",
          typeCondition.value
        );
        return typeConditionFunction(formStates, groupStates, groupId, groupIndex);
      } catch (error) {
        return false; // Default to false if the script fails
      }
    }
    return false;
  }

  const setFieldValue = (fieldId: string,
    value: any,
    groupId: string | null = null,
    groupIndex: number | null = null) => {
    if (groupId !== null && groupIndex !== null) {
      setGroupStates((prevState) => ({
        ...prevState,
        [groupId]: prevState[groupId].map((item, index) =>
          index === groupIndex ? { ...item, [fieldId]: value } : item
        ),
      }));
    } else {
      setFormStates((prevState) => ({
        ...prevState,
        [fieldId]: value,
      }));
    }
  };

  /*
  Function which renders the elements on the webpage based on the items coming in from the json
  First this will check for thr component mapping to match the Carbon element
  Check if there is any calculated value, if so set the field to readOnly
  Check for visibility. If not visible , do not render
  Check if field is required . If yes, render asterisk for the field.
  Each switch statement has its component on screen and its equivalent rendering (mostly a div) on the PDF 
  */

  const renderComponent = (
    item: Item,
    groupId: string | null = null,
    groupIndex: number | null = null
  ) => {

    const Component = componentMapping[item.type];
    if (!Component) return null;

    const calcValExists = executeCalculatedValueAndSetIfExists(item, groupId, groupIndex);


    if (!isFieldVisible(item, groupId, groupIndex)) {
      return null; // Field is not visible based on condition
    }

    const fieldId = item.id;
    const error = formErrors[fieldId];
    const isRequired = isFieldRequired(item.validation || []);
    const label = (
      <span>
        {item.label || ""}
        {isRequired && <span className="required-asterisk"> *</span>}
      </span>
    );

    const HeadingTag = item?.attributes?.level >= 1 && item?.attributes?.level <= 6
  ? `h${item?.attributes?.level}`
  : '';

    // Get existing field registration or create new one
    let fieldMethods = store.getFieldRef(fieldId);
    if (!fieldMethods) {
      fieldMethods = createFieldRegistrationWrapper(fieldId, groupId || undefined, groupIndex || undefined);
    }

    switch (item.type) {
      case "text-input":
        return (
          <><InputMask
            className="field-container no-print"

            mask={item.mask || ''}
            value={
              groupId
                ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                : formStates[fieldId] || ""
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(fieldId, e.target.value, groupId, groupIndex, item)
            }
            readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
            {...filterInvalidDOMProps(item.attributes)}
          >
            <Component
              className="field-container no-print"
              key={fieldId}
              id={fieldId}
              labelText={item.label ? label : ""}
              placeholder={item.placeholder}
              helperText={item.helperText}
              name={fieldId}
              style={{                
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
            />
          </InputMask>
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {
                  groupId
                    ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                    : formStates[fieldId] || ""
                }
              </div>
            </div>
          </>
        );
      case "currency-input":
        return (
          <CurrencyInput
            value={
              groupId
                ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                : formStates[fieldId] || ""
            }
            /* onChangeValue={(e: React.ChangeEvent<HTMLInputElement>) =>{
              console.log("Input Value:", e.target.value);
              handleInputChange(fieldId, e.target.value.replace(/^\$/, ''), groupId, groupIndex)
            }
          } */
            onChangeValue={(event, originalValue, maskedValue) => {
              console.log(event, originalValue, maskedValue);
              handleInputChange(fieldId, originalValue, groupId, groupIndex, item)
            }}
            currency="CAD"

            locale="en-CA"
            autoReset={false}
            InputElement={

              <Component
                className="field-container"
                key={fieldId}
                id={fieldId}
                labelText={label || ""}
                placeholder={item.placeholder}
                name={fieldId}
                style={{                  
                  ...(isPrinting ? item.pdfStyles : item.webStyles),
                }}
                invalid={!!error}
                invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
              />}
          >
          </CurrencyInput>
        );
      case "dropdown":
        const items =
          item.listItems?.map(({ value, text }) => ({ value, label: text })) ||
          [];
        const itemToString = (item: any) => (item ? item.label : "");

        // Retrieve the currently selected value based on the group state or form state
        const selectedValue = groupId
          ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
          : formStates[fieldId];

        // Find the corresponding item from the list
        const selectedItem = items.find(
          (option) => option.value === selectedValue
        );

        return (
          <>
            <Component
              key={fieldId}
              id={fieldId}
              titleText={label}
              className="field-container no-print"
              label={item.placeholder || ""} // always a string
              items={items}
              itemToString={itemToString}
              selectedItem={selectedItem}
              onChange={({ selectedItem }: { selectedItem: any }) =>
                handleInputChange(
                  fieldId,
                  selectedItem.value,
                  groupId,
                  groupIndex, item
                )
              }
              style={{               
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
            />
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {
                  selectedItem?.label
                }
              </div>
            </div>

          </>
        );
      case "checkbox":
        return (

          <>
            <div style={{              
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <Component
                className="field-container no-print"
                key={fieldId}
                id={fieldId}
                labelText={item.label || ""}
                checked={!!(groupId ? groupStates[groupId]?.[groupIndex!]?.[fieldId] : formStates[fieldId])}
                // Only pass onChange if not readOnly
                {...(!(formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view") && {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    const isChecked = event.target.checked;
                    handleInputChange(fieldId, isChecked, groupId, groupIndex, item);
                  }
                })}
                readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
                invalid={!!error}
                invalidText={error || ""}
                {...filterInvalidDOMProps(item.attributes)}
              />
            </div>
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{item.label}</span></label>
              </div>

              <div className="field_value-wrapper-print" >
              {
                (groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
                  : formStates[fieldId]
                ) ? <span>☑</span> : <span>☐</span>
              }                                 
              </div>
            </div>
          </>
        );
      case "toggle":
        return (
          <div key={fieldId} style={{
            ...(isPrinting ? item.pdfStyles : item.webStyles),
          }}>

            <Component
              className="field-container"
              id={fieldId}
              labelText={item.label || ""}
              labelA={item.offText || "No"}
              labelB={item.onText || "Yes"}
              size={item.size}
              toggled={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || false
                  : formStates[fieldId] || false
              }
              onToggle={(checked: boolean) =>
                handleInputChange(fieldId, checked, groupId, groupIndex, item)
              }
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
            />
          </div>
        );
      //The date comes in json as either date or date-picker. So logic is used so that both can be used
      case "date":
      case "date-picker":
        const selectedDate = groupId
          ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
            ? parseISO(groupStates[groupId][groupIndex!][fieldId])
            : undefined
          : formStates[fieldId]
            ? parseISO(formStates[fieldId])
            : undefined;
        const dateFormat = item.mask || "Y-m-d";
        const internalDateFormat = "yyyy-MM-dd"; // Use this format to store internally
        return (
          <>
            <Component
              className="field-container no-print"
              key={fieldId}
              datePickerType="single"
              value={selectedDate ? [selectedDate] : []}
              onChange={(dates: Date[]) => {
                if (dates.length === 0) {
                  handleInputChange(fieldId, "", groupId, groupIndex, item);
                } else {
                  // Save internal format for storage
                  const internalFormattedDate = formatDate(
                    dates[0],
                    internalDateFormat
                  );
                  // Save display format for rendering
                  //const displayFormattedDate = format(dates[0], dateFormat);

                  handleInputChange(
                    fieldId,
                    internalFormattedDate,
                    groupId,
                    groupIndex,
                    item
                  );
                }
              }}
              style={{                
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              dateFormat={dateFormat}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}

            >
              <DatePickerInput
                id={fieldId}
                placeholder={item.placeholder}
                labelText={label || ""}
                readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
                invalid={!!error}
                invalidText={error || ""}
                helperText={item.helperText}

              />
            </Component>
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {
                  groupId
                    ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                    : formStates[fieldId] || ""
                }
              </div>
            </div>
          </>
        );
      case "text-area":
        return (

          <>
            <Component
              key={fieldId}
              className="field-container no-print"
              id={fieldId}
              labelText={label || ""}
              placeholder={item.placeholder}
              helperText={item.helperText}
              name={fieldId}
              value={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                  : formStates[fieldId] || ""
              }
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange(fieldId, e.target.value, groupId, groupIndex, item)
              }
              rows={4}
              style={{                
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
            />
            <div className="hidden-on-screen field-wrapper-print text-area" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {
                  groupId
                    ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                    : formStates[fieldId] || ""
                }
              </div>
            </div>
          </>
        );
      case "button":
        return (
          <Component
            key={fieldId}
            id={fieldId}
            name={fieldId}
            size="md"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              handleInputChange(
                fieldId,
                e.currentTarget.value,
                groupId,
                groupIndex,
                item
              )
            }
            style={{              
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}
            {...filterInvalidDOMProps(item.attributes)}
          >
            {item.label}
          </Component>
        );
      case "number-input":
        return (
          <Component
            helperText={item.helperText}
            key={fieldId}
            id={fieldId}
            label={label || ""}
            name={fieldId}
            hideSteppers={true}
            value={
              groupId
                ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || 0
                : formStates[fieldId] || 0
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(fieldId, e.target.value, groupId, groupIndex, item)
            }
            onClick={(e: React.MouseEvent<HTMLInputElement>) =>
              handleInputChange(
                fieldId,
                e.currentTarget.value,
                groupId,
                groupIndex,
                item
              )
            }
            invalid={!!error}
            invalidText={error || ""}
            {...filterInvalidDOMProps(item.attributes)}
          />
        );
      case "text-info":
        const textInfo = item.value || "";
        return (

          <Component
            className="text-block field-container"
            style={{...(isPrinting ? item.pdfStyles : item.webStyles),
            }}
            key={fieldId}
            id={fieldId}
            dangerouslySetInnerHTML={{ __html: parseDynamicText(textInfo) }}
            {...filterInvalidDOMProps(item.attributes)}
          />

        );
      case "link":
        return (
          <Component id={fieldId} href={item.value} onClick={handleLinkClick} {...filterInvalidDOMProps(item.attributes)}>
            {item.label}
          </Component>
        );
      case "file":
        return (
          <div className="cds--file__container">
            <Component
              id={fieldId}
              labelTitle={item.labelText || ""}
              labelDescription={item.labelDescription}
              buttonLabel={item.labelText || ""}
              buttonKind="primary"
              size={item.size}
              filenameStatus={item.filenameStatus}
              accept={[".jpg", ".png"]}
              multiple={true}
              disabled={false}
              iconDescription="Delete file"
              name=""
              {...filterInvalidDOMProps(item.attributes)}
            />
          </div>
        );
      case "table":
        return (
          <Component
            id={fieldId}
            tableTitle={item.labelText || ""}
            initialRows={item.initialRows}
            initialColumns={item.initialColumns}
            initialHeaderNames={item.initialHeaderNames}
            {...filterInvalidDOMProps(item.attributes)}
          />
        );
      case "radio":
        const radioOptions =
          item.listItems?.map(({ value, text }) => ({
            value: value,
            label: text,
          })) || [];
        const valueSelectedForRadio =
          groupId
            ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
            : formStates[fieldId];

        return (
          <>
            <div key={fieldId} style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <Component
                className="field-container  no-print"
                legendText={label}
                orientation="vertical"
                id={fieldId}
                name={fieldId}
                onChange={(value: string) =>
                  handleInputChange(fieldId, value, groupId, groupIndex, item)
                }
                valueSelected={
                  groupId
                    ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
                    : formStates[fieldId]
                }
                readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
                invalid={!!error}
                invalidText={error || ""}
                {...filterInvalidDOMProps(item.attributes)}
              >

                {radioOptions.map((option, index) => (
                  <RadioButton
                    key={index}
                    labelText={option.label || ""}
                    value={option.value}
                    id={`${fieldId}-${index}`}
                  />
                ))}
              </Component></div>
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {radioOptions.map((option) => (
                  <label key={option.value} >
                    <input
                      type="radio"
                      value={option.value}
                      checked={valueSelectedForRadio === option.value}
                      // Only pass onChange if not readOnly
                      {...(!(formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view") && {
                        onChange: () => handleInputChange(fieldId, option.value, groupId, groupIndex, item)
                      })}
                    />
                    <span >{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        );
      case "select":
        const itemsForSelect = item.listItems || [];
        // Find the currently selected value based on the group state or form state
        const selectedValueForSelect = groupId
          ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
          : formStates[fieldId];
        // Find the corresponding item from the list
        const selectedItemForSelect = itemsForSelect.find(
          (option) => option.value === selectedValueForSelect
        ) || null;
        return (
          <>
            <Select
              className="field-container no-print"
              id={fieldId}
              name={fieldId}
              labelText={label || ""}
              helperText={item.helperText}
              style={{
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              value={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
                  : formStates[fieldId]
              }
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleInputChange(fieldId, e.target.value, groupId, groupIndex, item)
              }

              invalid={!!error}
              invalidText={error || ""}
              {...filterInvalidDOMProps(item.attributes)}
            >
              <SelectItem value="" text="" />
              {itemsForSelect.map((itemForSelect) => (
                <SelectItem
                  key={itemForSelect.value}
                  value={itemForSelect.value}
                  text={itemForSelect.text}
                />
              ))}
            </Select>
            <div className="hidden-on-screen field-wrapper-print" style={{
              ...(isPrinting ? item.pdfStyles : item.webStyles),
            }}>
              <div className="field_label-wrapper-print">
                <label className="field-label-print"><span>{label}</span> </label>
              </div>

              <div className="field_value-wrapper-print">
                {
                  selectedItemForSelect?.text
                }
              </div>
            </div>
          </>
        );
      case "group":
        return (
          <div key={item.id} className="group-container" 
          {...filterInvalidDOMProps(item.attributes)}
          >
            <div className="group-header">
              {HeadingTag
              ? React.createElement(
                  HeadingTag as keyof JSX.IntrinsicElements,
                  {},
                  item.label
                )
              : <>{item.label}</>}
            </div>
            {item.groupItems?.map((groupItem, groupIndex) => (
              <div key={`${item.id}-${groupIndex}`} className="group-item-container">
                {item.repeater && (<div className="group-item-header">
                  {item.repeaterItemLabel || item.label}
                  {(item.repeaterItemLabel || item.label) && ` ${groupIndex + 1}`}
                  {item.groupItems && item.groupItems.length > 1 && (mode == "edit" || goBack || mode == "portal") && formData.readOnly != true && (
                    <div className="custom-buttons-no-bg no-print">
                      <Button
                        kind="ghost"
                        onClick={() => handleRemoveGroupItem(item.id, groupIndex)}
                        renderIcon={TrashCan}
                        className="no-print"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>)}
                {!item.repeater && (<div className="group-item-header">
                  {item.label}
                  {item.groupItems && item.groupItems.length == 1 && !item.repeater && item.clear_button && (mode == "edit" || goBack) && formData.readOnly != true && (
                    <div className="custom-buttons-no-bg no-print">
                      <Button
                        kind="ghost"
                        onClick={() => handleClearGroup(item.id)}
                        className="no-print"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>)}
                <div
                  className="group-fields-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                  }}
                >
                  {groupItem.fields.filter(groupField => !isHidden(groupField)).map((groupField) => (
                    <div
                      key={groupField.id}
                      id={groupField.id}
                      style={applyWrapperStyles(groupField)}
                      data-print-columns={groupField.pdfStyles?.printColumns || 4}
                      className={groupField.class ? groupField.class : groupField.id}
                    >
                      {renderComponent(groupField, item.id, groupIndex)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {item.repeater && (mode == "edit" || goBack || mode == "portal") && formData.readOnly != true && (
              <div className="custom-buttons-only">
                <Button
                  kind="ghost"
                  onClick={() => handleAddGroupItem(item.id)}
                  renderIcon={Add}
                  className="no-print"
                >
                  Add another
                </Button>
              </div>
            )}
          </div>
        );
      case "container":

        return (
          <>
            <div key={item.id}
              id={item.id}
              className={item?.attributes?.containerType == 'page' ? "page-container" : item?.attributes?.containerType == 'section' ? "section-container" : "common-container"}
              style={{
                ...(isPrinting ? item.pdfStyles : item.webStyles),
              }}
              {...filterInvalidDOMProps(item.attributes)}
            >
              <div className="group-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
              {HeadingTag
                  ? React.createElement(
                      HeadingTag as keyof JSX.IntrinsicElements,
                      {},
                      item.label
                    )
                  : <>{item.label}</>}
                {item.containerItems && item.clear_button && (mode == "edit" || goBack) && formData.readOnly != true && (
                  <div className="custom-buttons-no-bg no-print">
                    <Button
                      kind="ghost"
                      onClick={() => handleClearContainer(item.id)}
                      className="no-print"
                    >
                      Clear
                    </Button>
                  </div>
                )}</div>
              {item.containerItems?.filter(containerItem => !isHidden(containerItem)).map((containerItem) => (
                <div
                  key={containerItem.id}
                  style={applyWrapperStyles(containerItem)}
                  data-print-columns={containerItem.pdfStyles?.printColumns || 4}
                >
                  {renderComponent(containerItem, containerItem.type === "group" ? containerItem.id : null, null)}
                </div>
              ))}
            </div>
          </>
        );        
      default:
        return null;
    }

  };
  /*
  create savedJson data from the states of the elements
  */
  const createSavedData = () => {
    const saveFieldData: SavedFieldData = {};

    const processItems = (items: Item[]) => {
      items.forEach((item) => {

        if (item.type === "container" && shouldFieldBeIncludedForSaving(item) && item.containerItems) {
          // Recursively process container items
          processItems(item.containerItems);
        } else if (item.type !== "group" && shouldFieldBeIncludedForSaving(item)) {
          if (formStates[item.id] !== undefined) {
            saveFieldData[item.id] = formStates[item.id];
          }
        } else if (item.type === "group" && shouldFieldBeIncludedForSaving(item)) {
          const visibleGroupItems = groupStates[item.id]?.map((groupItemState, groupIndex) => {
            const filteredGroupItem: { [key: string]: FieldValue } = {};

            item.groupItems?.[groupIndex]?.fields.forEach((field) => {
              if (
                shouldFieldBeIncludedForSaving(field, item.id, groupIndex) &&
                groupItemState[field.id] !== undefined
              ) {
                filteredGroupItem[field.id] = groupItemState[field.id];
              }
            });

            return Object.keys(filteredGroupItem).length > 0 ? filteredGroupItem : null;
          });

          // Filter out any null values (groups where no fields were visible)
          const cleanedGroupItems = visibleGroupItems.filter((group) => group !== null);

          if (cleanedGroupItems.length > 0) {
            saveFieldData[item.id] = cleanedGroupItems;
          }
        }
      });
    };

    // Start processing from the root items
    if (formData?.data?.items) {
      processItems(formData.data.items);
    }

    // Update metadata
    data.metadata.updated_date = new Date().toLocaleDateString() + "";
    const savedData: SavedData = {
      data: saveFieldData,
      form_definition: data.form_definition,
      metadata: data.metadata,
    };

    return savedData;
  };

  const buildPdfPayload = () => {
    const payload: Record<string, any> = {};
  
    // recursively walk items 
    const processItems = (items: Item[]) => {
      items.forEach(item => {
        // skip anything hidden
        if (!isFieldVisible(item)) return;
  
        if (item.type === "container" && item.containerItems) {
          // dive into container
          processItems(item.containerItems);
  
        } else if (item.type === "group") {
          // only include the group itself if it's visible
          const rows = (groupStates[item.id] || [])
            .map((rowState, rowIndex) => {
              const rowPayload: Record<string, any> = {};
              item.groupItems?.[rowIndex]?.fields.forEach(f => {
                if (isFieldVisible(f, item.id, rowIndex)) {
                  rowPayload[f.id] = rowState[f.id];
                }
              });
              return rowPayload;
            })
            .filter(r => Object.keys(r).length > 0);
  
          if (rows.length) {
            payload[item.id] = rows;
          }
  
        } else {
          // simple field
          payload[item.id] = formStates[item.id];
        }
      });
    };
  
    processItems(formData.data.items);
  
    return { data: payload };
  };


  /*
  Endpoint for 'Save' and 'Save and Close'
  Called from handleSave and handleSaveandClose
  This will create a savedJson formatted json and call the end point for saving
  */
  const saveDataToICMApi = async () => {
    try {
      const saveDataICMEndpoint = API.saveICMData;
      const state = sessionStorage.getItem("formParams");
      const params = state ? (JSON.parse(state) as Record<string,string>) : {};
      const token = keycloak?.token ?? null;
      const savedJson: Record<string, any> = {
        "attachmentId": params["attachmentId"],
        "OfficeName": params["OfficeName"],
        "savedForm": JSON.stringify(createSavedData())
      };

      if (token) {
        savedJson.token = token;
      } else {
        const usernameMatch = document.cookie.match(/(?:^|;\s*)username=([^;]+)/);
        const username = usernameMatch ? decodeURIComponent(usernameMatch[1]).trim() : null;

        if (username && username.length > 0) {
          savedJson.username = username;
        }
      }

      const response = await fetch(saveDataICMEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savedJson),
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Result ", result);
        return "success";
      } else {
        const errorData = await response.json(); // Parse error response        
        //throw new Error(errorData.error || "Something went wrong");
        console.error("Error:",errorData.error);
        return errorData?.error || "Error saving form. Please try again.";
      }
    } catch (error) {
      console.error("Error:", error);
      return "failed";
    }
  };

  const saveDataToICMForGenerate = async () => {
    try {
      const saveDataICMEndpoint = API.saveICMData;
     
      const savedJson: Record<string, any> = {
        "attachmentId": data.params.attachmentId,
        "OfficeName": data.params.OfficeName,
        "username": data.params.username,
        //"username": "test",
        "savedForm": JSON.stringify(createSavedData())
      };
            
      const originalServer = new URL(data.params.apiHost).hostname;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(originalServer && { "X-Original-Server": originalServer })
      };  

      const response = await fetch(saveDataICMEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(savedJson),
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Result ", result);
        return "success";
      } else {
        const errorData = await response.json(); // Parse error response        
        //throw new Error(errorData.error || "Something went wrong");
        console.error("Error:",errorData.error);
        return errorData?.error || "Error saving form. Please try again.";
      }
    } catch (error) {
      console.error("Error:", error);
      return "failed";
    }
  };

  /*
  Function for validating all fields before saving . This function will iterate through
  all the elements and run the validation on each field calling validateField function.
  */
  const validateAllFields = (): boolean => {
    const errors: { [key: string]: string | null } = {};
    let isValid = true;

    const processItems = (items: Item[]) => {
      items.forEach((item) => {

        if (item.type === "container" && item.containerItems) {
          if (isFieldVisible(item, null, null)) {
            // Recursively process container items
            processItems(item.containerItems);
          }
        } else if (item.type === "group" && item.groupItems) {
          if (isFieldVisible(item, null, null)) { // Check if group is visible
            item.groupItems.forEach((groupItem, groupIndex) => {
              groupItem.fields.forEach((fieldInGroup) => {
                if (isFieldVisible(fieldInGroup, item.id, groupIndex)) { // Check if field in group is visible
                  const fieldIdInGroup = fieldInGroup.id;
                  const fieldValueInGroup =
                    groupStates[item.id]?.[groupIndex]?.[fieldIdInGroup];

                  const validationError = validateField(fieldInGroup, fieldValueInGroup);
                  if (validationError) {
                    errors[fieldIdInGroup] = validationError;
                    isValid = false;
                  }
                }
              });
            });
          }
        } else {
          const fieldId = item.id;
          const value = formStates[fieldId] || "";
          if (isFieldVisible(item, null, null)) { // Check if non-group field is visible
            const validationError = validateField(item, value);
            if (validationError) {
              errors[fieldId] = validationError;
              isValid = false;
            }
          }
        }
      });
    };

    // Start processing from the root items
    if (formData?.data?.items) {
      processItems(formData.data.items);
    }

    setFormErrors(errors);
    return isValid;
  };

  /*
  Call to end point for unlock flags in ICM
  */
  const unlockICMFinalFlags = async () => {
    if (isStandaloneMode) return "skipped"; // Skip in standalone mode
    try {

      const unlockICMFinalEdpoint = API.unlockICMData;
      const state = sessionStorage.getItem("formParams");
      const params = state ? (JSON.parse(state) as Record<string,string>) : {};
      const token = keycloak?.token ?? null;

      const body: Record<string, any> = { ...params };

      if (token) {
        body.token = token;
      } else {
        const usernameMatch = document.cookie.match(/(?:^|;\s*)username=([^;]+)/);
        const username = usernameMatch ? decodeURIComponent(usernameMatch[1]).trim() : null;

        if (username && username.length > 0) {
          body.username = username;
        }
      }

      const response = await fetch(unlockICMFinalEdpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Result ", result);
        return "success";
      } else {
        console.error("Error:", response.statusText);
        return "failed";
      }
    } catch (error) {
      console.error("Error:", error);
      return "failed";
    }
  };

  /*
  Function when Save is clicked
  It will validate all the fields. If no errors , proceed to  
  saveDataToICMApi for creating json and calling the end point for saving
  */
  const handleSave = async () => {
    setIsLoading(true); // Show loading overlay
    setModalOpen(false); // Ensure modal is closed when a new request starts
    try {
      if (validateAllFields()) {
        const returnMessage =await saveDataToICMApi();
        if ((returnMessage) === "success") {
          setModalTitle("Success ✅");
          setModalMessage("Form Saved Successfully.");
        } else {
          setModalTitle("Error ❌ ");
          setModalMessage(returnMessage);
        }
        setModalOpen(true);
      } else {
        setModalTitle("Validation Error ❌ ");
        setModalMessage("Error saving form. Please clear the errors in the form before saving.");
        setModalOpen(true);
      }
    } catch (error) {
      setModalTitle("Error ❌ ");
      setModalMessage("Error saving form. Please try again.");
      setModalOpen(true);
    }
    finally {
      setIsLoading(false); // Hide loading overlay once request completes
    }

  };

  /*
  Function when Save is clicked
  It will validate all the fields. If no errors , proceed to  
  saveDataToICMApi for creating json and calling the end point for saving.
  In addition , this function will close the current browser too
  */
  const handleSaveAndClose = async () => {
    setIsLoading(true); // Show loading overlay
    setModalOpen(false); // Ensure modal is closed when a new request starts
    try {
      if (validateAllFields()) {
        const returnMessage = await saveDataToICMApi();
        if ((returnMessage) === "success") {
          const unlockMessage = unlockICMFinalFlags();
          if ((await unlockMessage) == "success") {
            isFormCleared.current = true;
            window.opener = null;
            window.open("", "_self");
            window.close();
          }
          else {
            setModalTitle("Error ❌");
            setModalMessage("Error clearing locked flags. Please try again.");
            setModalOpen(true);
          }
        } else {
          setModalTitle("Error ❌");
          setModalMessage(returnMessage);
          setModalOpen(true);
        }
      } else {
        setModalTitle("Validation Error ❌");
        setModalMessage("Error saving form. Please clear the errors in the form before saving.");
        setModalOpen(true);
      }
    } catch (error) {
      setModalTitle("Error ❌");
      setModalMessage("Error saving form. Please try again.");
      setModalOpen(true);
    }
    finally {
      setIsLoading(false);
    }
  };

  /*
  function for Print button. It uses pagedJs and browser's print functionality
  for printing PDF. Sets the title of document to formId
  */

  const handlePrint = async () => {
    
    const pdfId = formData.pdf_template_id;
    const PDFTemplateEndpoint = API.pdfTemplate;

    if (pdfId) {
      try {
        const downloadUrl = `${PDFTemplateEndpoint}/${pdfId}`;
        const payload = buildPdfPayload();

        const response = await fetch(downloadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF (${response.status})`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${formData.form_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        return;
      } catch (err) {
        console.warn("PDF ‐ template download failed, falling back to HTML print:", err);
      }
    }

    try {
      const originalTitle = document.title;
      document.title = formData.form_id || 'CustomFormName';
      // Create metadata elements
      const metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      metaDescription.content = 'Form PDF.';

      const metaAuthor = document.createElement('meta');
      metaAuthor.name = 'author';
      metaAuthor.content = 'KILN';

      const metaLanguage = document.createElement('meta');
      metaLanguage.httpEquiv = 'Content-Language';
      metaLanguage.content = 'en';

      // Append metadata to the <head>
      const head = document.head;
      head.appendChild(metaDescription);
      head.appendChild(metaAuthor);
      head.appendChild(metaLanguage);

      setIsPrinting(true); // Force printing mode
      document.body.offsetHeight; // Force reflow
      const extraFooterInfo = executeFooter(formData.footer);
      const formFooter = formData?.form_id && formData?.title
        ? formData.form_id + " - " + formData.title + (extraFooterInfo ? " - " + extraFooterInfo : "")
        : "Unknown Form ID";
    
        // Set these values as attributes on the <body> tag
      document.documentElement.setAttribute("data-form-id", formFooter);
         
    /*Generate the creation date dynamically
    const creationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    // Set these values as attributes on the <body> tag
   
    document.documentElement.setAttribute("data-date", creationDate);*/
  
      setTimeout(() => {
        window.print();
      }, 150); // Ensure styles are applied before printing
      setTimeout(() => {
        setIsPrinting(false); // Reset after print
      }, 150);

      document.title = originalTitle;
      head.removeChild(metaDescription);
      head.removeChild(metaAuthor);
      head.removeChild(metaLanguage);


    } catch (error) {
      console.error("Error during print:", error);
    }
  };

  const onButtonClick =  async (buttonConfig: InterfaceElement)  => {
    // This is your parent-level logic
    console.log("Button clicked:", buttonConfig.label);
    console.log("Current form data:", buttonConfig);
    // Perhaps call the backend, show a notification, etc.
   
    setIsLoading(true); // Show loading overlay
    setModalOpen(false); // Ensure modal is closed when a new request starts
    try {
      if (validateAllFields()) {
        const returnMessage =await submitForButtonAction(buttonConfig);
        if ((returnMessage) === "success") {
          setModalTitle("Success ✅");
          setModalMessage("Form Saved Successfully.");
        } else {
          setModalTitle("Error ❌ ");
          setModalMessage(returnMessage);
        }
        setModalOpen(true);
      } else {
        setModalTitle("Validation Error ❌ ");
        setModalMessage("Error saving form. Please clear the errors in the form before saving.");
        setModalOpen(true);
      }
    } catch (error) {
      setModalTitle("Error ❌ ");
      setModalMessage("Error saving form. Please try again.");
      setModalOpen(true);
    }
    finally {
      setIsLoading(false); // Hide loading overlay once request completes
    }
  };

    const submitForButtonAction = async (buttonConfig: InterfaceElement) => {
    try {
      const submitForActionEndpoint = API.submitForButtonAction;
      const state = sessionStorage.getItem("formParams");
      const params = state ? (JSON.parse(state) as Record<string,string>) : {};
      const savedJson: Record<string, any> = {
        "tokenId": params["id"],        
        "savedForm": JSON.stringify(createSavedData()),
        "config":buttonConfig
      };      

      const response = await fetch(submitForActionEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savedJson),
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Result ", result);
        return "success";
      } else {
        const errorData = await response.json(); // Parse error response        
        //throw new Error(errorData.error || "Something went wrong");
        console.error("Error:",errorData.error);
        return errorData?.error || "Error saving form. Please try again.";
      }
    } catch (error) {
      console.error("Error:", error);
      return "failed";
    }
  };

  const ministryLogoPath = useHref(`/ministries/${formData.ministry_id}.png`);

  /*
  Function for parsing the dynamic fields' value (data binding) in text-info component
  */
  const parseDynamicText = (text: string): string => {
    const regex = /{(formStates\['(.*?)']|groupStates\['(.*?)']\?\.\[(.*?)!?\]\?\.\['(.*?)'])\|?(format:([\w/-]+))?}/g;

    return text.replace(regex, (_match, _fullMatch, fieldId, groupId, groupIndex, nestedFieldId, _formatMatch, format) => {
      let value: string | undefined;

      // Check if it's a formStates match
      if (fieldId) {
        value = formStates[fieldId];
      }
      // Check if it's a groupStates match
      else if (groupId && groupIndex && nestedFieldId) {
        value = groupStates[groupId]?.[groupIndex]?.[nestedFieldId];
      }

      // If no value is found, return the default blank line
      if (!value) return '______________________________';

      // Handle date formatting if a format is specified
      if (format && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        try {
          const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
          return formatDate(parsedDate, format);
        } catch (error) {
          console.error('Date formatting error:', error);
          return 'Invalid Date';
        }
      }

      // Return the value as is if no formatting is required
      return value;
    });
  };

  const handleGenerate = async () => {
    setIsLoading(true); // Show loading overlay
    setModalOpen(false); // Ensure modal is closed when a new request starts
    try {      
        const returnMessage =await saveDataToICMForGenerate();
        if ((returnMessage) === "success") {
          setModalTitle("Success ✅");
          setModalMessage("Form Saved Successfully.");
        } else {
          setModalTitle("Error ❌ ");
          setModalMessage(returnMessage);
        }
        setModalOpen(true);
      
    } catch (error) {
      setModalTitle("Error ❌ ");
      setModalMessage("Error saving form. Please try again.");
      setModalOpen(true);
    }
    finally {
      setIsLoading(false); // Hide loading overlay once request completes
    }

  };

  return (

    <div ref={pdfContainerRef} className="full-frame">
      <div className="fixed">
        <div className="header-section">
          <div className="header-image">
            <div className="header-image-only">

              {formData.ministry_id && (
                <img
                  src={ministryLogoPath}
                  width="232px"
                  alt="ministry logo"

                />
              )}
            </div>
            <div className="header-buttons-only no-print">
              {mode == "edit" && formData.readOnly != true && (
                <>
                  <Button onClick={handleSave} kind="secondary" className="no-print">
                    Save
                  </Button>
                  <Button onClick={handleSaveAndClose} kind="secondary" className="no-print" id="saveAndClose">
                    Save And Close
                  </Button>

                </>
              )}
              {mode == "generate" && (
                <>
                  <Button onClick={handleGenerate} kind="secondary" className="no-print" id="generate">
                    Generate
                  </Button>                  
                </>
              )}
              {(mode == "portal" || goBack)  && formData.interface && (
              <div className="header-buttons-only no-print"> 
                {formData.interface?.map((btn: any, idx: any) => (
                  <ButtonRenderer
                      key={idx}
                      config={btn}
                      onButtonClick={onButtonClick}
                      disabled={typeof goBack === 'function'}   // Now matches single-arg signature
                    />
                ))}      
              </div>
            )}
              {goBack && (
                <Button onClick={goBack} kind="secondary" className="no-print">
                  Back
                </Button>
              )}
              
              <Button kind="secondary" onClick={handlePrint} className="no-print">
                Print
              </Button>
            </div>
            <div className="form-title hidden-on-screen">
              <div className="header-form-id-print ">{formData.form_id}</div>
              <div className="header-title-print " >
                {formData.title} {goBack && (<span>(Preview)</span>)}
              </div>
            </div>


          </div>
        </div>
      </div>
      <div className="header-form-id no-print">
        <div className="form-id-section">
        {formData.form_id}
        </div>
      </div>
      <div className="scrollable-content">
        <div className="header-section">
          <div className="header-title-buttons">
            <div className="header-title-only no-print" >
            {formData.title} {goBack && (<span>(Preview)</span>)}
            </div>

          </div>
        </div>



        <div className="content-wrapper">

          <CustomModal
            title={modalTitle}
            message={modalMessage}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
          />
          {/* Loading overlay when API call is in progress */}
          <LoadingOverlay isLoading={isLoading} message="Please wait while the form is being saved." />
          <FlexGrid>
            <Row >
              {formData.data.items.filter(item => !isHidden(item)).map(item => (
                <div
                  key={item.id}
                  style={applyWrapperStyles(item)}
                  data-print-columns={item.pdfStyles?.printColumns || 4}
                >
                  {renderComponent(item)}
                </div>
              ))}
            </Row>            
          </FlexGrid>
        </div>
      </div>

      <div id="footer" style={{ display: 'none' }}>
        Form ID: Form-12345
      </div>
      <div className="paged-page" data-footer-text=""></div>
    </div >

  );
};

// Add global type declaration for external scripts
declare global {
  interface Window {
    externalFormInit?: (refsMap: { [key: string]: any }) => void;
  }
}

export default Renderer;