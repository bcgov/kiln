import "./App.css";
import "./print.css";
import '@carbon/styles/css/styles.css';
import "./page.scss";
import React, { useState, useEffect, useRef, useContext } from "react";
import CustomModal from "./common/CustomModal"; // Import the modal component
import LoadingOverlay from "./common/LoadingOverlay"; 
import { AuthenticationContext } from "./App";
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
import { Add, Subtract } from '@carbon/icons-react';
import InputMask from "react-input-mask";
import { CurrencyInput } from "react-currency-mask";
import { API } from "./utils/api";
import {
  generateUniqueId,
  handleLinkClick,
  validateField,
  isFieldRequired,

} from "./utils/helpers"; // Import from the helpers file

/*creating the structure of object Item. 
All the form elements coming in the json will of the format type Item.
Optional attributes are denied with ?
Typescript requires the type  to be defined*/
interface Item {
  type: string;
  label?: string;
  placeholder?: string;
  id: string;
  mask?: string;
  codeContext?: { name: string };
  header?: string;
  offText?: string;
  onText?: string;
  size?: string;
  listItems?: { value: string; text: string }[];
  groupItems?: { fields: Item[] }[];
  repeater?: boolean;
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
  //saveOnSubmit?:boolean;
  //readOnly?:boolean;
  conditions?: {
    type: string;
    value: string;
  }[];
  webStyles?: {
    [key: string]: string | number;
  };

  pdfStyles?: {
    [key: string]: string | number;
  }
  containerItems?: Item[];
}

/*
creating the structure of object Template. 
Template object is the form definition part of the json.
Items will be like a subset that is used to represnt the elements or form fields in the form.
*/

interface Template {
  version: string;
  ministry_id: string;
  id: string;
  lastModified: string;
  title: string;
  readOnly?: boolean;
  form_id: string;
  data: {
    items: Item[];
  };
}

interface SavedFieldData {
  [key: string]: FieldValue | GroupFieldValueItem[]; // The key can either point to a single field value or an array of group items
}

type FieldValue = string | boolean | number | { [key: string]: any }; // The value can be of various types, including nested objects

interface GroupFieldValueItem {
  [key: string]: FieldValue; // Each group item is a map of field IDs to field values
}

interface SavedData {
  data: SavedFieldData;
  form_definition: Template;
  metadata: {};
}

type GroupState = { [key: string]: string }[]; // New type definition

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
  "container":"div",
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
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!data.form_definition) {
    return <div>Invalid Form</div>;
  }

  //Apply CSS styles to item
  const applyStyles = (item: Item): React.CSSProperties => {
    return {
      ...(isPrinting ? item.pdfStyles : item.webStyles),
      gridColumn: `span ${item.webStyles?.webColumns || 4}`,
      breakBefore: item.pdfStyles?.pageBreak as React.CSSProperties["breakBefore"] || "auto",
    };
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

  //on close, execute unlock form
  useEffect(() => {
     const handleClose = (event: BeforeUnloadEvent) => {
      if (isFormCleared.current === false)
      {
        event.preventDefault();
        unlockICMFinalFlags();
      }
     }
     window.addEventListener("beforeunload", handleClose);
     return () => window.removeEventListener("beforeunload", handleClose);
  })

  /*
  Initialization on page load
  The states need to be initialised with ids of the elements that appera on screen on loading.
  Some attributes need to be set for paging for PDF generation
  */
  useEffect(() => {
    const initialFormStates: { [key: string]: string } = {};
    const initialGroupStates: { [key: string]: GroupState } = {}; // Changed type here
  /*
    the data needed for loading the pdf version paging starts here.
  */
    const formId = formData.form_id || "Unknown Form ID";

    // Generate the creation date dynamically
    const creationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });


    // Set these values as attributes on the <body> tag
    document.documentElement.setAttribute("data-form-id", formId);
    document.documentElement.setAttribute("data-date", creationDate);     

    /*
    the data needed for loading the pdf version paging ends here.
  */

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
              groupItem.fields.forEach((field) => {
                const fieldId = generateUniqueId(item.id, groupIndex, field.id);
                field.id = fieldId;
                groupState[field.id] = "";
              });
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
  }, []);


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
      setGroupStates((prevState) => ({
        ...prevState,
        [groupId]: prevState[groupId].map((item, index) =>
          index === groupIndex ? { ...item, [fieldId]: value } : item
        ),
      }));
    } else {      
      validationError = validateField(field, value);
      setFormStates((prevState) => ({
        ...prevState,
        [fieldId]: value,
      }));
    }
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
    }
    return undefined;
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
      const group = newFormData?.data?.items? findGroup(newFormData.data.items, groupId) : undefined;

      if (group && group.groupItems) {
        const groupIndex = group.groupItems.length;

        // Create a deep copy of the first group item and modify its IDs
        const newGroupItem = JSON.parse(JSON.stringify(group.groupItems[0]));
        newGroupItem.fields.forEach((field: Item) => {
          const newFieldId = generateUniqueId(
            groupId,
            groupIndex,
            field.id.split("-").slice(2).join("-")
          );
          field.id = newFieldId;
        });
        group.groupItems.push(newGroupItem);
      }

      return newFormData;
    });

    setGroupStates((prevGroupStates) => {
      const newState = { ...prevGroupStates };
      const newGroupItemState: { [key: string]: string } = {};
      const group = formData?.data.items.find((item) => item.id === groupId);
      const groupIndex = newState[groupId]?.length || 0;
      const firstGroupItem = group?.groupItems?.[0];

      firstGroupItem?.fields.forEach((field: Item) => {
        const newFieldId = generateUniqueId(
          groupId,
          groupIndex,
          field.id.split("-").slice(2).join("-")
        );
        newGroupItemState[newFieldId] =
          initialData && initialData[newFieldId] ? initialData[newFieldId] : ""; // Use initialData if available
      });

      return {
        ...newState,
        [groupId]: [...(prevGroupStates[groupId] || []), newGroupItemState],
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
      //const group = newFormData?.data.items.find((item) => item.id === groupId);
      const group = newFormData?.data?.items? findGroup(newFormData.data.items, groupId) : undefined;

      if (group && group.groupItems){
      group?.groupItems?.splice(groupItemIndex, 1);
      // Update IDs for remaining group items
      group?.groupItems?.forEach((groupItem, newIndex) => {
        groupItem.fields.forEach((field: Item) => {
          field.id = generateUniqueId(
            groupId,
            newIndex,
            field.id.split("-").slice(2).join("-")
          );
        });
      });

    }
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
      return {
        ...newState,
        [groupId]: reindexedGroup,
      };
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

    //Hide field based on CSS "display" value
    if (item.webStyles?.display === 'none' || item.pdfStyles?.display === 'none') {
      return false;
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
        {item.label}
        {isRequired && <span className="required-asterisk"> *</span>}
      </span>
    );


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
              handleInputChange(fieldId, e.target.value, groupId, groupIndex,item)
            }
            readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}

          >
            <Component
              className="field-container no-print"
              key={fieldId}
              id={fieldId}
              labelText={label}
              placeholder={item.placeholder}
              helperText={item.helperText}
              name={fieldId}
              style={{ marginBottom: "5px" }}
              invalid={!!error}
              invalidText={error || ""}
            />
          </InputMask>
            <div className="hidden-on-screen field-wrapper-print">
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
              handleInputChange(fieldId, originalValue, groupId, groupIndex,item)
            }}
            currency="CAD"

            locale="en-CA"
            autoReset={false}
            InputElement={

              <Component
                className="field-container"
                key={fieldId}
                id={fieldId}
                labelText={label}
                placeholder={item.placeholder}
                name={fieldId}
                style={{ marginBottom: "5px" }}
                invalid={!!error}
                invalidText={error || ""}
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
              label={item.placeholder}
              items={items}
              itemToString={itemToString}
              selectedItem={selectedItem}
              onChange={({ selectedItem }: { selectedItem: any }) =>
                handleInputChange(
                  fieldId,
                  selectedItem.value,
                  groupId,
                  groupIndex,item
                )
              }
              style={{ marginBottom: "5px" }}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}

            />
            <div className="hidden-on-screen field-wrapper-print">
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
          <div style={{ marginBottom: "5px" }}>
            <Component
              className="field-container"
              key={fieldId}
              id={fieldId}
              labelText={item.label}
              checked={groupId ? groupStates[groupId]?.[groupIndex!]?.[fieldId] ?? false : formStates[fieldId] ?? false}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const isChecked = event.target.checked;
                handleInputChange(fieldId, isChecked, groupId, groupIndex,item);
              }}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
            />
          </div>
        );
      case "toggle":
        return (
          <div key={fieldId} style={{ marginBottom: "25px" }}>

            <Component
              className="field-container"
              id={fieldId}
              labelText={item.label}
              labelA={item.offText || "No"}
              labelB={item.onText || "Yes"}
              size={item.size}
              toggled={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || false
                  : formStates[fieldId] || false
              }
              onToggle={(checked: boolean) =>
                handleInputChange(fieldId, checked, groupId, groupIndex,item)
              }
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
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
                  handleInputChange(fieldId, "", groupId, groupIndex,item);
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
              style={{ marginBottom: "5px" }}
              dateFormat={dateFormat}
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}

            >
              <DatePickerInput
                id={fieldId}
                placeholder={item.placeholder}
                labelText={label}
                readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
                invalid={!!error}
                invalidText={error || ""}
                helperText={item.helperText}

              />
            </Component>
            <div className="hidden-on-screen cds--text-input-wrapper">
              <div className="cds--text-input__label-wrapper">
                <label className="cds--label" dir="auto"><span>{label}</span> </label>
              </div>
              <div className="cds--text-input__field-outer-wrapper">
                <div className="cds--text-input__field-wrapper">
                  {
                    groupId
                      ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                      : formStates[fieldId] || ""
                  }
                </div>
              </div>

              <div className="cds--form__helper-text" dir="auto">{item.helperText}</div>
            </div>
          </>
        );
      case "text-area":
        return (
          <Component
            key={fieldId}
            className="field-container"
            id={fieldId}
            labelText={label}
            placeholder={item.placeholder}
            helperText={item.helperText}
            name={fieldId}
            value={
              groupId
                ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                : formStates[fieldId] || ""
            }
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleInputChange(fieldId, e.target.value, groupId, groupIndex,item)
            }
            rows={4}
            style={{ marginBottom: "5px" }}
            readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
            invalid={!!error}
            invalidText={error || ""}
          />
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
            style={{ marginBottom: "5px" }}
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
            label={label}
            labelText={label}
            name={fieldId}
            hideSteppers="true"
            value={
              groupId
                ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || 0
                : formStates[fieldId] || 0
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(fieldId, e.target.value, groupId, groupIndex,item)
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
          />
        );
      case "text-info":
        const textInfo = item.value || "";
        return (

          <Component
            className="text-block field-container"
            key={fieldId}
            id={fieldId}
            dangerouslySetInnerHTML={{ __html: parseDynamicText(textInfo) }}
          />

        );
      case "link":
        return (
          <Component id={fieldId} href={item.value} onClick={handleLinkClick}>
            {item.label}
          </Component>
        );
      case "file":
        return (
          <div className="cds--file__container">
            <Component
              id={fieldId}
              labelTitle={item.labelText}
              labelDescription={item.labelDescription}
              buttonLabel={item.labelText}
              buttonKind="primary"
              size={item.size}
              filenameStatus={item.filenameStatus}
              accept={[".jpg", ".png"]}
              multiple={true}
              disabled={false}
              iconDescription="Delete file"
              name=""
            />
          </div>
        );
      case "table":
        return (
          <Component
            id={fieldId}
            tableTitle={item.labelText}
            initialRows={item.initialRows}
            initialColumns={item.initialColumns}
            initialHeaderNames={item.initialHeaderNames}
          />
        );
      case "radio":
        const radioOptions =
          item.listItems?.map(({ value, text }) => ({
            value: value,
            label: text,
          })) || [];
        return (
          <div key={fieldId} style={{ marginBottom: "5px" }}>
            <Component
              className="field-container"
              legendText={label}
              orientation="vertical"
              id={fieldId}
              name={fieldId}
              onChange={(value: string) =>
                handleInputChange(fieldId, value, groupId, groupIndex,item)
              }
              valueSelected={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
                  : formStates[fieldId]
              }
              readOnly={formData.readOnly || doesFieldHasCondition("readOnly", item, groupId, groupIndex) || calcValExists || mode == "view"}
              invalid={!!error}
              invalidText={error || ""}
            >
              {radioOptions.map((option, index) => (
                <RadioButton
                  key={index}
                  labelText={option.label}
                  value={option.value}
                  id={`${fieldId}-${index}`}
                />
              ))}
            </Component></div>
        );

      case "select":
        const itemsForSelect = item.listItems || [];
        return (
          <>
            <Select
              className="field-container no-print"
              id={fieldId}
              name={fieldId}
              labelText={label}
              helperText={item.helperText}
              value={
                groupId
                  ? groupStates[groupId]?.[groupIndex!]?.[fieldId]
                  : formStates[fieldId]
              }
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleInputChange(fieldId, e.target.value, groupId, groupIndex,item)
              }

              invalid={!!error}
              invalidText={error || ""}
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
            <div className="hidden-on-screen cds--text-input-wrapper">
              <div className="cds--text-input__label-wrapper">
                <label className="cds--label" dir="auto"><span>{label}</span> </label>
              </div>
              <div className="cds--text-input__field-outer-wrapper">
                <div className="cds--text-input__field-wrapper">
                  {
                    groupId
                      ? groupStates[groupId]?.[groupIndex!]?.[fieldId] || ""
                      : formStates[fieldId] || ""
                  }
                </div>
              </div>

              <div className="cds--form__helper-text" dir="auto">{item.helperText}</div>
            </div>
          </>
        );
      case "group":
        return (
          <div key={item.id} className="group-container">
            <div className="group-header">{item.label}</div>
            {item.groupItems?.map((groupItem, groupIndex) => (
              <div key={`${item.id}-${groupIndex}`} className="group-item-container">
                {item.repeater && (<div className="group-item-header">
                  {item.repeaterItemLabel || item.label}
                  {(item.repeaterItemLabel || item.label) && ` ${groupIndex + 1}`}
                  {item.groupItems && item.groupItems.length > 1 && (mode == "edit" || goBack) && formData.readOnly != true && (
                  <div className="custom-buttons-only no-print">
                  <Button
                    kind="ghost"
                    onClick={() => handleRemoveGroupItem(item.id, groupIndex)}
                    renderIcon={Subtract}
                    className="no-print"
                  >
                    Remove {item.repeaterItemLabel || item.label}
                    {(item.repeaterItemLabel || item.label) && ` ${groupIndex + 1}`}
                  </Button>
                  </div>
                )}
                </div>)}
                <div
                  className="group-fields-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "15px",
                  }}
                >
                  {groupItem.fields.map((groupField) => (
                    <div
                      key={groupField.id}
                      style={applyStyles(groupField)}
                      data-print-columns={groupField.pdfStyles?.printColumns || 4}
                    >
                      {renderComponent(groupField, item.id, groupIndex)}
                    </div>
                  ))}
                </div>                
              </div>
            ))}
            {item.repeater && (mode == "edit" || goBack) && formData.readOnly != true && (
              <div className="custom-buttons-only">
              <Button
                kind="ghost"
                onClick={() => handleAddGroupItem(item.id)}
                renderIcon={Add}
                className="no-print"
              >
                Add {item.repeaterItemLabel || item.label}
              </Button>
              </div>
            )}
          </div>
        );
        case "container":
          
          return (
            <>            
              <div key={item.id} className="common-container">
              <div className="group-header">{item.label}</div>
                  {item.containerItems?.map((containerItem) => (                 
                    <div
                      key={containerItem.id}
                      style={applyStyles(containerItem)}
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
  
    console.log("Saved Data", JSON.stringify(savedData));
    return savedData;
  };
  

  /*
  Endpoint for 'Save' and 'Save and Close'
  Called from handleSave and handleSaveandClose
  This will create a savedJson formatted json and call the end point for saving
  */
  const saveDataToICMApi = async () => {
    try {
      const saveDataICMEndpoint = API.saveICMData;//import.meta.env.VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL;
      const queryParams = new URLSearchParams(window.location.search);
      const params: { [key: string]: string | null } = {};
      const token = keycloak.token;
      queryParams.forEach((value, key) => {
        params[key] = value;
      });
      const savedJson = {
        "attachmentId": params["attachmentId"],
        "OfficeName": params["OfficeName"],
        token,
        "savedForm": JSON.stringify(createSavedData())
      };

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
        console.error("Error:", response.statusText);
        return "failed";
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
    try {
      const unlockICMFinalEdpoint = API.unlockICMData;//import.meta.env.VITE_COMM_API_UNLOCK_ICM_FORM_URL;
      const queryParams = new URLSearchParams(window.location.search);
      const params: { [key: string]: string | null } = {};
      const token = keycloak.token;
      queryParams.forEach((value, key) => {
        params[key] = value;
      });

      const response = await fetch(unlockICMFinalEdpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          token,
        }),
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
    try{
      if (validateAllFields()) {
        const returnMessage = saveDataToICMApi();
       if ((await returnMessage) === "success") {        
          setModalTitle("Success ✅");
          setModalMessage("Form Saved Successfully.");
        } else {        
          setModalTitle("Error ❌ ");
          setModalMessage("Error saving form. Please try again.");
        }
        setModalOpen(true);
      } else {      
        setModalTitle("Validation Error ❌ ");
        setModalMessage("Error saving form. Please clear the errors in the form before saving.");
        setModalOpen(true);
      }
    } catch(error) {
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
    try{
    if (validateAllFields()) {
      const returnMessage = saveDataToICMApi();
      if ((await returnMessage) === "success") {
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
        setModalMessage("Error saving form. Please try again.");
        setModalOpen(true);
      }
    } else {
      setModalTitle("Validation Error ❌");
      setModalMessage("Error saving form. Please clear the errors in the form before saving.");
      setModalOpen(true);
    }
  } catch(error) {
    setModalTitle("Error ❌");
    setModalMessage("Error saving form. Please try again.");
    setModalOpen(true);
  }
  finally{
    setIsLoading(false);
  }
  };

  /*
  function for Print button. It uses pagedJs and browser's print functionality
  for printing PDF. Sets the title of document to formId
  */

  const handlePrint = async () => {
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


  const ministryLogoPath = `${window.location.origin}/ministries/${formData.ministry_id}.png`;

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

  return (

    <div ref={pdfContainerRef} >

      <div className="header-section fixed">
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
                <Button onClick={handleSaveAndClose} kind="secondary" className="no-print">
                  Save And Close
                </Button>

              </>
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

          <div className="header-title-print hidden-on-screen" >
            {formData.title} {goBack && (<span>(Preview)</span>)}
          </div>


        </div>
      </div>
      <div className="header-form-id">{formData.form_id}</div>
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
              {formData.data.items.map((item, index) => (
                <div
                  key={item.id}
                  style={applyStyles(item)}
                  data-print-columns={item.pdfStyles?.printColumns || 4}>
                  {renderComponent(
                    item,
                    item.type === "group" ? item.id : null,
                    index
                  )}
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

export default Renderer;