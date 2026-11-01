from fastapi import APIRouter, HTTPException, Depends
from ..services import vault_service as vs
from ..services.evidence_service import norm
from .deps import require_key

r = APIRouter(prefix="/api/v1", tags=["memories"])

@r.get("/stories/{sid}/memories")
def story_memories(sid: str, key: bytes = Depends(require_key)):
    return vs.list_kind(key, "memory", sid)

@r.get("/memories")
def archive(category: str | None = None, person: str | None = None, place: str | None = None, story_id: str | None = None,
            language: str | None = None, year_from: int | None = None, year_to: int | None = None,
            offset: int = 0, limit: int = 50, key: bytes = Depends(require_key)):
    stories = {s["id"]: s for s in vs.list_kind(key, "story")}
    out = []
    for m in vs.list_kind(key, "memory"):
        st = stories.get(m["story_id"])
        if m["status"] != "approved" or not st or not st.get("consent"): continue
        yr = int(st["recorded_on"][:4]) if st.get("recorded_on") and st["recorded_on"][:4].isdigit() else None
        if category and m["category"] != category: continue
        if story_id and m["story_id"] != story_id: continue
        if person and person.casefold() not in (st.get("storyteller", "") + " " + m["title"]).casefold(): continue
        if place and place.casefold() not in " ".join(st.get("places", [])).casefold() + " " + m["description"].casefold(): continue
        if language and st.get("language") != language and st.get("detected_language") != language: continue
        if year_from and (yr is None or yr < year_from): continue
        if year_to and (yr is None or yr > year_to): continue
        out.append({**m, "story_title": st["title"], "storyteller": st.get("storyteller"), "recorded_on": st.get("recorded_on")})
    return {"total": len(out), "items": out[offset: offset + min(limit, 100)]}

def _review(mid, key, status):
    m = vs.get(key, mid, "memory")
    if not m: raise HTTPException(404, "Memory not found")
    if status == "approved":  # re-verify evidence against the current (possibly edited) transcript
        t = vs.get(key, f"tr_{m['story_id']}", "transcript") or {"segments": []}
        seg = {s["id"]: s for s in t["segments"]}
        for e in m["evidence"]:
            s = seg.get(e["segment_id"])
            if not s or s.get("redacted") or norm(e["exact_quote"]) not in norm(s["text"]):
                raise HTTPException(409, "Evidence no longer matches the transcript; re-run extraction or edit the memory")
    m["status"] = status; m["reviewed"] = vs.now()
    vs.put(key, "memory", mid, m, m["story_id"]); return {"id": mid, "status": status}

@r.patch("/memories/{mid}/approve")
def approve(mid: str, key: bytes = Depends(require_key)): return _review(mid, key, "approved")

@r.patch("/memories/{mid}/reject")
def reject(mid: str, key: bytes = Depends(require_key)): return _review(mid, key, "rejected")

@r.get("/timeline")
def timeline(key: bytes = Depends(require_key)):
    ms = archive(key=key, limit=100)["items"]
    dated = sorted([m for m in ms if m["recorded_on"]], key=lambda m: m["recorded_on"])
    return {"dated": dated, "undated": [m for m in ms if not m["recorded_on"]]}

@r.get("/people")
def people(key: bytes = Depends(require_key)):
    names = {}
    for s in vs.list_kind(key, "story"):
        if s.get("storyteller") and s.get("consent"): names.setdefault(s["storyteller"], {"name": s["storyteller"], "stories": 0, "mentioned": 0})["stories"] += 1
    for m in vs.list_kind(key, "memory"):
        if m["status"] == "approved" and m["category"] == "PERSON":
            names.setdefault(m["title"], {"name": m["title"], "stories": 0, "mentioned": 0})["mentioned"] += 1
    return list(names.values())
