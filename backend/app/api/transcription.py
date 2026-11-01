from fastapi import APIRouter, HTTPException, Depends
from ..models.schemas import TranscriptIn
from ..services import vault_service as vs
from .deps import require_key

r = APIRouter(prefix="/api/v1", tags=["transcription"])

@r.put("/stories/{sid}/transcript")
def put_tr(sid: str, b: TranscriptIn, key: bytes = Depends(require_key)):
    t = vs.get(key, f"tr_{sid}", "transcript")
    if not t: raise HTTPException(404, "No transcript yet")
    edits = {s.id: s for s in b.segments}
    newly_redacted = set()
    for seg in t["segments"]:
        e = edits.get(seg["id"])
        if not e: continue
        seg["text"] = e.text; seg["speaker"] = e.speaker   # original_text stays untouched
        if e.redacted and not seg["redacted"]: newly_redacted.add(seg["id"])
        seg["redacted"] = e.redacted
    t["edited"] = True
    vs.put(key, "transcript", f"tr_{sid}", t, sid)
    if newly_redacted:  # drop memories that quote now-redacted text
        for m in vs.list_kind(key, "memory", sid):
            if any(e["segment_id"] in newly_redacted for e in m["evidence"]): vs.delete_obj(m["id"])
    return t
