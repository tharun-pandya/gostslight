import io, sys, time, wave, struct, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.models import database
from app.security.sessions import sessions

PASS = "correct horse battery staple"

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", tmp_path / "data")
    monkeypatch.setattr(settings, "argon_memory_kib", 1024); monkeypatch.setattr(settings, "argon_time", 1)
    monkeypatch.setattr(settings, "use_embeddings", False)
    database.dispose_db(); sessions.lock()
    from app.api import vault as vault_api
    vault_api._fails = 0; vault_api._blocked_until = 0.0
    from app.main import app
    yield TestClient(app)
    database.dispose_db(); sessions.lock()

def wav_bytes(seconds=1, rate=8000):
    b = io.BytesIO()
    with wave.open(b, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(struct.pack("<h", 0) * rate * seconds)
    return b.getvalue()

@pytest.fixture
def vault(client):
    r = client.post("/api/v1/vault/create", json={"name": "Test", "passphrase": PASS})
    assert r.status_code == 200
    client.headers["X-Session"] = r.json()["session"]
    return client

def upload(c, consent="true", data=None, title="Sankranti Story"):
    return c.post("/api/v1/stories", data={"title": title, "storyteller": "Grandmother (demo)", "recorded_on": "2001-01-14", "consent": consent},
                  files={"audio": ("x.wav", data if data is not None else wav_bytes(), "audio/wav")})

def wait_job(c, jid, timeout=10):
    t = time.time()
    while time.time() - t < timeout:
        j = c.get(f"/api/v1/jobs/{jid}").json()
        if j["status"] in ("done", "failed"): return j
        time.sleep(0.05)
    raise AssertionError("job timeout")

SEGS = [{"start": 12.4, "end": 18.2, "text": "Every Sankranti, we used to prepare ariselu together."},
        {"start": 18.2, "end": 24.0, "text": "My grandmother always prepared the jaggery syrup first."}]

@pytest.fixture
def story(vault, monkeypatch):
    from app.adapters import whisper_adapter
    monkeypatch.setattr(whisper_adapter, "transcribe", lambda p, lang, cb=None: {"language": "en", "language_probability": 0.97, "duration": 24.0, "segments": SEGS})
    sid = upload(vault).json()["id"]
    j = wait_job(vault, vault.post(f"/api/v1/stories/{sid}/transcribe").json()["id"])
    assert j["status"] == "done"
    return sid

def mock_gemma(monkeypatch, payload):
    import json
    from app.adapters import gemma_adapter
    monkeypatch.setattr(gemma_adapter, "chat", lambda s, u, schema=None, timeout=0: payload if isinstance(payload, str) else json.dumps(payload))
