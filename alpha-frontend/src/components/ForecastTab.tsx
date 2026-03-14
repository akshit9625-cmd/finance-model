import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { PredictResponse } from '../types'

interface ForecastTabProps {
  prediction: PredictResponse | null
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--glass)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 16,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: 'var(--muted)', letterSpacing: 1, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
        color: color ?? 'var(--text)',
      }}>{value}</div>
    </div>
  )
}

export function ForecastTab({ prediction }: ForecastTabProps) {
  if (!prediction) {
    return (
      <div style={{
        height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)',
      }}>Select a ticker to view forecast</div>
    )
  }

  const { prediction: pred, technicals: t } = prediction

  const barData = [
    { label: '1-Day',  value: pred.return_1d },
    { label: '5-Day',  value: pred.return_5d },
    { label: '20-Day', value: pred.return_20d },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const v = payload[0].value as number
    return (
      <div style={{
        background: 'rgba(15,17,23,0.97)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6, padding: '10px 14px',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
          color: v >= 0 ? 'var(--green)' : 'var(--red)',
        }}>
          {v >= 0 ? '+' : ''}{v.toFixed(3)}%
        </div>
      </div>
    )
  }

  const pfhColor = t.pct_from_high < -20 ? 'var(--red)' : t.pct_from_high < -10 ? 'var(--amber)' : 'var(--green)'

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: '#5a6178' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: '#5a6178' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v.toFixed(2) + '%'}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={500}>
            {barData.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,82,82,0.7)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20,
      }}>
        <StatCard label="52W HIGH"    value={`$${t.high_52w}`} />
        <StatCard label="52W LOW"     value={`$${t.low_52w}`} />
        <StatCard label="SMA 20"      value={`$${t.sma_20}`} />
        <StatCard label="% FROM HIGH" value={`${t.pct_from_high.toFixed(1)}%`} color={pfhColor} />
      </div>
    </div>
  )
}
