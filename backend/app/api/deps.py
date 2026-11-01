from fastapi import Header, HTTPException
from ..security.sessions import sessions

def require_key(x_session: str | None = Header(default=None)) -> bytes:
    k = sessions.get_key(x_session)
    if k is None: raise HTTPException(401, "Vault is locked")
    return k
