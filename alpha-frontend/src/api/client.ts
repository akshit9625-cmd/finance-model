import type { HistoryResponse, PredictResponse } from '../types'

const BASE = '/api'

export async function fetchTickers(): Promise<string[]> {
  const res = await fetch(`${BASE}/tickers`)
  if (!res.ok) throw new Error('Failed to fetch tickers')
  const data = await res.json()
  return data.tickers as string[]
}

export async function fetchHistory(ticker: string, days = 60): Promise<HistoryResponse> {
  const res = await fetch(`${BASE}/history/${ticker}?days=${days}`)
  if (!res.ok) throw new Error(`Failed to fetch history for ${ticker}`)
  return res.json()
}

export async function fetchPrediction(ticker: string): Promise<PredictResponse> {
  const res = await fetch(`${BASE}/predict/${ticker}`)
  if (!res.ok) throw new Error(`Failed to fetch prediction for ${ticker}`)
  return res.json()
}

export function createPriceStream(
  ticker: string,
  onPrice: (price: number) => void,
  onError?: () => void
): () => void {
  const wsBase = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${wsBase}//localhost:8000/stream/${ticker}`)

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      onPrice(data.price)
    } catch { /* ignore */ }
  }

  ws.onerror = () => onError?.()

  return () => ws.close()
}
