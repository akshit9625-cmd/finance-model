import type { Toast } from '../types'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

const COLORS: Record<Toast['type'], string> = {
  ok:    'var(--green)',
  warn:  'var(--amber)',
  error: 'var(--red)',
  info:  'var(--cyan)',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          style={{
            padding: '12px 20px', borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            background: 'var(--ink3)',
            border: '1px solid var(--border2)',
            borderLeft: `3px solid ${COLORS[t.type]}`,
            animation: 'slideInRight .25s ease',
            maxWidth: 320, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
