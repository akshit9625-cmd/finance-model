export interface OHLCVBar {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface HistoryResponse {
  ticker: string
  dates: string[]
  ohlcv: OHLCVBar[]
}

export interface DirectionProbs {
  down: number
  flat: number
  up: number
}

export interface Prediction {
  direction: 'UP' | 'DOWN' | 'FLAT'
  direction_probs: DirectionProbs
  return_1d: number
  return_5d: number
  return_20d: number
  volatility: number
}

export interface Technicals {
  rsi: number
  macd: number
  macd_signal: number
  bb_pct: number
  vol_ratio: number
  high_52w: number
  low_52w: number
  pct_from_high: number
  sma_20: number
}

export interface RetrievedDoc {
  text: string
  score: number
  attention: number
}

export interface PredictResponse {
  ticker: string
  timestamp: string
  current_price: number
  price_change: number
  price_change_pct: number
  prediction: Prediction
  technicals: Technicals
  retrieved_docs: RetrievedDoc[]
  confidence: number
  signal: Signal
}

export type Signal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'

export type Tab = 'chart' | 'forecast' | 'technicals'
export type Period = 10 | 20 | 30 | 60

export interface Toast {
  id: string
  message: string
  type: 'ok' | 'warn' | 'error' | 'info'
}

export interface ChipData {
  ticker: string
  price?: number
  change?: number
  changePct?: number
}
