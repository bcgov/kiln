import { useContext } from "react";
import { ExternalStateContext } from "../ExternalStateContext";

interface ExternalStateContextType {
  state: { [key: string]: any };
  store: any;
}

export const useExternalState = (): ExternalStateContextType => {
  const context = useContext(ExternalStateContext);
  if (!context) {
    throw new Error(
      "useExternalState must be used within an ExternalStateProvider"
    );
  }
  return context;
};
