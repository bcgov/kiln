import React from "react";
import { Modal } from "carbon-components-react";

interface CustomModalProps {
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  primaryText?: string;
  secondaryText?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}


const CustomModal: React.FC<CustomModalProps> = ({ title, message, isOpen, onClose, primaryText, secondaryText,onPrimary,onSecondary }) => {
  return (
    <Modal
    open={isOpen}
    modalHeading={title}
    passiveModal={!primaryText && !secondaryText}
    primaryButtonText={primaryText}
    secondaryButtonText={secondaryText}
    onRequestClose={onClose}
    onRequestSubmit={onPrimary ?? onClose}
    onSecondarySubmit={onSecondary}     
    >
      <div >  
      <p>{message}</p>
      </div>
      
    </Modal>
  );
};

export default CustomModal;