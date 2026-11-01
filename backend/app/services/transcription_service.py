import os, tempfile
from ..adapters import whisper_adapter
from . import vault_service as vs

def transcribe_story(key, story_id, progress):
    story = vs.get(key, story_id, "story")
    if not story or not story.get("consent"): raise ValueError("Consent is required before processing")
    data = vs.get_audio(key, story_id)
    fd, path = tempfile.mkstemp(suffix="." + story["format"]); os.close(fd)
    try:
        with open(path, "wb") as f: f.write(data)
        res = whisper_adapter.transcribe(path, story.get("language"), progress)
    finally:
        try: os.remove(path)  # always remove decrypted temp audio
        except OSError: pass
    segs = [{"id": f"segment_{i+1:03d}", "start": s["start"], "end": s["end"], "text": s["text"],
             "original_text": s["text"], "speaker": None, "redacted": False} for i, s in enumerate(res["segments"])]
    vs.put(key, "transcript", f"tr_{story_id}", {
        "language": res["language"], "language_probability": res["language_probability"], "segments": segs, "edited": False}, story_id)
    story["status"] = "transcribed"; story["duration"] = res["duration"]; story["detected_language"] = res["language"]
    vs.put(key, "story", story_id, story)
    if len(vs.get(key, f"tr_{story_id}", "transcript")["segments"]) != len(segs): raise RuntimeError("Transcript verification failed")
    return {"segments": len(segs), "language": res["language"]}
