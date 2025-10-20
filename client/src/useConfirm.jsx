import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';

const useConfirm = () => {
  const [promise, setPromise] = useState(null);
  const [modalProps, setModalProps] = useState({});

  const confirm = (props = {}) => {
    return new Promise((resolve) => {
      setModalProps(props);
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    if (promise) {
      promise.resolve(false);
      setPromise(null);
    }
    setModalProps({});
  };

  const handleConfirm = () => {
    if (promise) {
      promise.resolve(true);
      setPromise(null);
    }
    setModalProps({});
  };

  const ConfirmationComponent = () => (
    <ConfirmModal
      isOpen={promise !== null}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...modalProps}
    />
  );

  return { confirm, ConfirmationComponent };
};

export default useConfirm;