import secrets, time, threading
from ..config import settings

class SessionStore:
    """Single short-lived in-memory session; key material never touches disk."""
    def __init__(self): self._lock = threading.Lock(); self.clear()
    def clear(self): self.token = None; self.key = None; self.last = 0.0
    def open(self, key: bytes) -> str:
        with self._lock:
            self.token = secrets.token_urlsafe(32); self.key = key; self.last = time.monotonic()
            return self.token
    def get_key(self, token: str | None) -> bytes | None:
        with self._lock:
            if not token or not self.token or not secrets.compare_digest(token, self.token): return None
            if time.monotonic() - self.last > settings.idle_lock_s:
                self.clear(); return None
            self.last = time.monotonic(); return self.key
    @property
    def unlocked(self): return self.key is not None and time.monotonic() - self.last <= settings.idle_lock_s
    def lock(self):
        with self._lock: self.clear()

sessions = SessionStore()
