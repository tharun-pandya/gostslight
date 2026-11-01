"""OPTIONAL real-model check. Needs Ollama running with the Gemma model pulled and faster-whisper cached.
Run: GHOSTLIGHT_REAL_MODELS=1 pytest backend/tests/test_integration_real_models.py -s
This only checks that real inference runs and the output validates; it is NOT an accuracy benchmark."""
import os, pytest
pytestmark = pytest.mark.skipif(os.getenv("GHOSTLIGHT_REAL_MODELS") != "1", reason="real models not requested")

def test_gemma_extraction_with_real_model():
    from app.services.memory_extraction import SYSTEM
    from app.adapters import gemma_adapter
    from app.models.schemas import ExtractionResult
    from app.services.evidence_service import validate_candidates
    segs = [{"id": "segment_001", "start": 12.4, "end": 18.2, "text": "Every Sankranti, we used to prepare ariselu together.", "redacted": False}]
    r = gemma_adapter.chat_validated(SYSTEM, "TRANSCRIPT SEGMENTS:\n[segment_001] " + segs[0]["text"], ExtractionResult)
    ok, rejected = validate_candidates(r.memories, segs)
    print("accepted:", len(ok), "rejected:", len(rejected))
    assert all(m["evidence"] for m in ok)
