import json, os, secrets, shutil
from datetime import datetime, timezone
from ..config import settings
from ..models.database import db, Obj, dispose_db
from ..security import encryption as enc
from ..security.sessions import sessions

VAULT_FILE = lambda: settings.data_dir / "vault.json"
class VaultError(Exception): ...
now = lambda: datetime.now(timezone.utc).isoformat()
new_id = lambda p="": p + secrets.token_hex(12)

def exists() -> bool: return VAULT_FILE().exists()

def _atomic_write(path, text: str):
    """Write via temp file + rename so a crash can never leave a half-written vault header; owner-only perms."""
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f: f.write(text); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)

def create(name: str, passphrase: str) -> str:
    if exists(): raise VaultError("A vault already exists")
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    salt = os.urandom(16)
    key = enc.derive_key(passphrase, salt, settings.argon_memory_kib, settings.argon_time)
    _atomic_write(VAULT_FILE(), json.dumps({
        "version": 1, "kdf": "argon2id", "salt": salt.hex(),
        "mem": settings.argon_memory_kib, "time": settings.argon_time,
        "name_enc": enc.encrypt(key, name.encode(), b"name").hex(),
        "verifier": enc.encrypt(key, b"ghostlight-ok", b"verifier").hex()}))
    return sessions.open(key)

def unlock(passphrase: str) -> str:
    if not exists(): raise VaultError("No vault found")
    v = json.loads(VAULT_FILE().read_text())
    key = enc.derive_key(passphrase, bytes.fromhex(v["salt"]), v["mem"], v["time"])
    try: enc.decrypt(key, bytes.fromhex(v["verifier"]), b"verifier")
    except enc.DecryptError: raise VaultError("Incorrect passphrase")
    return sessions.open(key)

def vault_name(key: bytes) -> str:
    v = json.loads(VAULT_FILE().read_text())
    return enc.decrypt(key, bytes.fromhex(v["name_enc"]), b"name").decode()

def delete_all():
    """Removes vault files and database. NOTE: not guaranteed forensically unrecoverable on SSDs;
    data stays encrypted and the key is gone, which is what protects it."""
    sessions.lock(); dispose_db()
    if settings.data_dir.exists(): shutil.rmtree(settings.data_dir, ignore_errors=True)

# ---- encrypted object store ----
def put(key, kind, obj_id, data: dict, story_id=None):
    blob = enc.encrypt(key, json.dumps(data).encode(), f"{kind}:{obj_id}".encode())
    with db() as s:
        s.merge(Obj(id=obj_id, kind=kind, story_id=story_id, blob=blob)); s.commit()

def get(key, obj_id, kind=None):
    with db() as s:
        o = s.get(Obj, obj_id)
        if not o or (kind and o.kind != kind): return None
        return json.loads(enc.decrypt(key, o.blob, f"{o.kind}:{o.id}".encode()))

def list_kind(key, kind, story_id=None):
    with db() as s:
        q = s.query(Obj).filter(Obj.kind == kind)
        if story_id: q = q.filter(Obj.story_id == story_id)
        rows = q.all()
    return [{**json.loads(enc.decrypt(key, o.blob, f"{o.kind}:{o.id}".encode())), "id": o.id} for o in rows]

def delete_obj(obj_id):
    with db() as s:
        s.query(Obj).filter(Obj.id == obj_id).delete(); s.commit()

def delete_story_objects(story_id):
    with db() as s:
        s.query(Obj).filter((Obj.story_id == story_id) | (Obj.id == story_id)).delete(); s.commit()
    p = settings.data_dir / "audio" / f"{story_id}.bin"
    if p.exists(): p.unlink()

def audio_path(story_id): return settings.data_dir / "audio" / f"{story_id}.bin"
def put_audio(key, story_id, data: bytes):
    audio_path(story_id).parent.mkdir(parents=True, exist_ok=True)
    audio_path(story_id).write_bytes(enc.encrypt(key, data, story_id.encode()))
def get_audio(key, story_id) -> bytes: return enc.decrypt(key, audio_path(story_id).read_bytes(), story_id.encode())
