# Security Policy

Ghostlight handles private family recordings, so security reports are welcome.

## Reporting
Please open a **private** GitHub Security Advisory on this repository (Security tab → Report a vulnerability). Do not post exploit details in public issues. Never attach real recordings or vault files to a report.

## Scope and honest limits
- The API is designed to run on `127.0.0.1` for one local user. **Do not expose it to a network or deploy it publicly.**
- The Render deployment is a static, read-only demo of fictional data; it has no backend and receives no private data.
- Encryption: Argon2id → AES-256-GCM, key held in memory only while unlocked. The code has not been independently audited.
- Metadata such as record counts, random ids and file sizes is visible on disk.
- Deleting a vault removes files and discards the key; physical erasure on SSDs is not guaranteed.
