import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={onCancel} />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-sm bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl shadow-xl p-6 fade-up">
        <h3 className="display-tight text-lg text-ink-950 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-ink-500 dark:text-ink-400 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
