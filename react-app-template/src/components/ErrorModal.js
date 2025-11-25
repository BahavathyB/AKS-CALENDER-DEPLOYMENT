import React from 'react';

function ErrorModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="modal-overlay">
      <div className="modal error-modal">
        <h3>Warning</h3>
        <p>{message}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default ErrorModal;
