import type { Technicals } from '../types'

interface TechCardProps {
  name: string
  value: string
  valueColor: string
  badge: string
  badgeBg: string
  badgeColor: string
  barPct: number
  barColor: string
  hint: string
}

function TechCard({ name, value, valueColor, badge, badgeBg, badgeColor, barPct, barColor, hint }: TechCardProps) {
  return (
    <div style={{
      background: 'var(--glass)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 16, transition: 'border-color .2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 2 }}>
          {name}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          padding: '2px 8px', borderRadius: 100,
          background: badgeBg, color: badgeColor,
        }}>{badge}</span>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 28,
        fontWeight: 700, marginBottom: 10, color: valueColor,
      }}>{value}</div>
      <div style={{ height: 3, background: 'var(--glass2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: barColor,
          width: `${Math.min(100, Math.max(0, barPct))}%`,
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: 'var(--muted)', marginTop: 8,
      }}>{hint}</div>
    </div>
  )
}

interface TechnicalsTabProps {
  technicals: Technicals | null
}

export function TechnicalsTab({ technicals: t }: TechnicalsTabProps) {
  if (!t) {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        color: 'var(--muted)', textAlign: 'center', padding: '60px 0',
      }}>Select a ticker to view technicals</div>
    )
  }

  const bbPct = Math.round(t.bb_pct * 100)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <TechCard
        name="RSI · 14"
        value={String(t.rsi)}
        valueColor={t.rsi > 70 ? 'var(--red)' : t.rsi < 30 ? 'var(--green)' : 'var(--text)'}
        badge={t.rsi > 70 ? 'OVERBOUGHT' : t.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'}
        badgeBg={t.rsi > 70 ? 'var(--red-dim)' : t.rsi < 30 ? 'var(--green-dim)' : 'var(--glass2)'}
        badgeColor={t.rsi > 70 ? 'var(--red)' : t.rsi < 30 ? 'var(--green)' : 'var(--muted)'}
        barPct={t.rsi}
        barColor={t.rsi > 70 ? 'var(--red)' : t.rsi < 30 ? 'var(--green)' : 'var(--cyan)'}
        hint={t.rsi > 70 ? 'Potential reversal — elevated' : t.rsi < 30 ? 'Potential bounce — depressed' : 'Momentum in neutral zone'}
      />
      <TechCard
        name="MACD"
        value={(t.macd >= 0 ? '+' : '') + t.macd}
        valueColor={t.macd >= 0 ? 'var(--green)' : 'var(--red)'}
        badge={t.macd >= 0 ? 'BULLISH' : 'BEARISH'}
        badgeBg={t.macd >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}
        badgeColor={t.macd >= 0 ? 'var(--green)' : 'var(--red)'}
        barPct={Math.min(100, Math.abs(t.macd) * 300 + 50)}
        barColor={t.macd >= 0 ? 'var(--green)' : 'var(--red)'}
        hint={t.macd >= 0 ? 'Signal above zero — upward momentum' : 'Signal below zero — downward momentum'}
      />
      <TechCard
        name="BOLLINGER %B"
        value={`${bbPct}%`}
        valueColor={bbPct > 80 ? 'var(--red)' : bbPct < 20 ? 'var(--green)' : 'var(--text)'}
        badge={bbPct > 80 ? 'UPPER BAND' : bbPct < 20 ? 'LOWER BAND' : 'MID RANGE'}
        badgeBg="var(--glass2)"
        badgeColor="var(--muted)"
        barPct={bbPct}
        barColor="var(--blue)"
        hint={bbPct > 80 ? 'Near upper band — potential resistance' : bbPct < 20 ? 'Near lower band — potential support' : 'Price within normal range'}
      />
      <TechCard
        name="VOL RATIO"
        value={`${t.vol_ratio.toFixed(2)}x`}
        valueColor={t.vol_ratio > 1.5 ? 'var(--amber)' : t.vol_ratio < 0.7 ? 'var(--muted)' : 'var(--text)'}
        badge={t.vol_ratio > 1.5 ? 'ELEVATED' : t.vol_ratio < 0.7 ? 'SUBDUED' : 'NORMAL'}
        badgeBg={t.vol_ratio > 1.5 ? 'var(--amber-dim)' : 'var(--glass2)'}
        badgeColor={t.vol_ratio > 1.5 ? 'var(--amber)' : 'var(--muted)'}
        barPct={Math.min(100, t.vol_ratio * 50)}
        barColor="var(--amber)"
        hint={t.vol_ratio > 1.5 ? 'Volume spike — institutional activity likely' : 'Volume within normal range'}
      />
    </div>
  )
}
