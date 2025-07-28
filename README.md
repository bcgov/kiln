# KILN

KILN is a presenter tool for FORMS. This accepts a JSON and present it as form with dynamic CARBON/React components.

It is developed using Carbon/React + TypeScript + Vite

## Setup Instructions

### Dependencies

- npm version 10.2.4 or higher
- node.js 20.11.1 or higher

### Installation

- Clone the repository:

```
git clone https://github.com/bcgov/kiln.git

```

- Install the Node Modules

```
npm install
```

- Once install is done, copy .env.example to .env and update it with real values

```
cp .env.example .env
```

### Executing program

- From the command line, start the server

```
npm run build
npm run preview
```

---

## Using External State Context for Script Injection

KILN supports advanced customization by allowing you to inject external scripts that can read, write, and react to form field values at runtime. This enables powerful automation, custom validation, and integration with external systems—without modifying the core React code. This integration allows for you to modify the state of the form fields within the React context.

### How It Works

- The form system exposes a global `window.externalFormStore` object.
- When all fields are registered, the system calls a global `window.externalFormInit(refsMap)` function (if present), passing a map of field IDs to field reference objects.

### Writing an External Script

**1. Define your logic in a function called `externalFormInit`:**

This function receives a `refsMap` of all registered fields. You can use `window.externalFormStore` for advanced operations.

**2. Use the field API:**

Each field reference in `refsMap` (or via `store.getFieldRef(fieldId)`) exposes:

- `getValue()`: Get the current value of the field.
- `setValue(value)`: Set the value of the field.

**3. Subscribe to field changes:**

### Example Script

```js
/**
 * Create the main initialization function that will be called by the external form system
 * @param {Object} refsMap - Map of field IDs to field reference objects
 */
function externalFormInit(refsMap) {
  const store = window.externalFormStore;

  // Concatenate text from inputs with class
  // and set it to the target field with ID
  concatenateText({
    source_class: "className",
    target_id: "elementId",
  });

  // Get source and update target field state
  conditionalDropdownToInput({
    source_id: "elementId",
    target_id: "ElementId",
    optionMap: {
      "british-columbia": "BC",
      alberta: "AB",
    },
  });

  console.log("Form scripts initialized successfully.");
}

// Create helper functions that can be reused in the script

/**
 * Links a dropdown field to an input field using the external form store.
 * @param {Object} params
 * @param {string} params.source_id - fieldId for dropdown
 * @param {string} params.target_id - fieldId for input
 * @param {Object} params.optionMap - mapping of dropdown values to input values
 */
function conditionalDropdownToInput({ source_id, target_id, optionMap }) {
  const store = window.externalFormStore;
  let src = store.getFieldRef(source_id);
  let tgt = store.getFieldRef(target_id);
  const update = (value) => {
    const mapped = optionMap[value] || "";
    if (tgt.getValue() !== mapped) {
      tgt.setValue(mapped);
    }
  };
  const unsubscribe = store.subscribeToField(source_id, update);
  const initialValue = src.getValue();
  if (initialValue) {
    update(initialValue);
  }
  return unsubscribe;
}

/**
 * Concatenates the values of all input fields with a given class and sets the result to a target field.
 * Mixes query selector with the external form store.
 * @param {Object} params
 * @param {string} params.source_class - class name of source input fields
 * @param {string} params.target_id - fieldId for the target field
 */
function concatenateText({ source_class, target_id }) {
  const store = window.externalFormStore;
  const tgtField = store.getFieldRef(target_id);
  const className = source_class.startsWith(".")
    ? source_class.slice(1)
    : source_class;
  const selector = `.${CSS.escape(className)} input`;
  const inputs = Array.from(document.querySelectorAll(selector));
  if (inputs.length === 0) return;

  const update = () => {
    const concatenated = inputs.map((i) => i.value || "").join("");
    if (tgtField.getValue() !== concatenated) {
      tgtField.setValue(concatenated);
    }
  };

  // Listen to each input's changes
  const listeners = inputs.map((input) => {
    const handler = () => update();
    input.addEventListener("input", handler);
    return { input, handler };
  });
  update();

  return () => {
    listeners.forEach(({ input, handler }) =>
      input.removeEventListener("input", handler)
    );
  };
}

// Make the function available globally for the external form system
window.externalFormInit = externalFormInit;

// Dispatch event to let the system know the script is ready
window.dispatchEvent(new CustomEvent("externalScriptReady"));
```

### Tips

- **Field IDs:** Use the field IDs from your form definition.
- **Debugging:** Use `console.log` to inspect `refsMap` and field values.
- **Cleanup:** Return unsubscribe functions if you need to remove listeners on script reload.
- **Advanced:** You can also use `store.subscribe` to listen to all state changes, or manipulate group fields using the metadata.

---
