import { useState, useEffect } from 'react'

interface NavbarProps {
  onSearch: (ticker: string) => void
}

export function Navbar({ onSearch }: NavbarProps) {
  const [clock, setClock] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleSearch = () => {
    const v = query.trim().toUpperCase()
    if (v) { onSearch(v); setQuery('') }
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: 60,
      background: 'rgba(10,11,15,0.92)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{
          fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800,
          letterSpacing: -0.5, color: 'var(--cyan)',
        }}>ALPHA</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--muted)', letterSpacing: 3, textTransform: 'uppercase',
        }}>Quantitative Intelligence</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--glass2)', border: '1px solid var(--border2)',
          borderRadius: 8, overflow: 'hidden',
          outline: 'none',
          transition: 'border-color .2s',
        }}>
          <span style={{ padding: '0 10px', color: 'var(--muted)', fontSize: 15 }}>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search ticker…"
            maxLength={6}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              color: 'var(--text)', padding: '8px 8px 8px 0', width: 140,
              textTransform: 'uppercase',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '8px 14px', background: 'var(--cyan)', border: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              fontWeight: 700, color: 'var(--ink)', letterSpacing: 1,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >GO</button>
        </div>

        {/* Live pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 14px', borderRadius: 100,
          background: 'var(--glass2)', border: '1px solid var(--border)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
            boxShadow: '0 0 8px var(--green)',
            animation: 'breathe 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          LIVE
        </div>

        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--cyan)',
        }}>{clock}</span>
      </div>
    </nav>
  )
}
