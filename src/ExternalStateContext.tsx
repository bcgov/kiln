/**
 * ExternalStateContext provides a global store for form field values and methods.
 *
 * External scripts can interact with the form via:
 *   - window.externalFormStore: The global store instance.
 *   - window.externalFormInit(refsMap): Called when all fields are registered.
 *
 * Each field reference (from store.getFieldRef(fieldId) or refsMap[fieldId]) exposes:
 *   - setValue(value): Set the field value.
 *   - getValue(): Get the current field value.
 *
 */
import React, { createContext, useState, useEffect } from "react";

interface FieldMethods {
  setValue: (value: any) => void;
  getValue: () => any;
  validate: (value?: any) => string | null;
  setError: (error: string | null) => void;
  getError: () => string | null;
  fieldType: string;
  isGroupField: boolean;
  groupId: string | null;
  groupIndex: number | null;
}

interface ExternalFormStore {
  state: { [key: string]: any };
  listeners: Set<(state: any) => void>;
  fieldRefs: Map<string, FieldMethods>;
  setState: (fieldId: string, value: any) => void;
  getState: (fieldId: string) => any;
  subscribe: (listener: (state: any) => void) => () => void;
  subscribeToField: (
    fieldId: string,
    listener: (value: any, fieldId: string) => void
  ) => () => void;
  notifyListeners: () => void;
  registerField: (fieldId: string, methods: FieldMethods) => void;
  getFieldRef: (fieldId: string) => FieldMethods | undefined;
  getAllFieldRefs: () => { [key: string]: FieldMethods };
  initializeExternalScript: () => void;
  reinitializeExternalScript: () => void;
  getRegistrationStatus: () => {
    totalFields: number;
    registeredFields: string[];
  };
  clearRegistrations: () => void;
  hasRegistrations: () => boolean;
}

// External store that lives outside React
class ExternalFormStoreImpl implements ExternalFormStore {
  state: { [key: string]: any } = {};
  listeners = new Set<(state: any) => void>();
  fieldRefs = new Map<string, FieldMethods>();
  private externalScriptInitialized = false;
  private isUpdating = false; // Add flag to prevent recursion
  private registrationCompleteTimeout: NodeJS.Timeout | null = null;
  private fieldListeners = new Map<
    string,
    Set<(value: any, fieldId: string) => void>
  >();

  setState(fieldId: string, value: any) {
    // Prevent recursion by checking if we're already updating
    if (this.isUpdating) {
      return;
    }

    const oldValue = this.state[fieldId];
    this.state[fieldId] = value;

    // Only notify if value actually changed
    if (oldValue !== value) {
      this.notifyListeners();
      this.notifyFieldListeners(fieldId, value);
    }
  }

  getState(fieldId: string) {
    return this.state[fieldId];
  }

  subscribe(listener: (state: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToField(
    fieldId: string,
    listener: (value: any, fieldId: string) => void
  ) {
    if (!this.fieldListeners.has(fieldId)) {
      this.fieldListeners.set(fieldId, new Set());
    }
    this.fieldListeners.get(fieldId)!.add(listener);

    return () => {
      const listeners = this.fieldListeners.get(fieldId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.fieldListeners.delete(fieldId);
        }
      }
    };
  }

  notifyListeners() {
    // Prevent recursion during listener notifications
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    try {
      this.listeners.forEach((listener) => {
        try {
          listener(this.state);
        } catch (error) {
          console.error("Error in store listener:", error);
        }
      });
    } finally {
      this.isUpdating = false;
    }
  }

  private notifyFieldListeners(fieldId: string, value: any) {
    const listeners = this.fieldListeners.get(fieldId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(value, fieldId);
        } catch (error) {
          console.error(`Error in field listener for ${fieldId}:`, error);
        }
      });
    }
  }

  registerField(fieldId: string, methods: FieldMethods) {
    this.fieldRefs.set(fieldId, methods);

    // Initialize state with current value without triggering listeners
    const currentValue = methods.getValue();
    if (currentValue !== undefined && currentValue !== "") {
      this.state[fieldId] = currentValue;
    }

    // Clear previous timeout and set a new one
    if (this.registrationCompleteTimeout) {
      clearTimeout(this.registrationCompleteTimeout);
    }

    // Wait for field registrations to complete, then initialize external script
    this.registrationCompleteTimeout = setTimeout(() => {
      console.log(
        "Field registration appears complete, initializing external script"
      );
      this.reinitializeExternalScript();
    }, 500); // Wait 500ms after last field registration
  }

  getFieldRef(fieldId: string) {
    return this.fieldRefs.get(fieldId);
  }

  getAllFieldRefs() {
    const refs: { [key: string]: FieldMethods } = {};
    this.fieldRefs.forEach((methods, fieldId) => {
      refs[fieldId] = methods;
    });
    return refs;
  }

  getRegistrationStatus() {
    return {
      totalFields: this.fieldRefs.size,
      registeredFields: Array.from(this.fieldRefs.keys()),
    };
  }

  clearRegistrations() {
    console.log("Clearing all field registrations");
    if (this.registrationCompleteTimeout) {
      clearTimeout(this.registrationCompleteTimeout);
      this.registrationCompleteTimeout = null;
    }
    this.fieldRefs.clear();
    this.fieldListeners.clear();
    this.state = {};
    this.externalScriptInitialized = false;
  }

  reinitializeExternalScript() {
    console.log("Re-initializing external script");
    this.externalScriptInitialized = false;
    this.initializeExternalScript();
  }

  hasRegistrations(): boolean {
    return this.fieldRefs.size > 0;
  }

  initializeExternalScript() {
    if (
      window.externalFormInit &&
      typeof window.externalFormInit === "function" &&
      !this.externalScriptInitialized
    ) {
      try {
        const status = this.getRegistrationStatus();

        // Don't initialize if no fields are registered
        if (status.totalFields === 0) {
          console.log("No fields registered, skipping initialization");
          return;
        }

        // Sync all field values to the store before creating refs
        this.fieldRefs.forEach((methods, fieldId) => {
          const currentValue = methods.getValue();
          if (currentValue !== undefined && currentValue !== "") {
            this.state[fieldId] = currentValue;
          }
        });

        // Create stable ref objects for external script
        const refsForExternalScript: { [key: string]: any } = {};
        this.fieldRefs.forEach((methods, fieldId) => {
          refsForExternalScript[fieldId] = {
            current: null,
            setValue: (value: any) => {
              if (this.isUpdating) {
                return;
              }

              // Update the store state first
              this.state[fieldId] = value;

              // Then update the component
              methods.setValue(value);

              // Notify listeners after both updates
              this.notifyListeners();
              this.notifyFieldListeners(fieldId, value);
            },
            getValue: () => {
              // Get the most current value from the component
              const componentValue = methods.getValue();

              // If component has a value, sync it to store and return it
              if (componentValue !== undefined && componentValue !== "") {
                if (this.state[fieldId] !== componentValue) {
                  this.state[fieldId] = componentValue;
                }
                return componentValue;
              }

              // If component is empty, check store
              const storeValue = this.state[fieldId];
              if (storeValue !== undefined && storeValue !== "") {
                return storeValue;
              }

              // Return empty string as default
              return "";
            },
            validate: methods.validate,
            setError: methods.setError,
            getError: methods.getError,
            fieldType: methods.fieldType,
            isGroupField: methods.isGroupField,
            groupId: methods.groupId,
            groupIndex: methods.groupIndex,
          };
        });

        // Add the field-specific subscription method to the store reference
        refsForExternalScript._store = {
          subscribeToField: this.subscribeToField.bind(this),
          subscribe: this.subscribe.bind(this),
          getState: this.getState.bind(this),
          setState: this.setState.bind(this),
        };

        window.externalFormInit(refsForExternalScript);
        this.externalScriptInitialized = true;
        console.log("External script initialized successfully");
      } catch (error) {
        console.error("Error initializing external script:", error);
      }
    } else if (!window.externalFormInit) {
      console.log("External script not available yet, will retry...");
    } else if (this.externalScriptInitialized) {
      console.log("External script already initialized");
    }
  }

  resetExternalScript() {
    console.log("Resetting external script initialization flag");
    this.externalScriptInitialized = false;
  }
}

// Global store instance
declare global {
  interface Window {
    externalFormStore: ExternalFormStore;
    externalFormInit?: (refsMap: { [key: string]: any }) => void;
  }
}

if (!window.externalFormStore) {
  window.externalFormStore = new ExternalFormStoreImpl();
}

interface ExternalStateContextType {
  state: { [key: string]: any };
  store: ExternalFormStore;
}

export const ExternalStateContext = createContext<
  ExternalStateContextType | undefined
>(undefined);

export const ExternalStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState(window.externalFormStore.state);

  useEffect(() => {
    const unsubscribe = window.externalFormStore.subscribe(setState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Listen for external script ready event
    const handleExternalScriptReady = () => {
      console.log("External script ready event received");
      setTimeout(() => {
        window.externalFormStore.reinitializeExternalScript();
      }, 1000);
    };

    window.addEventListener("externalScriptReady", handleExternalScriptReady);

    return () => {
      window.removeEventListener(
        "externalScriptReady",
        handleExternalScriptReady
      );
    };
  }, []);

  return (
    <ExternalStateContext.Provider
      value={{
        state,
        store: window.externalFormStore,
      }}
    >
      {children}
    </ExternalStateContext.Provider>
  );
};
