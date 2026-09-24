import React from 'react';
import Modal from './Modal';
import '../../assets/css/modules.css';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Delete', 
  danger = true 
}) {
  const footer = (
    <>
      <button className="btn btn--ghost" onClick={onClose}>
        Cancel
      </button>
      <button 
        className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} 
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div className="confirm-dialog">
        <div className="confirm-dialog__icon">
          {danger ? '⚠️' : '❓'}
        </div>
        <p className="confirm-dialog__message">
          {message}
        </p>
      </div>
    </Modal>
  );
}
