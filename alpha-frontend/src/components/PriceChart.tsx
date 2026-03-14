import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { HistoryResponse } from '../types'
import type { Period } from '../types'

interface PriceChartProps {
  history: HistoryResponse | null
  period: Period
  onPeriodChange: (p: Period) => void
}

const PERIODS: Period[] = [10, 20, 30, 60]

export function PriceChart({ history, period, onPeriodChange }: PriceChartProps) {
  const data = useMemo(() => {
    if (!history) return []
    const sliced = history.ohlcv.slice(-period)
    const dates  = history.dates.slice(-period)
    return sliced.map((bar, i) => ({
      date:  dates[i].slice(5),
      close: bar.close,
      open:  bar.open,
    }))
  }, [history, period])

  const rising = data.length > 1 && data[data.length - 1].close >= data[0].close
  const strokeColor = rising ? '#00e676' : '#ff5252'
  const fillId = rising ? 'greenGrad' : 'redGrad'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'rgba(15,17,23,0.97)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6, padding: '10px 14px',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: strokeColor, fontWeight: 700 }}>
          ${payload[0].value.toFixed(2)}
        </div>
      </div>
    )
  }

  if (!history) {
    return (
      <div style={{
        height: 260, background: 'var(--glass)', borderRadius: 8,
        backgroundImage: 'linear-gradient(90deg,var(--glass) 25%,var(--glass2) 50%,var(--glass) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      }} />
    )
  }

  return (
    <div>
      {/* Period buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            style={{
              padding: '5px 12px', borderRadius: 4,
              background: p === period ? 'var(--cyan-dim)' : 'none',
              border: `1px solid ${p === period ? 'rgba(0,245,212,0.4)' : 'var(--border)'}`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: p === period ? 'var(--cyan)' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >{p}D</button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e676" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5252" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#ff5252" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: '#5a6178' }}
            axisLine={false} tickLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            orientation="right"
            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: '#5a6178' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          <Area
            type="monotone" dataKey="close"
            stroke={strokeColor} strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
            animationDuration={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
