import { useEffect, useRef } from 'react'
import type { PredictResponse } from '../types'

interface DirectionGaugeProps {
  prediction: PredictResponse | null
  livePrice: number | null
  livePriceDir: 'up' | 'down' | 'neutral'
}

export function DirectionGauge({ prediction, livePrice, livePriceDir }: DirectionGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probs = prediction?.prediction.direction_probs
  const direction = prediction?.prediction.direction

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = 80, cy = 90, r = 62, lw = 11
    ctx.clearRect(0, 0, 160, 100)

    const up   = probs?.up   ?? 33.3
    const flat = probs?.flat ?? 33.3
    const down = probs?.down ?? 33.3
    const total = up + flat + down || 1

    const segments = [
      { val: up / total,   color: '#00e676' },
      { val: flat / total, color: '#3a3f52' },
      { val: down / total, color: '#ff5252' },
    ]

    let angle = Math.PI
    segments.forEach(s => {
      const sweep = s.val * Math.PI
      ctx.beginPath()
      ctx.arc(cx, cy, r, angle, angle + sweep)
      ctx.strokeStyle = s.color
      ctx.lineWidth = lw
      ctx.lineCap = 'butt'
      ctx.stroke()
      angle += sweep
    })
  }, [probs])

  const up   = probs?.up   ?? 0
  const flat = probs?.flat ?? 0
  const down = probs?.down ?? 0

  const livePriceColor =
    livePriceDir === 'up' ? 'var(--green)' :
    livePriceDir === 'down' ? 'var(--red)' :
    'var(--cyan)'

  const displayPrice = livePrice ?? prediction?.current_price

  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
      {/* Title */}
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600,
        letterSpacing: 3, textTransform: 'uppercase', color: 'var(--muted)',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        Direction Probability
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Arc canvas */}
      <div style={{ position: 'relative', width: 160, margin: '0 auto 16px' }}>
        <canvas ref={canvasRef} width={160} height={100} style={{ display: 'block' }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingTop: 20,
        }}>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2,
            color: direction === 'UP' ? 'var(--green)' : direction === 'DOWN' ? 'var(--red)' : 'var(--muted)',
          }}>
            {direction ?? '—'}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {probs ? `${Math.max(up, flat, down).toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Bars */}
      {[
        { label: 'UP',   pct: up,   color: 'var(--green)' },
        { label: 'FLAT', pct: flat, color: 'var(--muted)' },
        { label: 'DOWN', pct: down, color: 'var(--red)'   },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', width: 36 }}>
            {row.label}
          </span>
          <div style={{ flex: 1, height: 5, background: 'var(--glass2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: row.color,
              width: `${row.pct}%`,
              transition: 'width .7s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
            color: row.color, width: 38, textAlign: 'right',
          }}>
            {probs ? `${row.pct.toFixed(1)}%` : '—'}
          </span>
        </div>
      ))}

      {/* Live price feed */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--glass)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '12px 16px', marginTop: 16,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--green)', boxShadow: '0 0 8px var(--green)',
          animation: 'breathe 1s ease-in-out infinite',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
          LIVE PRICE
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700,
          color: livePriceColor, marginLeft: 'auto',
          transition: 'color .4s',
        }}>
          {displayPrice ? `$${displayPrice.toFixed(2)}` : '—'}
        </span>
      </div>
    </div>
  )
}
