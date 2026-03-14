import { useState, useEffect, useCallback, useRef } from 'react'
import type { PredictResponse, HistoryResponse, Toast } from '../types'
import { fetchHistory, fetchPrediction, createPriceStream } from '../api/client'

// ── useToast ──────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

// ── useLivePrice ──────────────────────────────────────────
export function useLivePrice(ticker: string | null) {
  const [price, setPrice] = useState<number | null>(null)
  const prevPriceRef = useRef<number | null>(null)
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('neutral')

  useEffect(() => {
    if (!ticker) return
    setPrice(null)
    prevPriceRef.current = null

    const cleanup = createPriceStream(
      ticker,
      (newPrice) => {
        setDirection(
          prevPriceRef.current === null
            ? 'neutral'
            : newPrice > prevPriceRef.current
            ? 'up'
            : newPrice < prevPriceRef.current
            ? 'down'
            : 'neutral'
        )
        prevPriceRef.current = newPrice
        setPrice(newPrice)
        setTimeout(() => setDirection('neutral'), 600)
      }
    )
    return cleanup
  }, [ticker])

  return { price, direction }
}

// ── useTicker ─────────────────────────────────────────────
export function useTicker(ticker: string | null, addToast: (msg: string, type: Toast['type']) => void) {
  const [prediction, setPrediction] = useState<PredictResponse | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return

    setLoading(true)
    setError(null)
    setPrediction(null)
    setHistory(null)
    addToast(`⟳ Fetching ${ticker}`, 'info')

    Promise.all([
      fetchHistory(ticker, 60).catch(() => null),
      fetchPrediction(ticker).catch(() => null),
    ]).then(([hist, pred]) => {
      if (hist) setHistory(hist)
      else addToast('⚠ History unavailable', 'warn')

      if (pred) {
        setPrediction(pred)
        addToast(`✓ Inference complete for ${ticker}`, 'ok')
      } else {
        setError('Backend offline')
        addToast('✗ Backend offline — run uvicorn main:app', 'error')
      }
      setLoading(false)
    })
  }, [ticker]) // eslint-disable-line react-hooks/exhaustive-deps

  return { prediction, history, loading, error }
}
