"""faster-whisper adapter. Lazy-loaded; CPU/INT8 by default. Never downloads silently:
the model must already be cached (or WHISPER_MODEL points to a local dir)."""
import threading
from ..config import settings

class ModelUnavailable(RuntimeError): ...
_model = None; _lock = threading.Lock()

def _load():
    global _model
    with _lock:
        if _model is None:
            try:
                from faster_whisper import WhisperModel
                _model = WhisperModel(settings.whisper_model, device=settings.whisper_device,
                                      compute_type=settings.whisper_compute_type, local_files_only=True)
            except ImportError as e: raise ModelUnavailable("faster-whisper is not installed") from e
            except Exception as e: raise ModelUnavailable(
                f"Whisper model '{settings.whisper_model}' is not cached locally. See docs/MODEL_SETUP.md") from e
    return _model

def unload():
    global _model
    _model = None

def status() -> dict:
    try:
        import faster_whisper  # noqa
    except ImportError:
        return {"ready": False, "detail": "faster-whisper not installed"}
    return {"ready": True, "detail": f"{settings.whisper_model} ({settings.whisper_compute_type}); loads on first use"}

def transcribe(path: str, language: str | None, progress_cb=None) -> dict:
    m = _load()
    segs, info = m.transcribe(path, language=None if language in (None, "", "auto") else language,
                              vad_filter=True, beam_size=1)
    if info.duration > settings.max_duration_s: raise ValueError("Recording is longer than the maximum duration")
    out = []
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
        if progress_cb and info.duration: progress_cb(min(0.99, s.end / info.duration))
    return {"language": info.language, "language_probability": round(float(info.language_probability), 3),
            "duration": info.duration, "segments": out}
