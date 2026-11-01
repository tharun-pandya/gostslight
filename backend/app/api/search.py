from fastapi import APIRouter, Depends
from ..models.schemas import SearchIn
from ..services import retrieval_service as rs
from .deps import require_key

r = APIRouter(prefix="/api/v1", tags=["search"])

@r.post("/search")
def search(b: SearchIn, key: bytes = Depends(require_key)):
    return {"results": rs.search(key, b.query, min(b.limit, 20))}

@r.post("/ask")
def ask(b: SearchIn, key: bytes = Depends(require_key)):
    return rs.ask(key, b.query)
