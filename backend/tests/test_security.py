import os, pytest
from app.security import encryption as enc
from app.security.upload_validation import validate_audio, UploadError, safe_filename
from app.security.sessions import sessions
from app.config import settings
from conftest import PASS, wav_bytes

def test_vault_create_unlock_and_wrong_passphrase(client):
    assert client.post("/api/v1/vault/create", json={"name": "V", "passphrase": PASS}).status_code == 200
    client.post("/api/v1/vault/lock")
    assert client.post("/api/v1/vault/unlock", json={"passphrase": "wrong passphrase!!"}).status_code == 401
    assert client.post("/api/v1/vault/unlock", json={"passphrase": PASS}).status_code == 200

def test_short_passphrase_rejected(client):
    assert client.post("/api/v1/vault/create", json={"name": "V", "passphrase": "short"}).status_code == 422

def test_encrypt_round_trip_and_unique_nonce():
    k = os.urandom(32); a = enc.encrypt(k, b"hello", b"x"); b = enc.encrypt(k, b"hello", b"x")
    assert enc.decrypt(k, a, b"x") == b"hello" and a[:12] != b[:12]

def test_tamper_detected():
    k = os.urandom(32); blob = bytearray(enc.encrypt(k, b"secret"))
    blob[-1] ^= 1
    with pytest.raises(enc.DecryptError): enc.decrypt(k, bytes(blob))
    with pytest.raises(enc.DecryptError): enc.decrypt(os.urandom(32), enc.encrypt(k, b"s"))

def test_locked_vault_rejects_requests(client):
    assert client.get("/api/v1/stories").status_code == 401

def test_session_expiry(vault, monkeypatch):
    monkeypatch.setattr(settings, "idle_lock_s", -1)
    assert vault.get("/api/v1/stories").status_code == 401

def test_lock_endpoint(vault):
    vault.post("/api/v1/vault/lock"); assert vault.get("/api/v1/stories").status_code == 401

def test_upload_validation():
    with pytest.raises(UploadError): validate_audio(b"not audio at all")
    with pytest.raises(UploadError): validate_audio(b"")
    assert validate_audio(wav_bytes())["format"] == "wav"

def test_unsupported_audio_rejected(vault):
    r = vault.post("/api/v1/stories", data={"title": "t", "consent": "true"}, files={"audio": ("evil.mp3", b"MZ\x90 exe", "audio/mpeg")})
    assert r.status_code == 400

def test_file_size_limit(vault, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 1000)
    r = vault.post("/api/v1/stories", data={"title": "t", "consent": "true"}, files={"audio": ("a.wav", wav_bytes(2), "audio/wav")})
    assert r.status_code == 400

def test_duration_limit(vault, monkeypatch):
    monkeypatch.setattr(settings, "max_duration_s", 1)
    assert vault.post("/api/v1/stories", data={"title": "t", "consent": "true"}, files={"audio": ("a.wav", wav_bytes(3), "audio/wav")}).status_code == 400

def test_consent_required(vault):
    from conftest import upload
    assert upload(vault, consent="false").status_code == 400

def test_filename_traversal_sanitised():
    assert "/" not in safe_filename("../../etc/passwd") and not safe_filename("..\\..\\x").startswith(".")

def test_host_and_origin_validation(client):
    assert client.get("/api/v1/health", headers={"host": "evil.com"}).status_code == 403
    assert client.get("/api/v1/health", headers={"origin": "http://evil.com"}).status_code == 403

def test_encrypted_at_rest(story, vault):
    raw = (settings.data_dir / "ghostlight.db").read_bytes() + b"".join(p.read_bytes() for p in (settings.data_dir / "audio").iterdir())
    assert b"Sankranti" not in raw and b"ariselu" not in raw and b"RIFF" not in raw

def test_logs_do_not_contain_transcript(story, vault, caplog):
    import logging; caplog.set_level(logging.DEBUG)
    vault.get(f"/api/v1/stories/{story}/transcript")
    assert "ariselu" not in caplog.text

def test_demo_mode_blocks_private_routes(client, monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", True)
    assert client.post("/api/v1/vault/create", json={"name": "V", "passphrase": PASS}).status_code == 403
    assert client.get("/api/v1/health").status_code == 200

def test_root_page_is_not_404(client):
    r = client.get("/"); assert r.status_code == 200 and "Ghostlight" in r.text
    assert client.get("/favicon.ico").status_code == 204

def test_same_origin_post_allowed(client):
    r = client.post("/api/v1/vault/unlock", json={"passphrase": "x"}, headers={"origin": "http://testserver"})
    assert r.status_code != 403


def test_unlock_throttled_after_repeated_failures(client):
    from conftest import PASS
    client.post("/api/v1/vault/create", json={"name": "T", "passphrase": PASS})
    client.post("/api/v1/vault/lock")
    for _ in range(5):
        assert client.post("/api/v1/vault/unlock", json={"passphrase": "wrong wrong wrong"}).status_code == 401
    # even the correct passphrase is refused while the brake is on
    assert client.post("/api/v1/vault/unlock", json={"passphrase": PASS}).status_code == 429
