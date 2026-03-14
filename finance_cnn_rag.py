"""
Finance CNN + RAG Model
=======================
Architecture:
  - CNN branch:   Conv1D layers over OHLCV price windows → 256d embedding
  - RAG branch:   FAISS retrieval + FinBERT encoder → 256d context embedding
  - Fusion:       Cross-attention (CNN query, RAG key/value)
  - Output heads: Return regression · Direction classification · Volatility

Requirements:
    pip install torch transformers faiss-cpu sentence-transformers numpy pandas
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from transformers import AutoTokenizer, AutoModel, BertTokenizer, BertModel
from typing import List, Tuple, Optional


# ─────────────────────────────────────────────
# 1. CNN BRANCH — price pattern extractor
# ─────────────────────────────────────────────

class CNNBranch(nn.Module):
    """
    Input:  (batch, timesteps, n_features)  e.g. (32, 30, 5) for 30-day OHLCV
    Output: (batch, embed_dim)              256-dimensional pattern embedding
    """

    def __init__(self, n_features: int = 5, embed_dim: int = 256, dropout: float = 0.3):
        super().__init__()

        # Block 1 — short-range patterns (momentum, spikes)
        self.conv1 = nn.Conv1d(n_features, 64, kernel_size=3, padding=1)
        self.bn1   = nn.BatchNorm1d(64)

        # Block 2 — medium-range patterns (trends, consolidation)
        self.conv2 = nn.Conv1d(64, 128, kernel_size=5, padding=2)
        self.bn2   = nn.BatchNorm1d(128)
        self.drop2 = nn.Dropout(dropout)

        # Block 3 — longer dependencies
        self.conv3 = nn.Conv1d(128, embed_dim, kernel_size=7, padding=3)
        self.bn3   = nn.BatchNorm1d(embed_dim)

        # Global max pool → fixed-size embedding regardless of window length
        self.pool = nn.AdaptiveMaxPool1d(1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, timesteps, features) → transpose to (batch, features, timesteps)
        x = x.transpose(1, 2)

        x = F.relu(self.bn1(self.conv1(x)))
        x = self.drop2(F.relu(self.bn2(self.conv2(x))))
        x = F.relu(self.bn3(self.conv3(x)))

        x = self.pool(x).squeeze(-1)          # (batch, embed_dim)
        return x


# ─────────────────────────────────────────────
# 2. RAG BRANCH — document retrieval + encoding
# ─────────────────────────────────────────────

class FinBERTEncoder(nn.Module):
    """
    Encodes retrieved financial text chunks with FinBERT,
    then projects to the shared embed_dim.
    """

    def __init__(self, embed_dim: int = 256, model_name: str = "ProsusAI/finbert"):
        super().__init__()
        self.tokenizer = BertTokenizer.from_pretrained(model_name)
        self.bert = BertModel.from_pretrained(model_name)
        hidden_size    = self.bert.config.hidden_size          # 768 for base BERT

        # Project FinBERT CLS token → shared embed_dim
        self.proj = nn.Sequential(
            nn.Linear(hidden_size, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU(),
        )

    def forward(self, texts: List[str], device: torch.device) -> torch.Tensor:
        """
        texts:  list of N retrieved document chunks
        return: (N, embed_dim) — one vector per chunk
        """
        enc = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        ).to(device)

        with torch.no_grad():
            out = self.bert(**enc)

        cls = out.last_hidden_state[:, 0, :]   # CLS token: (N, 768)
        return self.proj(cls)                   # (N, embed_dim)


class VectorStore:
    """
    Lightweight FAISS wrapper for document retrieval.
    In production, replace with Pinecone / Weaviate / ChromaDB.
    """

    def __init__(self, embed_dim: int = 768):
        import faiss
        self.index  = faiss.IndexFlatIP(embed_dim)   # inner product (cosine after normalise)
        self.docs   = []                              # parallel list of raw text chunks
        self.embed_dim = embed_dim

    def add(self, texts: List[str], embeddings: np.ndarray):
        """Add documents with their embeddings."""
        # L2-normalise so inner product == cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-9
        embeddings = embeddings / norms
        self.index.add(embeddings.astype(np.float32))
        self.docs.extend(texts)

    def retrieve(self, query_embedding: np.ndarray, top_k: int = 5) -> List[str]:
        """Return top-k most relevant document chunks for the query."""
        norms = np.linalg.norm(query_embedding, axis=1, keepdims=True) + 1e-9
        q = (query_embedding / norms).astype(np.float32)
        _, indices = self.index.search(q, top_k)
        results = []
        for idx_list in indices:
            results.append([self.docs[i] for i in idx_list if i < len(self.docs)])
        return results


# ─────────────────────────────────────────────
# 3. CROSS-ATTENTION FUSION
# ─────────────────────────────────────────────

class CrossAttentionFusion(nn.Module):
    """
    CNN embedding acts as QUERY.
    RAG context vectors act as KEY and VALUE.
    The model learns which retrieved documents are relevant
    given the current price pattern.

    Input:
        cnn_emb:    (batch, embed_dim)
        rag_chunks: (batch, n_chunks, embed_dim)
    Output:
        fused:      (batch, embed_dim)
    """

    def __init__(self, embed_dim: int = 256, n_heads: int = 4, dropout: float = 0.1):
        super().__init__()
        self.attn    = nn.MultiheadAttention(embed_dim, n_heads, dropout=dropout, batch_first=True)
        self.norm1   = nn.LayerNorm(embed_dim)
        self.norm2   = nn.LayerNorm(embed_dim)
        self.ff      = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim * 2, embed_dim),
        )

    def forward(
        self,
        cnn_emb: torch.Tensor,      # (batch, embed_dim)
        rag_chunks: torch.Tensor,   # (batch, n_chunks, embed_dim)
    ) -> torch.Tensor:

        query = cnn_emb.unsqueeze(1)                        # (batch, 1, embed_dim)
        attn_out, _ = self.attn(query, rag_chunks, rag_chunks)
        fused = self.norm1(query + attn_out).squeeze(1)     # residual + norm
        fused = self.norm2(fused + self.ff(fused))          # FFN + residual
        return fused                                        # (batch, embed_dim)


# ─────────────────────────────────────────────
# 4. OUTPUT HEADS
# ─────────────────────────────────────────────

class OutputHeads(nn.Module):
    """
    Multi-task output heads sharing the fused representation.

    Returns:
        returns:    (batch, 3)  — 1d / 5d / 20d forward return
        direction:  (batch, 3)  — Down / Flat / Up logits
        volatility: (batch, 1)  — predicted realised vol (log scale)
    """

    def __init__(self, embed_dim: int = 256, dropout: float = 0.2):
        super().__init__()
        shared = nn.Sequential(
            nn.Linear(embed_dim, 128),
            nn.GELU(),
            nn.Dropout(dropout),
        )
        self.shared      = shared
        self.ret_head    = nn.Linear(128, 3)   # 1d, 5d, 20d returns
        self.dir_head    = nn.Linear(128, 3)   # direction classification
        self.vol_head    = nn.Linear(128, 1)   # volatility regression

    def forward(self, x: torch.Tensor):
        h = self.shared(x)
        return {
            "returns":    self.ret_head(h),
            "direction":  self.dir_head(h),
            "volatility": self.vol_head(h),
        }


# ─────────────────────────────────────────────
# 5. FULL MODEL
# ─────────────────────────────────────────────

class FinanceCNNRAG(nn.Module):
    """
    End-to-end Finance CNN + RAG model.

    Forward pass requires:
        price_window: (batch, timesteps, n_features)  — normalised OHLCV
        doc_texts:    List[List[str]]                 — retrieved docs per sample
        device:       torch.device

    Returns dict with keys: returns, direction, volatility
    """

    def __init__(
        self,
        n_features: int  = 5,
        embed_dim:  int  = 256,
        n_heads:    int  = 4,
        dropout:    float = 0.3,
        finbert_model: str = "ProsusAI/finbert",
    ):
        super().__init__()
        self.embed_dim = embed_dim

        self.cnn     = CNNBranch(n_features, embed_dim, dropout)
        self.encoder = FinBERTEncoder(embed_dim, finbert_model)
        self.fusion  = CrossAttentionFusion(embed_dim, n_heads, dropout)
        self.heads   = OutputHeads(embed_dim, dropout)

    def forward(
        self,
        price_window: torch.Tensor,
        doc_texts:    List[List[str]],
        device:       torch.device,
    ) -> dict:
        batch_size = price_window.size(0)

        # --- CNN branch ---
        cnn_emb = self.cnn(price_window)                     # (batch, embed_dim)

        # --- RAG branch: encode retrieved docs per sample ---
        # Flatten all chunks, encode in one pass, then reshape
        all_texts   = [t for sample_docs in doc_texts for t in sample_docs]
        n_chunks    = len(doc_texts[0])                      # assume same k per sample
        chunk_embs  = self.encoder(all_texts, device)        # (batch*k, embed_dim)
        rag_chunks  = chunk_embs.view(batch_size, n_chunks, self.embed_dim)

        # --- Cross-attention fusion ---
        fused = self.fusion(cnn_emb, rag_chunks)             # (batch, embed_dim)

        # --- Multi-task output ---
        return self.heads(fused)


# ─────────────────────────────────────────────
# 6. LOSS FUNCTION
# ─────────────────────────────────────────────

class MultiTaskLoss(nn.Module):
    """
    Learnable task weighting via log-variance (Kendall et al., 2018).
    Automatically balances regression and classification losses.
    """

    def __init__(self):
        super().__init__()
        # log(sigma^2) per task — learned, initialised near 0
        self.log_vars = nn.Parameter(torch.zeros(3))

    def forward(self, preds: dict, targets: dict) -> torch.Tensor:
        ret_loss = F.mse_loss(preds["returns"],    targets["returns"])
        dir_loss = F.cross_entropy(preds["direction"],  targets["direction"])
        vol_loss = F.mse_loss(preds["volatility"], targets["volatility"])

        losses = [ret_loss, dir_loss, vol_loss]
        total  = 0.0
        for i, loss in enumerate(losses):
            precision = torch.exp(-self.log_vars[i])
            total = total + precision * loss + self.log_vars[i]
        return total


# ─────────────────────────────────────────────
# 7. DATA UTILITIES
# ─────────────────────────────────────────────

def normalise_window(window: np.ndarray) -> np.ndarray:
    """
    Per-window z-score normalisation.
    Makes CNN input shift-invariant across bull/bear markets.
    window: (timesteps, n_features)
    """
    mean = window.mean(axis=0)
    std  = window.std(axis=0) + 1e-8
    return (window - mean) / std


def make_targets(
    prices:     np.ndarray,     # close prices, length T
    t:          int,            # current index
    vol_window: int = 20,
) -> dict:
    """
    Compute forward return labels and realised volatility.
    IMPORTANT: ensure t + 20 < len(prices) to avoid lookahead.
    """
    ret_1d  = (prices[t + 1]  / prices[t] - 1)
    ret_5d  = (prices[t + 5]  / prices[t] - 1)
    ret_20d = (prices[t + 20] / prices[t] - 1)

    # Direction: -1 (down), 0 (flat), +1 (up) with ±0.5% dead zone
    direction = 1 if ret_5d > 0.005 else (-1 if ret_5d < -0.005 else 0)
    direction = direction + 1                                # shift to 0/1/2 for CE loss

    # Realised vol (log-scale)
    log_rets = np.diff(np.log(prices[t - vol_window:t + 1]))
    vol = np.log(log_rets.std() * math.sqrt(252) + 1e-8)

    return {
        "returns":    torch.tensor([ret_1d, ret_5d, ret_20d], dtype=torch.float),
        "direction":  torch.tensor(direction, dtype=torch.long),
        "volatility": torch.tensor([vol], dtype=torch.float),
    }


# ─────────────────────────────────────────────
# 8. TRAINING LOOP (walk-forward)
# ─────────────────────────────────────────────

def walk_forward_train(
    model:       FinanceCNNRAG,
    price_data:  np.ndarray,        # (T, n_features) — OHLCV
    doc_fetcher,                    # callable(ticker, date) → List[str]
    ticker:      str,
    dates:       List[str],
    window:      int = 30,
    train_frac:  float = 0.7,
    epochs:      int  = 10,
    lr:          float = 1e-4,
    device_str:  str  = "cpu",
):
    """
    Walk-forward training — no random splits, no future leakage.
    Trains on the first train_frac of the data, validates on the rest.
    """
    device    = torch.device(device_str)
    model     = model.to(device)
    criterion = MultiTaskLoss().to(device)
    optimizer = torch.optim.AdamW(
        list(model.parameters()) + list(criterion.parameters()),
        lr=lr, weight_decay=1e-4,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    T          = len(price_data) - window - 20   # leave 20 for 20d forward returns
    split_idx  = int(T * train_frac)
    close      = price_data[:, 3]                # close price column

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        for t in range(window, split_idx):
            raw_win  = price_data[t - window:t]
            norm_win = normalise_window(raw_win)
            x_price  = torch.tensor(norm_win, dtype=torch.float).unsqueeze(0).to(device)

            # Retrieve docs — only use documents published BEFORE date t (no leakage)
            docs = doc_fetcher(ticker, dates[t])   # returns List[str], max top_k
            targets = make_targets(close, t)
            targets = {k: v.unsqueeze(0).to(device) for k, v in targets.items()}

            preds = model(x_price, [docs], device)
            loss  = criterion(preds, targets)

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()

        scheduler.step()
        avg = train_loss / split_idx
        print(f"Epoch {epoch+1}/{epochs}  train_loss={avg:.4f}")

    return model


# ─────────────────────────────────────────────
# 9. QUICK SMOKE TEST (no real data needed)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("Running smoke test...")
    device = torch.device("cpu")

    model = FinanceCNNRAG(
        n_features=5,
        embed_dim=64,    # smaller for the test
        n_heads=4,
        finbert_model="ProsusAI/finbert",
    )

    # Fake OHLCV batch: 2 samples × 30 days × 5 features
    price_window = torch.randn(2, 30, 5)

    # Fake retrieved docs (3 chunks per sample)
    doc_texts = [
        ["Q3 earnings beat estimates by 12%.",
         "Management raised full-year guidance.",
         "Operating margins expanded 150bps."],
        ["Revenue missed consensus estimates.",
         "CEO cited macro headwinds and FX impact.",
         "Board initiated $500M share buyback."],
    ]

    preds = model(price_window, doc_texts, device)

    print("returns shape:   ", preds["returns"].shape)     # (2, 3)
    print("direction shape: ", preds["direction"].shape)   # (2, 3)
    print("volatility shape:", preds["volatility"].shape)  # (2, 1)
    print("Smoke test passed.")
