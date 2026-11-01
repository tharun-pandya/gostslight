import io, re, wave
from ..config import settings

class UploadError(ValueError): ...

def sniff(data: bytes) -> str | None:
    """Detect container from magic bytes (never trust extension)."""
    h = data[:16]
    if h[:4] == b"RIFF" and h[8:12] == b"WAVE": return "wav"
    if h[:3] == b"ID3" or (len(h) > 1 and h[0] == 0xFF and (h[1] & 0xE0) == 0xE0): return "mp3"
    if h[:4] == b"OggS": return "ogg"
    if h[:4] == b"fLaC": return "flac"
    if h[:4] == b"\x1aE\xdf\xa3": return "webm"
    if h[4:8] == b"ftyp": return "m4a"
    return None

def validate_audio(data: bytes) -> dict:
    if not data: raise UploadError("Empty file")
    if len(data) > settings.max_upload_bytes: raise UploadError("File exceeds the size limit")
    kind = sniff(data)
    if not kind: raise UploadError("Unsupported or unrecognised audio format")
    duration = None
    if kind == "wav":
        try:
            with wave.open(io.BytesIO(data)) as w: duration = w.getnframes() / float(w.getframerate())
        except Exception: raise UploadError("Audio could not be decoded")
        if duration > settings.max_duration_s: raise UploadError("Recording is longer than the maximum duration")
    return {"format": kind, "duration": duration, "size": len(data)}

def safe_filename(name: str) -> str:
    name = name.replace("\\", "/").split("/")[-1]
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).lstrip(".")
    return name[:80] or "file"
