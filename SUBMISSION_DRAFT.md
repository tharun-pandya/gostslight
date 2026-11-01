# Ghostlight: The Stories That Should Never Disappear

#devchallenge #hf26challenge #gemma

This is a submission for the Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine.

## What I Built

Most of what my family knows about the past is stored in a few people's heads and a handful of unlabelled voice notes. When someone is gone, those voices go with them. The tempting AI answer is to feed everything to a model and chat with a "digital copy". I didn't want that: a copy says things the person never said.

Ghostlight is a local-first archive that keeps the **real recording** at the centre. You record or import a conversation, Whisper transcribes it on your machine, you correct it, and Gemma proposes *memory cards* (traditions, recipes, places, sayings). Every card must quote the transcript and carries the exact audio timestamp. Nothing enters the archive until a human approves it. Later you can ask "What did grandmother say about Sankranti?" and get an answer that links back to the second of the original recording, or an honest "I couldn't find this memory in your archive."

Ghostlight doesn't impersonate anyone, doesn't clone voices, and doesn't answer in the storyteller's voice. *Don't recreate the person. Preserve the moments.*

## Demo

Public sample-only demo (fictional data, no audio, no AI): **<ADD RENDER URL AFTER DEPLOYING>**

The real app runs locally; the README has a step-by-step video workflow showing Whisper and Gemma working with Wi-Fi off. **<ADD VIDEO LINK>**

## Code

**<ADD PUBLIC GITHUB URL>**

```
React/Vite ──127.0.0.1──> FastAPI ── faster-whisper (CPU int8)
                              ├────── Ollama → Gemma 3 (1B default)
                              ├────── multilingual-e5-small (optional)
                              └────── SQLite of AES-GCM blobs + encrypted audio
```

The core safety rule is code, not a prompt (`backend/app/services/evidence_service.py`):

```python
def validate_candidates(cands, segments):
    by_id = {s["id"]: s for s in segments if not s.get("redacted")}
    ...
    for e in c.evidence:
        seg = by_id.get(e.segment_id)
        if not seg: bad = "unknown segment"; break
        q = norm(e.exact_quote)
        if len(q) < 3 or q not in norm(seg["text"]): bad = "quote not found in segment"; break
        fixed.append({"segment_id": seg["id"], "start_seconds": seg["start"],
                      "end_seconds": seg["end"], "exact_quote": e.exact_quote.strip()})
```

If Gemma invents a person or a fact, its quote won't be found in the transcript and the candidate is thrown away. Timestamps come from Whisper's segments, never from the LLM.

## How I Built It

- **Whisper (faster-whisper, base, CPU int8)** produces timestamped segments and a detected language. The transcript keeps both the original ASR text and the user's corrections.
- **Gemma via Ollama** is asked for JSON matching a Pydantic schema; output is validated, retried once, then failed with a clear error rather than silently inventing memories. The prompt treats transcripts as data, and the code-level evidence check means a prompt-injection line inside a transcript can't create an unsupported memory (there's a test for it).
- **Retrieval** uses lexical matching always, and `multilingual-e5-small` embeddings (`query:`/`passage:` prefixes, cached encrypted) when installed.
- **Grounded answers**: only retrieved segments go to Gemma; `used_segment_ids` must be a subset of what was retrieved; with no hits Gemma isn't even called and the fixed abstention is returned. If Gemma is down, the app shows the matching passages only.
- **Encryption**: Argon2id → AES-256-GCM with a unique nonce per object and `kind:id` as associated data. The key lives in memory while unlocked and the vault locks after 10 idle minutes.
- **React + FastAPI** modular monolith, with a single-worker job queue so Whisper and Gemma never compete for an 8 GB laptop's RAM.

**Testing, honestly:** 45 backend tests (pytest) and 4 frontend tests (Vitest) pass, but they use *mocked* models, so they verify the pipeline and safety rules, not transcription or extraction quality. I have not benchmarked accuracy and make no accuracy claims; Telugu–English code-switching on Whisper `base` in particular needs human correction. Encrypted-archive *import* is not implemented yet.

## Why Does Open Innovation Matter?

A grandmother's voice is about as private as data gets. With open-weight models running locally, the recording never leaves the device; with a hosted API it would have to be uploaded to someone else's servers and governed by their policies. Once the model files are cached, Ghostlight works offline. Models are swappable through environment variables (`GEMMA_MODEL`, `WHISPER_MODEL`, `EMBEDDING_MODEL`), and the archive is the family's own: encrypted files they can back up and export as Markdown or HTML. Gemma is used under Google's Gemma Terms of Use.

## My Agent Session

**<ADD DEVRELAY SESSION LINK ONLY IF ONE WAS REALLY SAVED — otherwise delete this section>**

## The Spirit of It

In the fictional demo archive, "Demo Grandmother (Lakshmi)" says at 00:12: *"Every Sankranti, we used to prepare ariselu together."* Ghostlight turns that into a card — **Tradition: Preparing ariselu at Sankranti** — with the quote, the story title and a button that jumps the player to 00:12. Ask about cricket instead and the answer is: *I couldn't find this memory in your archive.* The point isn't to make an elder "talk" again. It's to make sure the words they actually said are never lost.

## Prize Categories

- **Best Use of Gemma** (primary): local Gemma via Ollama for structured extraction and grounded Q&A.
- **Best Use of Render**: only if the static sample-only demo is actually deployed on Render Static Sites (no backend is deployed).
