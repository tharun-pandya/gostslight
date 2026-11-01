from fastapi import APIRouter, HTTPException, Depends
from ..models.schemas import CollectionIn
from ..services import vault_service as vs
from .deps import require_key

r = APIRouter(prefix="/api/v1", tags=["collections"])

@r.get("/collections")
def list_c(key: bytes = Depends(require_key)): return vs.list_kind(key, "collection")

@r.post("/collections")
def create_c(b: CollectionIn, key: bytes = Depends(require_key)):
    for mid in b.memory_ids:
        m = vs.get(key, mid, "memory")
        if not m or m["status"] != "approved": raise HTTPException(400, "Only approved memories can be added")
    cid = vs.new_id("col_"); d = {"name": b.name, "memory_ids": b.memory_ids, "note": b.note, "created": vs.now()}
    vs.put(key, "collection", cid, d); return {"id": cid, **d}
