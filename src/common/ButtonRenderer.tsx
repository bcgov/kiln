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
}

const ButtonRenderer: React.FC<ButtonRendererProps> = ({ config, onButtonClick }) => {
  const handleClick = () => {
    onButtonClick(config); // Pass only the button config
    window.alert("here");
  };

  return (                  
          <>
            <Button onClick={handleClick} kind="secondary" className="no-print">
              {config.label}
            </Button>        

          </>    
  );
};

export default ButtonRenderer;
