import type { PredictResponse } from '../types'

interface ReturnsGridProps {
  prediction: PredictResponse | null
}

interface CardProps {
  label: string
  value: string
  valueColor: string
  sub: string
}

function ReturnCard({ label, value, valueColor, sub }: CardProps) {
  return (
    <div
      style={{
        background: 'var(--glass)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 16, textAlign: 'center',
        transition: 'all .2s', cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border2)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: 'var(--muted)', letterSpacing: 1, marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 20,
        fontWeight: 700, color: valueColor,
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: 'var(--muted)', marginTop: 4,
      }}>{sub}</div>
    </div>
  )
}

function fmt(v: number) {
  return (v >= 0 ? '+' : '') + v.toFixed(3) + '%'
}
function color(v: number) {
  return v > 0.01 ? 'var(--green)' : v < -0.01 ? 'var(--red)' : 'var(--muted)'
}

export function ReturnsGrid({ prediction }: ReturnsGridProps) {
  const p = prediction?.prediction

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20,
    }}>
      <ReturnCard
        label="1D RETURN"
        value={p ? fmt(p.return_1d) : '—'}
        valueColor={p ? color(p.return_1d) : 'var(--muted)'}
        sub="Predicted"
      />
      <ReturnCard
        label="5D RETURN"
        value={p ? fmt(p.return_5d) : '—'}
        valueColor={p ? color(p.return_5d) : 'var(--muted)'}
        sub="Predicted"
      />
      <ReturnCard
        label="20D RETURN"
        value={p ? fmt(p.return_20d) : '—'}
        valueColor={p ? color(p.return_20d) : 'var(--muted)'}
        sub="Predicted"
      />
      <ReturnCard
        label="VOLATILITY"
        value={p ? `${p.volatility.toFixed(1)}%` : '—'}
        valueColor="var(--muted)"
        sub="Annualised"
      />
    </div>
  )
}
