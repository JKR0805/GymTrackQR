import Button from "./Button";

const Modal = ({
  show,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmVariant,
  confirmDisabled = false,
  cancelDisabled = false,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm ? (
          <div className="modal-actions">
            <Button
              variant={confirmVariant || "danger"}
              fullWidth
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel || "Confirm"}
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose} disabled={cancelDisabled}>
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;
