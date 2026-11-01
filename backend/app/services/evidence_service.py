import re
from ..models.schemas import MemoryCandidate

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", s.casefold(), flags=re.UNICODE)).strip()

def validate_candidates(cands: list[MemoryCandidate], segments: list[dict]) -> tuple[list[dict], list[dict]]:
    """Keep only candidates whose every evidence quote literally appears in the cited,
    non-redacted segment. Timestamps are overwritten with the real segment times."""
    by_id = {s["id"]: s for s in segments if not s.get("redacted")}
    ok, rejected = [], []
    for c in cands:
        if not c.evidence: rejected.append({"title": c.title, "reason": "missing evidence"}); continue
        fixed, bad = [], None
        for e in c.evidence:
            seg = by_id.get(e.segment_id)
            if not seg: bad = "unknown segment"; break
            q = norm(e.exact_quote)
            if len(q) < 3 or q not in norm(seg["text"]): bad = "quote not found in segment"; break
            fixed.append({"segment_id": seg["id"], "start_seconds": seg["start"], "end_seconds": seg["end"],
                          "exact_quote": e.exact_quote.strip()})
        if bad: rejected.append({"title": c.title, "reason": bad}); continue
        d = c.model_dump(mode="json"); d["evidence"] = fixed; ok.append(d)
    return ok, rejected
