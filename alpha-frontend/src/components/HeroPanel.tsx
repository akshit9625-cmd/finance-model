import type { PredictResponse, Signal } from '../types'

const SIGNAL_STYLES: Record<Signal | 'loading', { bg: string; border: string; color: string; icon: string }> = {
  STRONG_BUY:  { bg: 'rgba(0,230,118,0.08)',  border: 'rgba(0,230,118,0.3)',  color: 'var(--green)', icon: '▲▲' },
  BUY:         { bg: 'rgba(0,230,118,0.05)',  border: 'rgba(0,230,118,0.2)',  color: '#80e8a0',      icon: '▲'  },
  HOLD:        { bg: 'rgba(255,171,64,0.06)', border: 'rgba(255,171,64,0.2)', color: 'var(--amber)', icon: '◆'  },
  SELL:        { bg: 'rgba(255,82,82,0.05)',  border: 'rgba(255,82,82,0.2)',  color: '#ff8a80',      icon: '▼'  },
  STRONG_SELL: { bg: 'rgba(255,82,82,0.08)',  border: 'rgba(255,82,82,0.3)',  color: 'var(--red)',   icon: '▼▼' },
  loading:     { bg: 'var(--glass)',          border: 'var(--border)',        color: 'var(--muted)', icon: '◈'  },
}

interface HeroPanelProps {
  ticker: string | null
  prediction: PredictResponse | null
  livePrice: number | null
  livePriceDir: 'up' | 'down' | 'neutral'
  loading: boolean
}

export function HeroPanel({ ticker, prediction, livePrice, livePriceDir, loading }: HeroPanelProps) {
  const signal = prediction?.signal ?? 'loading'
  const st = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.loading

  const displayPrice = livePrice ?? prediction?.current_price
  const priceColor =
    livePriceDir === 'up' ? 'var(--green)' :
    livePriceDir === 'down' ? 'var(--red)' :
    'transparent'

  const chg = prediction?.price_change ?? 0
  const chgPct = prediction?.price_change_pct ?? 0
  const pos = chg >= 0
  const confPct = prediction?.confidence ?? 0
  const confBg = confPct > 65
    ? 'linear-gradient(90deg,var(--cyan),var(--green))'
    : confPct > 45
    ? 'linear-gradient(90deg,var(--amber),var(--cyan))'
    : 'linear-gradient(90deg,var(--red),var(--amber))'

  return (
    <div style={{
      padding: '36px 32px 28px',
      background: 'linear-gradient(180deg,rgba(0,245,212,0.03) 0%,transparent 100%)',
      borderBottom: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(0,245,212,0.06) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Ticker / date */}
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600,
        letterSpacing: 4, textTransform: 'uppercase', color: 'var(--muted)',
        marginBottom: 8,
      }}>
        {ticker
          ? `${ticker} · ${prediction
              ? new Date(prediction.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : loading ? 'Loading…' : '—'}`
          : 'SELECT A TICKER'}
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: -2,
          background: 'linear-gradient(135deg,#fff 0%,var(--cyan) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          outline: `2px solid ${priceColor}`, outlineOffset: 4, borderRadius: 4,
          transition: 'outline-color .4s',
        }}>
          {displayPrice ? `$${displayPrice.toFixed(2)}` : '—'}
        </div>

        {prediction && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
              color: pos ? 'var(--green)' : 'var(--red)',
            }}>
              {pos ? '+' : ''}{chg.toFixed(2)}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
              color: pos ? 'var(--green)' : 'var(--red)',
            }}>
              {pos ? '+' : ''}{chgPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Signal + Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
        {/* Signal card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', borderRadius: 10,
          background: st.bg, border: `1px solid ${st.border}`,
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'all .3s',
        }}>
          <span style={{ fontSize: 18, color: st.color }}>{st.icon}</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1, marginBottom: 2 }}>
              MODEL SIGNAL
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: st.color }}>
              {signal === 'loading' ? (loading ? 'ANALYZING' : 'AWAITING') : signal.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
              CONFIDENCE
            </span>
            <strong style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--cyan)' }}>
              {prediction ? `${confPct}%` : '--%'}
            </strong>
          </div>
          <div style={{ height: 4, background: 'var(--glass2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: confBg,
              width: `${confPct}%`,
              transition: 'width .8s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
