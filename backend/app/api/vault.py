import time
from fastapi import APIRouter, HTTPException, Depends
from ..config import settings
from ..models.schemas import VaultCreate, VaultUnlock
from ..security.sessions import sessions
from ..services import vault_service as vs, jobs
from .deps import require_key

r = APIRouter(prefix="/api/v1/vault", tags=["vault"])

@r.post("/create")
def create(b: VaultCreate):
    try: tok = vs.create(b.name, b.passphrase)
    except vs.VaultError as e: raise HTTPException(409, str(e))
    return {"session": tok, "name": b.name}

_fails = 0; _blocked_until = 0.0  # in-memory brute-force brake (Argon2id cost is the primary defence)

@r.post("/unlock")
def unlock(b: VaultUnlock):
    global _fails, _blocked_until
    wait = _blocked_until - time.monotonic()
    if wait > 0: raise HTTPException(429, f"Too many failed attempts. Try again in {int(wait) + 1} seconds.")
    try: tok = vs.unlock(b.passphrase)
    except vs.VaultError as e:
        _fails += 1
        if _fails >= 5: _blocked_until = time.monotonic() + min(300, 15 * 2 ** (_fails - 5))
        raise HTTPException(401, str(e))
    _fails = 0
    jobs.recover_interrupted(sessions.key)
    return {"session": tok, "name": vs.vault_name(sessions.key)}

@r.post("/lock")
def lock(): sessions.lock(); return {"locked": True}

@r.get("/status")
def status():
    return {"exists": vs.exists(), "unlocked": sessions.unlocked, "demo_mode": settings.demo_mode,
            "idle_lock_seconds": settings.idle_lock_s}

@r.delete("")
def delete(confirm: bool = False, key: bytes = Depends(require_key)):
    if not confirm: raise HTTPException(400, "Pass confirm=true to delete the entire vault")
    vs.delete_all(); return {"deleted": True, "note": "Files were removed and the key discarded. Physical erasure on SSDs cannot be guaranteed; the data was encrypted."}
