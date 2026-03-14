import asyncio
import math
import time
import json
import re
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
import yfinance as yf
import faiss
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import BertTokenizer, BertModel


# App setup


app = FastAPI(title="Finance CNN+RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "BRK-B", "JPM", "V",
    "NFLX", "AMD", "INTC", "PYPL", "UBER",
]


# CNN Model


class CNNBranch(nn.Module):
    def __init__(self, n_features=5, embed_dim=128):
        super().__init__()
        self.conv1 = nn.Conv1d(n_features, 64, kernel_size=3, padding=1)
        self.bn1   = nn.BatchNorm1d(64)
        self.conv2 = nn.Conv1d(64, 128, kernel_size=5, padding=2)
        self.bn2   = nn.BatchNorm1d(128)
        self.drop  = nn.Dropout(0.3)
        self.conv3 = nn.Conv1d(128, embed_dim, kernel_size=7, padding=3)
        self.bn3   = nn.BatchNorm1d(embed_dim)
        self.pool  = nn.AdaptiveMaxPool1d(1)

    def forward(self, x):
        x = x.transpose(1, 2)
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.drop(F.relu(self.bn2(self.conv2(x))))
        x = F.relu(self.bn3(self.conv3(x)))
        return self.pool(x).squeeze(-1)


class CrossAttentionFusion(nn.Module):
    def __init__(self, embed_dim=128, n_heads=4):
        super().__init__()
        self.attn  = nn.MultiheadAttention(embed_dim, n_heads, batch_first=True)
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)
        self.ff    = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(embed_dim * 2, embed_dim),
        )

    def forward(self, cnn_emb, rag_chunks):
        q = cnn_emb.unsqueeze(1)
        attn_out, attn_weights = self.attn(q, rag_chunks, rag_chunks)
        fused = self.norm1(q + attn_out).squeeze(1)
        fused = self.norm2(fused + self.ff(fused))
        return fused, attn_weights.squeeze(1)


class OutputHeads(nn.Module):
    def __init__(self, embed_dim=128):
        super().__init__()
        self.shared   = nn.Sequential(nn.Linear(embed_dim, 64), nn.GELU(), nn.Dropout(0.2))
        self.ret_head = nn.Linear(64, 3)
        self.dir_head = nn.Linear(64, 3)
        self.vol_head = nn.Linear(64, 1)

    def forward(self, x):
        h = self.shared(x)
        return {
            "returns":    self.ret_head(h),
            "direction":  self.dir_head(h),
            "volatility": self.vol_head(h),
        }


class FinanceCNNRAG(nn.Module):
    def __init__(self, embed_dim=128):
        super().__init__()
        self.embed_dim = embed_dim
        self.cnn    = CNNBranch(5, embed_dim)
        self.proj   = nn.Sequential(nn.Linear(768, embed_dim), nn.LayerNorm(embed_dim), nn.GELU())
        self.fusion = CrossAttentionFusion(embed_dim)
        self.heads  = OutputHeads(embed_dim)

    def forward(self, price_window, text_embeddings):
        cnn_emb    = self.cnn(price_window)
        rag_chunks = self.proj(text_embeddings)
        fused, attn = self.fusion(cnn_emb, rag_chunks)
        preds = self.heads(fused)
        preds["attention"] = attn
        return preds



# Global model + encoder (loaded once)


device    = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
cnn_model = FinanceCNNRAG(embed_dim=128).to(device).eval()

print("Loading FinBERT tokenizer + model...")
tokenizer   = BertTokenizer.from_pretrained("ProsusAI/finbert")
bert_model  = BertModel.from_pretrained("ProsusAI/finbert").to(device).eval()
print("Models ready.")


# Finance news corpus — curated sentences used
# as stand-in RAG documents (no API key needed)


FINANCE_CORPUS = [
    # Bullish signals
    "Company beat earnings estimates by a wide margin and raised full-year guidance.",
    "Revenue growth accelerated driven by strong enterprise demand and pricing power.",
    "Gross margins expanded significantly on operational efficiency improvements.",
    "Management announced a large share buyback program signaling confidence.",
    "The company reported record free cash flow generation this quarter.",
    "Analysts upgraded the stock citing improving fundamentals and market share gains.",
    "New product cycle driving upside to consensus revenue estimates.",
    "Strong consumer spending trends benefiting top-line growth momentum.",
    "Cost reduction initiatives expected to drive meaningful margin expansion.",
    "Institutional investors increased their positions in the latest 13F filings.",
    # Bearish signals
    "Company missed revenue expectations and lowered full-year guidance.",
    "Rising input costs and supply chain disruptions weighed on margins.",
    "Management cited macroeconomic headwinds and cautious consumer sentiment.",
    "Regulatory investigation announced creating near-term uncertainty.",
    "Elevated inventory levels may pressure pricing and near-term revenue.",
    "Competition intensifying in core markets with new entrants pricing aggressively.",
    "Debt levels increased substantially following a costly acquisition.",
    "CEO departure announced amid boardroom disagreements on strategy.",
    "Customer churn accelerated in the latest quarter amid pricing changes.",
    "The Federal Reserve signaling higher-for-longer rates pressuring valuations.",
    # Neutral / macro
    "Interest rate expectations shifted on latest CPI and jobs data.",
    "Sector rotation observed as investors move from growth to value stocks.",
    "Volatility increased ahead of earnings season across major indices.",
    "Options market pricing elevated implied volatility for the near term.",
    "Technical analysis suggests key support and resistance levels being tested.",
    "Market breadth narrowed with mega-cap stocks driving index performance.",
    "Currency headwinds expected to impact multinational revenue translation.",
    "Capital expenditure cycle expected to moderate after peak investment period.",
    "Dividend yield approaching historical highs relative to treasury yields.",
    "ESG concerns raised by activist investors regarding carbon emissions targets.",
]

# Pre-compute corpus embeddings
@torch.no_grad()
def encode_texts(texts: List[str]) -> torch.Tensor:
    enc = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt").to(device)
    out = bert_model(**enc)
    return out.last_hidden_state[:, 0, :]   # CLS tokens: (N, 768)

print("Pre-computing corpus embeddings...")
corpus_embeddings = encode_texts(FINANCE_CORPUS)  # (30, 768)
print("Corpus ready.")

# Build FAISS index
corpus_np   = corpus_embeddings.cpu().float().numpy()
norms       = np.linalg.norm(corpus_np, axis=1, keepdims=True) + 1e-9
corpus_norm = corpus_np / norms
faiss_index = faiss.IndexFlatIP(768)
faiss_index.add(corpus_norm)


# Helper functions


def fetch_ohlcv(ticker: str, window: int = 60) -> pd.DataFrame:
    end   = datetime.today()
    start = end - timedelta(days=window * 2)
    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
    return df.tail(window)

def normalise_window(arr: np.ndarray) -> np.ndarray:
    """Per-window z-score normalisation."""
    mean = arr.mean(axis=0)
    std  = arr.std(axis=0) + 1e-8
    return (arr - mean) / std


def retrieve_docs(query_text: str, top_k: int = 5):
    """Retrieve top-k relevant corpus docs via FAISS cosine search."""
    with torch.no_grad():
        q_emb = encode_texts([query_text])
    q_np  = q_emb.cpu().float().numpy()
    q_np  = q_np / (np.linalg.norm(q_np, axis=1, keepdims=True) + 1e-9)
    scores, indices = faiss_index.search(q_np, top_k)
    docs    = [FINANCE_CORPUS[i] for i in indices[0]]
    embs    = corpus_embeddings[indices[0]]   # (top_k, 768)
    return docs, embs, scores[0].tolist()


def compute_technicals(df: pd.DataFrame) -> dict:
    """Compute basic technical indicators from price data."""
    close = df["Close"].values.flatten()
    vol   = df["Volume"].values.flatten()

    # RSI (14)
    delta  = np.diff(close)
    gain   = np.where(delta > 0, delta, 0)
    loss   = np.where(delta < 0, -delta, 0)
    avg_g  = np.convolve(gain, np.ones(14)/14, mode="valid")[-1]
    avg_l  = np.convolve(loss, np.ones(14)/14, mode="valid")[-1]
    rs     = avg_g / (avg_l + 1e-9)
    rsi    = 100 - 100 / (1 + rs)

    # MACD
    ema12 = pd.Series(close).ewm(span=12).mean().values
    ema26 = pd.Series(close).ewm(span=26).mean().values
    macd  = ema12[-1] - ema26[-1]
    signal = pd.Series(ema12 - ema26).ewm(span=9).mean().values[-1]

    # Bollinger Bands
    sma20 = close[-20:].mean()
    std20 = close[-20:].std()
    bb_upper = sma20 + 2 * std20
    bb_lower = sma20 - 2 * std20
    bb_pct   = (close[-1] - bb_lower) / (bb_upper - bb_lower + 1e-9)

    # Volume trend
    vol_ma = vol[-10:].mean()
    vol_ratio = vol[-1] / (vol_ma + 1e-9)

    # 52-week high/low
    high52 = close.max()
    low52  = close.min()
    pct_from_high = (close[-1] - high52) / high52 * 100

    return {
        "rsi":            round(float(rsi), 2),
        "macd":           round(float(macd), 4),
        "macd_signal":    round(float(signal), 4),
        "bb_pct":         round(float(bb_pct), 3),
        "vol_ratio":      round(float(vol_ratio), 2),
        "high_52w":       round(float(high52), 2),
        "low_52w":        round(float(low52), 2),
        "pct_from_high":  round(float(pct_from_high), 2),
        "sma_20":         round(float(sma20), 2),
    }



# Response models


class PredictionResponse(BaseModel):
    ticker:         str
    timestamp:      str
    current_price:  float
    price_change:   float
    price_change_pct: float
    prediction: dict
    technicals: dict
    retrieved_docs: List[dict]
    confidence:     float
    signal:         str   # STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL


class HistoryResponse(BaseModel):
    ticker:  str
    dates:   List[str]
    ohlcv:   List[dict]



# Routes


@app.get("/")
def root():
    return {"status": "ok", "message": "Finance CNN+RAG API"}


@app.get("/tickers")
def get_tickers():
    return {"tickers": SUPPORTED_TICKERS}


@app.get("/history/{ticker}", response_model=HistoryResponse)
def get_history(ticker: str, days: int = 60):
    ticker = ticker.upper()
    if ticker not in SUPPORTED_TICKERS:
        raise HTTPException(404, f"Ticker {ticker} not supported")
    try:
        df = fetch_ohlcv(ticker, days)
    except Exception as e:
        raise HTTPException(500, str(e))

    records = []
    for _, row in df.iterrows():
        records.append({
            "open":   round(float(row["Open"]), 2),
            "high":   round(float(row["High"]), 2),
            "low":    round(float(row["Low"]), 2),
            "close":  round(float(row["Close"]), 2),
            "volume": int(row["Volume"]),
        })

    return HistoryResponse(
        ticker=ticker,
        dates=[str(d.date()) for d in df.index],
        ohlcv=records,
    )


@app.get("/predict/{ticker}")
def predict(ticker: str):
    ticker = ticker.upper()
    if ticker not in SUPPORTED_TICKERS:
        raise HTTPException(404, f"Ticker {ticker} not supported")

    # --- Fetch real price data ---
    try:
        df = fetch_ohlcv(ticker, window=30)
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch price data: {e}")

    if len(df) < 20:
        raise HTTPException(400, "Insufficient price history")

    # --- Compute price changes ---
    closes = df["Close"].values.flatten()
    current_price    = float(closes[-1])
    prev_price       = float(closes[-2])
    price_change     = round(current_price - prev_price, 2)
    price_change_pct = round((price_change / prev_price) * 100, 3)

    # --- Prepare CNN input ---
    ohlcv = df[["Open", "High", "Low", "Close", "Volume"]].values
    norm  = normalise_window(ohlcv)
    x     = torch.tensor(norm, dtype=torch.float32).unsqueeze(0).to(device)

    # --- RAG retrieval ---
    query = f"{ticker} stock price momentum earnings revenue outlook"
    docs, doc_embs, scores = retrieve_docs(query, top_k=5)
    rag_input = doc_embs.unsqueeze(0).to(device)   # (1, 5, 768)

    # --- Inference ---
    with torch.no_grad():
        preds = cnn_model(x, rag_input)

    ret_vals   = preds["returns"].squeeze().tolist()
    dir_logits = preds["direction"].squeeze()
    dir_probs  = F.softmax(dir_logits, dim=-1).tolist()
    vol_pred   = float(preds["volatility"].squeeze())
    attn_w     = preds["attention"].squeeze().tolist()

    # Direction: 0=Down, 1=Flat, 2=Up
    direction_labels = ["DOWN", "FLAT", "UP"]
    direction_idx    = int(torch.argmax(dir_logits).item())
    direction        = direction_labels[direction_idx]

    # Composite signal
    up_prob   = dir_probs[2]
    down_prob = dir_probs[0]
    ret_5d    = ret_vals[1]

    if up_prob > 0.65 and ret_5d > 0.01:
        signal = "STRONG_BUY"
    elif up_prob > 0.5 and ret_5d > 0:
        signal = "BUY"
    elif down_prob > 0.65 and ret_5d < -0.01:
        signal = "STRONG_SELL"
    elif down_prob > 0.5 and ret_5d < 0:
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = round(float(max(up_prob, down_prob)) * 100, 1)

    # Technicals
    technicals = compute_technicals(df)

    # Format retrieved docs
    doc_list = [
        {
            "text":      docs[i],
            "score":     round(float(scores[i]), 3),
            "attention": round(float(attn_w[i]) if i < len(attn_w) else 0, 4),
        }
        for i in range(len(docs))
    ]

    return {
        "ticker":           ticker,
        "timestamp":        datetime.utcnow().isoformat() + "Z",
        "current_price":    round(current_price, 2),
        "price_change":     price_change,
        "price_change_pct": price_change_pct,
        "prediction": {
            "direction":      direction,
            "direction_probs": {
                "down": round(dir_probs[0] * 100, 1),
                "flat": round(dir_probs[1] * 100, 1),
                "up":   round(dir_probs[2] * 100, 1),
            },
            "return_1d":  round(ret_vals[0] * 100, 3),
            "return_5d":  round(ret_vals[1] * 100, 3),
            "return_20d": round(ret_vals[2] * 100, 3),
            "volatility": round(math.exp(vol_pred) * 100, 2),
        },
        "technicals":    technicals,
        "retrieved_docs": doc_list,
        "confidence":    confidence,
        "signal":        signal,
    }


@app.get("/sentiment/{ticker}")
def get_sentiment(ticker: str):
    ticker = ticker.upper()
    query  = f"{ticker} earnings revenue outlook growth risk"
    docs, _, scores = retrieve_docs(query, top_k=8)
    return {
        "ticker": ticker,
        "documents": [{"text": d, "score": round(float(s), 3)} for d, s in zip(docs, scores)],
    }



# WebSocket — live price stream


@app.websocket("/stream/{ticker}")
async def stream_price(websocket: WebSocket, ticker: str):
    await websocket.accept()
    ticker = ticker.upper()
    try:
        df    = fetch_ohlcv(ticker, window=5)
        price = float(df["Close"].values[-1])
        while True:
            # Simulate live tick with small random walk
            price += price * np.random.normal(0, 0.0008)
            await websocket.send_json({
                "ticker":    ticker,
                "price":     round(price, 2),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass
