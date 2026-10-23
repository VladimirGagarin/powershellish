import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-dot" />
          <h3 id="dialog-title">{title}</h3>
        </div>
        <p className="dialog-description">{description}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="dialog-btn dialog-btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`dialog-btn ${danger ? 'dialog-btn-danger' : 'dialog-btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
