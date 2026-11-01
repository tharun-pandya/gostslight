from fastapi import APIRouter, HTTPException, Depends, Response
from ..models.schemas import ExportIn
from ..services import vault_service as vs, export_service as ex
from .deps import require_key

r = APIRouter(prefix="/api/v1/exports", tags=["exports"])

def _need_confirm(b):
    if not b.confirm_plaintext: raise HTTPException(400, "Confirm that you understand this export contains private memories in plain text")

@r.post("/markdown")
def md(b: ExportIn, key: bytes = Depends(require_key)):
    _need_confirm(b)
    if not b.story_id: raise HTTPException(400, "story_id required")
    try: text, name = ex.story_markdown(key, b.story_id)
    except KeyError: raise HTTPException(404, "Story not found")
    return Response(text, media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="{name}"'})

@r.post("/collection")
def col(b: ExportIn, key: bytes = Depends(require_key)):
    _need_confirm(b)
    if not b.collection_id: raise HTTPException(400, "collection_id required")
    try: h = ex.collection_html(key, b.collection_id)
    except KeyError: raise HTTPException(404, "Collection not found")
    return Response(h, media_type="text/html", headers={"Content-Disposition": 'attachment; filename="remembrance.html"'})

@r.post("/encrypted")
def encrypted(key: bytes = Depends(require_key)):
    return Response(ex.encrypted_bundle(key), media_type="application/octet-stream",
                    headers={"Content-Disposition": 'attachment; filename="ghostlight-archive.glar"'})
