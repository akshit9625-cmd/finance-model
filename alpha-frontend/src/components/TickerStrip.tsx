import type { ChipData } from '../types'

interface TickerStripProps {
  tickers: string[]
  active: string | null
  chips: Record<string, ChipData>
  onSelect: (ticker: string) => void
}

export function TickerStrip({ tickers, active, chips, onSelect }: TickerStripProps) {
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '12px 32px',
      overflowX: 'auto', scrollbarWidth: 'none',
      borderBottom: '1px solid var(--border)',
      background: 'var(--ink2)',
      position: 'sticky', top: 60, zIndex: 190,
    }}>
      {tickers.map(t => {
        const chip = chips[t]
        const isActive = t === active
        const pos = (chip?.changePct ?? 0) >= 0

        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            style={{
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: '8px 14px', borderRadius: 6,
              background: isActive ? 'rgba(0,245,212,0.08)' : 'var(--glass)',
              border: `1px solid ${isActive ? 'rgba(0,245,212,0.4)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all .18s',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'var(--glass2)'
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'var(--glass)'
            }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              color: isActive ? 'var(--cyan)' : 'var(--text)',
            }}>{t}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'var(--muted)',
            }}>
              {chip?.price ? `$${chip.price.toFixed(2)}` : '—'}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: chip?.changePct !== undefined
                ? pos ? 'var(--green)' : 'var(--red)'
                : 'var(--muted)',
            }}>
              {chip?.changePct !== undefined
                ? `${pos ? '+' : ''}${chip.changePct.toFixed(2)}%`
                : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
