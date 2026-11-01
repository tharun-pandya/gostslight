# Privacy
- All inference is local (Whisper in-process, Gemma via loopback Ollama, e5 in-process). No analytics, telemetry, or cloud backup.
- Encrypted at rest: audio, transcripts, memories, collections, embeddings, job records. Argon2id (64 MiB, t=3 by default) → AES-256-GCM, unique 96-bit nonce per object.
- Key lives in memory only; locks after 10 idle minutes (`IDLE_LOCK_MINUTES`). Passphrase is never stored; there is no recovery.
- Consent is required to import; withdrawing it removes a story from search/ask/archive/export. Redaction removes dependent memory cards. Story and vault deletion available.
- Plaintext exports require explicit confirmation. Decrypted temp audio for Whisper is deleted in a `finally`.
- Not in encrypted form: object ids, kinds, row count, blob sizes, file timestamps.
- Logs never include transcripts or audio; errors are generic.
