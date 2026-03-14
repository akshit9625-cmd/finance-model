import { useState, useEffect } from 'react'
import type { Tab, Period, ChipData } from './types'
import { useToast, useTicker, useLivePrice } from './hooks'

import { Navbar }          from './components/Navbar'
import { TickerStrip }     from './components/TickerStrip'
import { HeroPanel }       from './components/HeroPanel'
import { PriceChart }      from './components/PriceChart'
import { ReturnsGrid }     from './components/ReturnsGrid'
import { ForecastTab }     from './components/ForecastTab'
import { TechnicalsTab }   from './components/TechnicalsTab'
import { DirectionGauge }  from './components/DirectionGauge'
import { KeyStats }        from './components/KeyStats'
import { RAGDocs }         from './components/RAGDocs'
import { ToastContainer }  from './components/ToastContainer'

const DEFAULT_TICKERS = [
  'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA',
  'JPM','V','NFLX','AMD','INTC','PYPL','UBER','BRK-B',
]

const TABS: { id: Tab; label: string }[] = [
  { id: 'chart',       label: 'Chart'       },
  { id: 'forecast',    label: 'Forecast'    },
  { id: 'technicals',  label: 'Technicals'  },
]

export default function App() {
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [tickers] = useState<string[]>(DEFAULT_TICKERS)
  const [tab, setTab] = useState<Tab>('chart')
  const [period, setPeriod] = useState<Period>(10)
  const [chips, setChips] = useState<Record<string, ChipData>>({})

  const { toasts, addToast, removeToast } = useToast()
  const { prediction, history, loading } = useTicker(activeTicker, addToast)
  const { price: livePrice, direction: livePriceDir } = useLivePrice(activeTicker)

  // Sync chip data when a prediction arrives
  useEffect(() => {
    if (!prediction) return
    setChips(prev => ({
      ...prev,
      [prediction.ticker]: {
        ticker: prediction.ticker,
        price: prediction.current_price,
        change: prediction.price_change,
        changePct: prediction.price_change_pct,
      },
    }))
  }, [prediction])

  // Keep chip price updated from live stream
  useEffect(() => {
    if (!activeTicker || livePrice === null) return
    setChips(prev => ({
      ...prev,
      [activeTicker]: { ...prev[activeTicker], ticker: activeTicker, price: livePrice },
    }))
  }, [livePrice, activeTicker])

  function handleSearch(ticker: string) {
    if (tickers.includes(ticker)) {
      setActiveTicker(ticker)
    } else {
      addToast(`⚠ ${ticker} not in supported tickers`, 'warn')
    }
  }

  function handleSelect(ticker: string) {
    if (ticker !== activeTicker) {
      setActiveTicker(ticker)
      setTab('chart')
    }
  }

  return (
    <div>
      <Navbar onSearch={handleSearch} />
      <TickerStrip
        tickers={tickers}
        active={activeTicker}
        chips={chips}
        onSelect={handleSelect}
      />

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        minHeight: 'calc(100vh - 120px)',
      }}>

        {/* ── Left / Main column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>

          <HeroPanel
            ticker={activeTicker}
            prediction={prediction}
            livePrice={livePrice}
            livePriceDir={livePriceDir}
            loading={loading}
          />

          {/* Tab bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            background: 'var(--ink2)', padding: '0 32px', flexShrink: 0,
          }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '14px 20px', background: 'none', border: 'none',
                  fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', letterSpacing: .5,
                  color: tab === t.id ? 'var(--cyan)' : 'var(--muted)',
                  borderBottom: `2px solid ${tab === t.id ? 'var(--cyan)' : 'transparent'}`,
                  marginBottom: -1,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--muted)' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '24px 32px', flex: 1, animation: 'fadeInUp .25s ease' }} key={tab}>

            {tab === 'chart' && (
              <>
                <PriceChart
                  history={history}
                  period={period}
                  onPeriodChange={setPeriod}
                />
                <ReturnsGrid prediction={prediction} />
              </>
            )}

            {tab === 'forecast' && (
              <ForecastTab prediction={prediction} />
            )}

            {tab === 'technicals' && (
              <TechnicalsTab technicals={prediction?.technicals ?? null} />
            )}
          </div>
        </div>

        {/* ── Right / Sidebar column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <DirectionGauge
            prediction={prediction}
            livePrice={livePrice}
            livePriceDir={livePriceDir}
          />
          <KeyStats prediction={prediction} />
          <RAGDocs docs={prediction?.retrieved_docs ?? null} loading={loading} />
        </div>

      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
