import "../App.css";
import "../print.css";
import '@carbon/styles/css/styles.css';
import "../page.scss";
import React from 'react';
import {  Button } from "carbon-components-react";
import { InterfaceElement } from '../types/template';

interface ButtonRendererProps {
  config: InterfaceElement;
  onButtonClick: (config: InterfaceElement) => void;
  disabled?: boolean;
}

const ButtonRenderer: React.FC<ButtonRendererProps> = ({ config, onButtonClick, disabled  }) => {
  const handleClick = () => {
    if (disabled) return;
    onButtonClick(config); // Pass only the button config    
  };

  return (                  
          <>
            <Button onClick={handleClick} kind="secondary" className="no-print" disabled={disabled}>
              {config.label}
            </Button>        

          </>    
  );
};

export default ButtonRenderer;
