import type { PredictResponse } from '../types'

interface KeyStatsProps {
  prediction: PredictResponse | null
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

export function KeyStats({ prediction }: KeyStatsProps) {
  const t = prediction?.technicals

  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600,
        letterSpacing: 3, textTransform: 'uppercase', color: 'var(--muted)',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        Key Statistics
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <Row label="52W HIGH"    value={t ? `$${t.high_52w}` : '—'} />
      <Row label="52W LOW"     value={t ? `$${t.low_52w}` : '—'} />
      <Row label="SMA 20"      value={t ? `$${t.sma_20}` : '—'} />
      <Row
        label="RSI (14)"
        value={t ? String(t.rsi) : '—'}
        color={t ? t.rsi > 70 ? 'var(--red)' : t.rsi < 30 ? 'var(--green)' : 'var(--text)' : undefined}
      />
      <Row
        label="MACD"
        value={t ? `${t.macd >= 0 ? '+' : ''}${t.macd}` : '—'}
        color={t ? t.macd >= 0 ? 'var(--green)' : 'var(--red)' : undefined}
      />
      <Row
        label="VOL RATIO"
        value={t ? `${t.vol_ratio.toFixed(2)}x` : '—'}
        color={t ? t.vol_ratio > 1.5 ? 'var(--amber)' : t.vol_ratio < 0.7 ? 'var(--muted)' : 'var(--text)' : undefined}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
          % FROM HIGH
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
          color: t
            ? t.pct_from_high < -20 ? 'var(--red)'
            : t.pct_from_high < -10 ? 'var(--amber)'
            : 'var(--green)'
            : 'var(--text)',
        }}>
          {t ? `${t.pct_from_high.toFixed(1)}%` : '—'}
        </span>
      </div>
    </div>
  )
}
