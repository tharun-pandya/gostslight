import os
from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

class DecryptError(Exception): ...

def derive_key(passphrase: str, salt: bytes, memory_kib=65536, time_cost=3) -> bytes:
    """Argon2id -> 32-byte key. Passphrase is never stored."""
    return hash_secret_raw(passphrase.encode(), salt, time_cost=time_cost, memory_cost=memory_kib,
                           parallelism=2, hash_len=32, type=Type.ID)

def encrypt(key: bytes, plaintext: bytes, aad: bytes = b"") -> bytes:
    nonce = os.urandom(12)  # unique per object
    return nonce + AESGCM(key).encrypt(nonce, plaintext, aad)

def decrypt(key: bytes, blob: bytes, aad: bytes = b"") -> bytes:
    try:
        return AESGCM(key).decrypt(blob[:12], blob[12:], aad)
    except (InvalidTag, ValueError) as e:
        raise DecryptError("Data failed authentication (wrong key or tampered)") from e
