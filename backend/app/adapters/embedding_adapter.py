"""multilingual-e5-small via sentence-transformers. Optional: callers fall back to lexical search."""
import threading
import numpy as np
from ..config import settings

_model = None; _lock = threading.Lock(); _failed = False

def _load():
    global _model, _failed
    if _failed or not settings.use_embeddings: return None
    with _lock:
        if _model is None:
            try:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer(settings.embedding_model, device="cpu", local_files_only=True)
            except Exception:
                _failed = True; return None
    return _model

def status() -> dict:
    m = _load()
    return {"ready": m is not None, "detail": "loaded" if m else "unavailable - lexical search fallback in use"}

def embed(texts: list[str], kind: str) -> np.ndarray | None:
    """kind: 'query' or 'passage' (required e5 prefixes)."""
    m = _load()
    if m is None or not texts: return None
    return np.asarray(m.encode([f"{kind}: {t}" for t in texts], normalize_embeddings=True), dtype=np.float32)
