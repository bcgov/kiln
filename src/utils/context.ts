/*
 * Provide context for field registration and management
 * This file contains functions to create and manage field registrations
 * in the external state store.
 * It includes methods for setting and getting field values, errors, and validation.
 * This enables the external injection of state management for form fields.
 */

// Create field registration
export function createFieldRegistration({
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
}: {
  fieldId: string;
  groupId?: string;
  groupIndex?: number;
  store: any;
  formData: any;
  groupStates: { [key: string]: any[] };
  formStates: { [key: string]: any };
  setFormErrors: (fn: (prev: any) => any) => void;
  handleInputChange: (
    fieldId: string,
    value: any,
    groupId: string | null,
    groupIndex: number | null,
    field: any
  ) => void;
  validateField: (field: any, value: any) => string | null;
}) {
  const existingRegistration = store.getFieldRef(fieldId);
  if (existingRegistration) {
    return existingRegistration;
  }

  const field = findFieldById(fieldId, formData);
  const fieldInfo = parseFieldId(fieldId, groupStates);

  const methods = {
    setValue: (value: any) => {
      const currentValue =
        groupId !== undefined && groupIndex !== undefined
          ? groupStates[groupId]?.[groupIndex]?.[fieldId]
          : formStates[fieldId];

      if (currentValue === value) {
        return;
      }

      handleInputChange(
        fieldId,
        value,
        groupId || null,
        groupIndex || null,
        field || {}
      );
    },

    getValue: () => {
      let value;
      if (groupId !== undefined && groupIndex !== undefined) {
        value = groupStates[groupId]?.[groupIndex]?.[fieldId];
      } else if (
        fieldInfo.isGroupField &&
        fieldInfo.groupId &&
        fieldInfo.groupIndex !== null
      ) {
        value =
          groupStates[fieldInfo.groupId]?.[fieldInfo.groupIndex]?.[fieldId];
      } else {
        value = formStates[fieldId];
      }
      return value || "";
    },

    setError: (error: string | null) => {
      setFormErrors((prev: any) => ({ ...prev, [fieldId]: error }));
    },

    getError: () => formStates[fieldId],

    validate: (value?: any) => {
      if (field) {
        const valueToValidate =
          value !== undefined
            ? value
            : groupId !== undefined && groupIndex !== undefined
            ? groupStates[groupId]?.[groupIndex]?.[fieldId]
            : formStates[fieldId];
        return validateField(field, valueToValidate);
      }
      return null;
    },

    fieldType: field?.type || "unknown",
    isGroupField: fieldInfo.isGroupField,
    groupId: fieldInfo.groupId,
    groupIndex: fieldInfo.groupIndex,
  };

  store.registerField(fieldId, methods);
  return methods;
}

// Register all fields
export function registerAllFields({
  items,
  parentGroupId,
  parentGroupIndex,
  createFieldRegistration,
}: {
  items: any[];
  parentGroupId?: string;
  parentGroupIndex?: number;
  createFieldRegistration: (
    fieldId: string,
    parentGroupId?: string,
    parentGroupIndex?: number
  ) => void;
}) {
  items.forEach((item) => {
    if (item.type === "container" && item.containerItems) {
      registerAllFields({
        items: item.containerItems,
        parentGroupId,
        parentGroupIndex,
        createFieldRegistration,
      });
    } else if (item.type === "group" && item.groupItems) {
      item.groupItems.forEach((groupItem: any, groupIndex: number) => {
        registerAllFields({
          items: groupItem.fields,
          parentGroupId: item.id,
          parentGroupIndex: groupIndex,
          createFieldRegistration,
        });
      });
    } else {
      createFieldRegistration(item.id, parentGroupId, parentGroupIndex);
    }
  });
}

// Helper function to find field by ID
export function findFieldById(
  fieldId: string,
  formDefinition: any
): any | null {
  const searchItems = (items: any[]): any | null => {
    for (const item of items) {
      if (item.id === fieldId) {
        return item;
      }
      if (item.type === "container" && item.containerItems) {
        const found = searchItems(item.containerItems);
        if (found) return found;
      }
      if (item.type === "group" && item.groupItems) {
        for (const groupItem of item.groupItems) {
          const found = searchItems(groupItem.fields);
          if (found) return found;
        }
      }
    }
    return null;
  };

  return searchItems(formDefinition.data.items);
}

// Helper function to identify if field is in a group based on ID structure
export function parseFieldId(
  fieldId: string,
  groupStates: { [key: string]: any[] }
): {
  isGroupField: boolean;
  groupId: string | null;
  groupIndex: number | null;
  originalFieldId: string;
} {
  for (const [groupId, groupStateArray] of Object.entries(groupStates)) {
    for (
      let groupIndex = 0;
      groupIndex < groupStateArray.length;
      groupIndex++
    ) {
      if (
        groupStateArray[groupIndex] &&
        fieldId in groupStateArray[groupIndex]
      ) {
        return {
          isGroupField: true,
          groupId,
          groupIndex,
          originalFieldId: fieldId,
        };
      }
    }
  }
  return {
    isGroupField: false,
    groupId: null,
    groupIndex: null,
    originalFieldId: fieldId,
  };
}
