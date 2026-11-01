import json
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from pydantic import BaseModel
from ..config import settings
from ..security.upload_validation import validate_audio, UploadError
from ..services import vault_service as vs, jobs, transcription_service, memory_extraction
from .deps import require_key

r = APIRouter(prefix="/api/v1", tags=["stories"])
csv = lambda s: [x.strip() for x in s.split(",") if x.strip()]

@r.post("/stories")
async def create_story(title: str = Form(..., max_length=160), storyteller: str = Form("", max_length=100), recorded_on: str = Form(""),
                       places: str = Form(""), event: str = Form(""), tags: str = Form(""), language: str = Form("auto"),
                       consent: bool = Form(...), audio: UploadFile = File(...), key: bytes = Depends(require_key)):
    if not consent: raise HTTPException(400, "Consent confirmation is required")
    data = await audio.read(settings.max_upload_bytes + 1)
    try: info = validate_audio(data)
    except UploadError as e: raise HTTPException(400, str(e))
    sid = vs.new_id("story_")
    vs.put_audio(key, sid, data)
    st = {"title": title, "storyteller": storyteller, "recorded_on": recorded_on or None, "places": csv(places), "event": event,
          "tags": csv(tags), "language": language, "consent": True, "format": info["format"], "duration": info["duration"],
          "status": "imported", "created": vs.now()}
    vs.put(key, "story", sid, st)
    return {"id": sid, **st}

@r.get("/stories")
def list_stories(offset: int = 0, limit: int = 50, key: bytes = Depends(require_key)):
    rows = sorted(vs.list_kind(key, "story"), key=lambda s: s["created"], reverse=True)
    return {"total": len(rows), "items": rows[offset: offset + min(limit, 100)]}

@r.get("/stories/{sid}")
def get_story(sid: str, key: bytes = Depends(require_key)):
    s = vs.get(key, sid, "story")
    if not s: raise HTTPException(404, "Story not found")
    return {"id": sid, **s}

@r.get("/stories/{sid}/audio")
def get_audio(sid: str, key: bytes = Depends(require_key)):
    s = vs.get(key, sid, "story")
    if not s: raise HTTPException(404, "Story not found")
    mime = {"wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg", "flac": "audio/flac", "webm": "audio/webm", "m4a": "audio/mp4"}[s["format"]]
    return Response(vs.get_audio(key, sid), media_type=mime, headers={"Cache-Control": "no-store"})

class ConsentIn(BaseModel): consent: bool

@r.patch("/stories/{sid}/consent")
def set_consent(sid: str, b: ConsentIn, key: bytes = Depends(require_key)):
    s = vs.get(key, sid, "story")
    if not s: raise HTTPException(404, "Story not found")
    s["consent"] = b.consent; vs.put(key, "story", sid, s)
    return {"id": sid, "consent": b.consent}  # withdrawn stories are excluded from search/ask/export

@r.delete("/stories/{sid}")
def delete_story(sid: str, key: bytes = Depends(require_key)):
    if not vs.get(key, sid, "story"): raise HTTPException(404, "Story not found")
    vs.delete_story_objects(sid)
    return {"deleted": True}

@r.post("/stories/{sid}/transcribe")
def transcribe(sid: str, key: bytes = Depends(require_key)):
    if not vs.get(key, sid, "story"): raise HTTPException(404, "Story not found")
    try: j = jobs.submit(key, "transcribe", sid, lambda p: transcription_service.transcribe_story(key, sid, p))
    except jobs.Busy as e: raise HTTPException(429, str(e))
    return j

@r.post("/stories/{sid}/extract")
def extract(sid: str, key: bytes = Depends(require_key)):
    if not vs.get(key, sid, "story"): raise HTTPException(404, "Story not found")
    try: j = jobs.submit(key, "extract", sid, lambda p: memory_extraction.extract(key, sid, p))
    except jobs.Busy as e: raise HTTPException(429, str(e))
    return j

@r.get("/jobs/{job_id}")
def job(job_id: str, key: bytes = Depends(require_key)):
    j = vs.get(key, job_id, "job")
    if not j: raise HTTPException(404, "Job not found")
    return {"id": job_id, **j}

@r.get("/stories/{sid}/transcript")
def get_tr(sid: str, key: bytes = Depends(require_key)):
    t = vs.get(key, f"tr_{sid}", "transcript")
    if not t: raise HTTPException(404, "No transcript yet")
    return t
