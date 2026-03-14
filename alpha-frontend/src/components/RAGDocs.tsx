import type { RetrievedDoc } from '../types'

interface RAGDocsProps {
  docs: RetrievedDoc[] | null
  loading: boolean
}

function Skeleton() {
  return (
    <div style={{
      height: 84, borderRadius: 8, marginBottom: 8,
      background: 'linear-gradient(90deg, var(--glass) 25%, var(--glass2) 50%, var(--glass) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}

export function RAGDocs({ docs, loading }: RAGDocsProps) {
  return (
    <div style={{ padding: 24, flex: 1 }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600,
        letterSpacing: 3, textTransform: 'uppercase', color: 'var(--muted)',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        RAG Context
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {loading && (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      )}

      {!loading && !docs && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'var(--muted)', textAlign: 'center', padding: '32px 0',
        }}>
          Select a ticker to retrieve context
        </div>
      )}

      {docs?.map((doc, i) => {
        const attnPct = Math.min(100, (doc.attention ?? 0) * 600)
        return (
          <div
            key={i}
            style={{
              background: 'var(--glass)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 14, marginBottom: 8,
              cursor: 'default', transition: 'all .18s',
              position: 'relative', overflow: 'hidden',
              animation: `fadeInUp .3s ${i * 0.06}s ease both`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,245,212,0.2)'
              e.currentTarget.style.transform = 'translateX(3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            {/* Rank badge */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--glass2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)',
            }}>{i + 1}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingRight: 28 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--cyan)' }}>
                SIM {(doc.score * 100).toFixed(1)}%
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--amber)' }}>
                ATTN {(doc.attention ?? 0).toFixed(4)}
              </span>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text)', opacity: .85 }}>
              {doc.text}
            </div>

            {/* Attention bar */}
            <div style={{ height: 1.5, background: 'var(--border)', marginTop: 10, borderRadius: 1, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 1,
                background: 'linear-gradient(90deg,var(--amber),var(--cyan))',
                width: `${attnPct}%`,
                transition: 'width .6s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
