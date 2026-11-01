import base64, html, json
from . import vault_service as vs
from ..security import encryption as enc
from ..security.upload_validation import safe_filename

def fmt(t): return f"{int(t)//60:02d}:{int(t)%60:02d}"

def story_markdown(key, story_id) -> tuple[str, str]:
    st = vs.get(key, story_id, "story"); tr = vs.get(key, f"tr_{story_id}", "transcript")
    if not st: raise KeyError("story")
    L = [f"# {st['title']}", "", f"- Storyteller: {st.get('storyteller') or 'Unknown'}", f"- Recorded: {st.get('recorded_on') or 'Date not provided'}",
         f"- Places: {', '.join(st.get('places', [])) or '-'}", f"- Language: {st.get('language') or 'auto'}", "", "## Transcript", ""]
    for s in (tr or {"segments": []})["segments"]:
        L.append(f"**[{fmt(s['start'])}-{fmt(s['end'])}]** " + ("*[redacted]*" if s.get("redacted") else s["text"]))
    L += ["", "## Approved memories", ""]
    for m in vs.list_kind(key, "memory", story_id):
        if m["status"] != "approved": continue
        e = m["evidence"][0]
        L += [f"### {m['title']} ({m['category']})", m["description"], f"> \"{e['exact_quote']}\" ({fmt(e['start_seconds'])}-{fmt(e['end_seconds'])})", ""]
    L += ["---", "Exported from Ghostlight. Preserved, not recreated.", f"Manifest: ghostlight-export v1"]
    return "\n".join(L), safe_filename(st["title"]) + ".md"

def collection_html(key, cid) -> str:
    c = vs.get(key, cid, "collection")
    if not c: raise KeyError("collection")
    cards = []
    for mid in c["memory_ids"]:
        m = vs.get(key, mid, "memory")
        if not m or m["status"] != "approved": continue
        st = vs.get(key, m["story_id"], "story") or {}
        e = m["evidence"][0]
        cards.append(f"<article><h3>{html.escape(m['title'])}</h3><p>{html.escape(m['description'])}</p>"
                     f"<blockquote>&ldquo;{html.escape(e['exact_quote'])}&rdquo;</blockquote>"
                     f"<small>{html.escape(st.get('title',''))} &middot; {fmt(e['start_seconds'])}-{fmt(e['end_seconds'])}</small></article>")
    return ("<!doctype html><meta charset=utf-8><title>%s</title><style>body{background:#1a1a1f;color:#f6efe0;font-family:Georgia,serif;max-width:760px;margin:2rem auto;padding:1rem}"
            "article{border:1px solid #c99a2e;border-radius:12px;padding:1rem;margin:1rem 0;background:#24242b}blockquote{color:#e8b84a;margin:.5rem 0}small{color:#b8a98a}@media print{body{background:#fff;color:#000}article{background:#fff}}</style>"
            "<h1>%s</h1><p>%s</p>%s<p><small>Remembrance collection - original recordings preserved, nothing synthesised.</small></p>"
            % (html.escape(c["name"]), html.escape(c["name"]), html.escape(c.get("note", "")), "".join(cards)))

def encrypted_bundle(key) -> bytes:
    objs = {}
    for kind in ("story", "transcript", "memory", "collection"):
        objs[kind] = vs.list_kind(key, kind)
    audio = {}
    for s in objs["story"]:
        p = vs.audio_path(s["id"])
        if p.exists(): audio[s["id"]] = base64.b64encode(vs.get_audio(key, s["id"])).decode()
    payload = json.dumps({"manifest": {"app": "ghostlight", "version": 1}, "objects": objs, "audio": audio}).encode()
    return b"GLAR1" + enc.encrypt(key, payload, b"export")
