# Ghostlight — The Stories That Should Never Disappear

> *Don't recreate the person. Preserve the moments.*

Ghostlight is a **local-first oral-history archive**. You record (or import) a conversation with a family member; Whisper transcribes it on your machine; you correct the transcript; Gemma proposes *evidence-linked* memory cards; you approve them; and you can then ask questions of the archive and get answers that point back to the exact second of the original recording.

It never impersonates anyone, never clones a voice, and never sends recordings to a hosted AI service.

Hacktoberfest theme: **Ghost in the Machine**.

## Problem
Family stories live in the heads of elders and in unlabelled voice notes. Generative "digital resurrection" tools invent words people never said. Ghostlight does the opposite: the *original voice and words* are the product; AI only helps you find and organise them.

## What is different
- Every memory card must quote the transcript. A candidate whose quote is not literally found in the cited segment is **discarded by code**, not by prompt (`services/evidence_service.py`). Timestamps are taken from the transcript, never from the model.
- Humans approve before anything enters the archive.
- "Ask the Memories" abstains when there's no evidence and never answers as the storyteller.
- Everything is encrypted at rest (Argon2id → AES-256-GCM).

## Architecture
```
Browser (React/Vite) ──HTTP, 127.0.0.1──> FastAPI (modular monolith)
                                            ├─ security: Argon2id, AES-GCM, in-memory session, upload validation
                                            ├─ services: vault · transcription · extraction · evidence · retrieval · export
                                            ├─ jobs: bounded single-worker queue, persisted status
                                            └─ adapters ── faster-whisper (CPU/int8, in-process)
                                                         ├─ Ollama → Gemma (127.0.0.1:11434)
                                                         └─ multilingual-e5-small (optional; lexical fallback)
Storage: SQLite (id/kind plaintext, every payload an AES-GCM blob) + encrypted audio files
```
Ask flow: question → (e5 embedding and/or lexical match) → relevant transcript segments → Gemma gets *only* those → answer JSON validated, `used_segment_ids` must be a subset of retrieved ids → citations attached. No hits ⇒ fixed abstention message and Gemma isn't called.

## Stack
React · TypeScript · Vite · Tailwind · Lucide · WaveSurfer.js · Recharts / FastAPI · Pydantic · SQLAlchemy · SQLite · faster-whisper · Ollama · sentence-transformers · NumPy · cryptography · argon2-cffi / pytest · httpx · Vitest · React Testing Library.

## Models and terms
| Model | Use | Terms |
|---|---|---|
| Whisper `base` via faster-whisper | transcription, language detection | MIT (OpenAI Whisper weights, faster-whisper) |
| `gemma3:1b` (optional `gemma3:4b`) via Ollama | extraction, answers | **Gemma Terms of Use** — you must accept/comply with Google's terms; check https://ai.google.dev/gemma/terms |
| `intfloat/multilingual-e5-small` | embeddings | MIT |
Ghostlight does not redistribute model weights. Keep all upstream licence notices if you redistribute.

## Install (CPU only, no Docker)
Requires Python 3.11+, Node 20+, [Ollama](https://ollama.com).
```bash
git clone <your repo> && cd ghostlight
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
```
### Models (never downloaded automatically)
```bash
ollama pull gemma3:1b            # optional: gemma3:4b
# Whisper + e5 download once on the first run you explicitly trigger:
python scripts/download_models.py   # asks before downloading
```
After this, everything works offline. See `docs/MODEL_SETUP.md`.

## Run
```bash
ollama serve &                                    # if not already running
cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 &
cd ../frontend && npm run dev                     # http://127.0.0.1:5173
# or: ./scripts/run_local.sh
```
Configuration: copy `.env.example`; every value can be set as an environment variable.

## Demo mode (static, fictional data)
```bash
cd frontend && VITE_DEMO_MODE=true npm run build   # output: frontend/dist
```
Disables recording, uploads, vault creation and all model endpoints; shows labelled DEMO DATA with cited example answers. The same sample data is available in the real app via "Explore fictional sample memories". Demo mode does **not** fake transcription or Gemma — those features are simply off.
Backend `DEMO_MODE=true` also refuses every private API route.

## Tests
```bash
. .venv/bin/activate && cd backend && python -m pytest -q          # mocked-model suite (+1 optional real-model test, skipped by default)
cd frontend && npm test && npm run build                           # component tests + production build
GHOSTLIGHT_REAL_MODELS=1 pytest backend/tests/test_integration_real_models.py -s   # optional, needs Ollama
```
Mocked-model tests verify the *plumbing and safety rules*, not AI accuracy.

## Deploy the demo on Render
The repo root contains a Render Blueprint (`render.yaml`) for a **static, read-only** site.
1. Push to GitHub. 2. Render dashboard → **New → Blueprint** → select the repo (or edit the existing static site to match). 3. Render runs `cd frontend && npm ci && npm run build` and publishes `frontend/dist`.
- `VITE_DEMO_MODE=true` is baked in at build time, so the site only shows fictional sample data; vault creation, uploads, recording and AI are disabled.
- The blueprint also sets security headers (CSP, `X-Frame-Options`, `nosniff`, `no-referrer`, a microphone-off `Permissions-Policy`) and long-lived caching for hashed `/assets/*`.
- No secrets are required. **Never deploy the FastAPI backend publicly**: it is built for one local user on `127.0.0.1`.

## Continuous integration
`.github/workflows/ci.yml` runs the mocked backend tests and the frontend tests + demo build on every push and pull request.

## Licence
MIT for the Ghostlight source (see `LICENSE`). Model weights are not included and keep their own terms; Gemma is under the Gemma Terms of Use. Security reports: see `SECURITY.md`.

## Recording a judge video
1. `ollama serve`, start backend + frontend. 2. Create a vault. 3. Record 30 s on the Record page. 4. Transcribe (watch the real progress bar; `top` shows Whisper working). 5. Fix a word, Save. 6. "Discover the memories" (Gemma). 7. Approve a card. 8. Ask a question, click "Listen to original recording". 9. Ask something unrelated to show abstention. 10. Disconnect Wi-Fi and repeat to show offline operation.

## Privacy architecture
See `docs/PRIVACY.md`, `docs/THREAT_MODEL.md`. In short: loopback-only server, Host/Origin checks, no telemetry, encrypted blobs, key only in RAM, idle auto-lock (10 min), consent gate, redaction, deletion.

## Known limitations (honest list)
- Transcription accuracy depends on Whisper `base`; Telugu and Telugu–English code-switching are weak at this size — always review. No claim of any accuracy figure is made.
- Speaker labels are manual; there is no diarization.
- Gemma 1B can miss memories or paraphrase poorly; code verifies *quotes*, not the faithfulness of descriptions — human review is the real safeguard.
- Retrieval thresholds (`LEX_MIN`, `COS_MIN`) are untuned heuristics. Answers are not checked for first-person phrasing beyond the prompt.
- Encrypted archive export exists; **import is not implemented**, so no zip/import path-traversal code exists to test. A safe filename sanitiser is tested.
- Repeated wrong passphrases trigger an in-memory back-off (5 failures → temporary 429); it resets when the server restarts.
- Single local user/vault, one session; metadata such as record counts, ids and file sizes are visible on disk. Not audited; not production-ready.
- Browser recording format depends on the browser; non-WAV durations are checked by Whisper after decoding, not at upload.
- Alembic is in requirements but migrations are not set up (schema is a single table created on start).
- Deletion removes files/rows; it can't guarantee physical erasure on SSDs.
- Encrypted export holds a base64 copy of audio in memory — large vaults may use a lot of RAM.

## Roadmap
Encrypted import, speaker diarization, memory editing, photo attachments, tuned retrieval, `.glar` verification tool, Alembic migrations.
