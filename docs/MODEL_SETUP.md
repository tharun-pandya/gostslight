# Model setup
1. Install Ollama, then `ollama pull gemma3:1b` (optional `gemma3:4b`; set `GEMMA_MODEL`). Gemma use is governed by Google's Gemma Terms of Use.
2. `python scripts/download_models.py` (asks first) caches Whisper `base` and `intfloat/multilingual-e5-small`. Use `WHISPER_MODEL=small` for better quality (slower, more RAM).
3. Check **Privacy & Settings → Local models**. Whisper and embeddings load with `local_files_only=True`, so nothing is fetched at runtime. Without e5, search silently uses the lexical fallback (the settings page says so).
Targets 8 GB RAM: Gemma 1B + Whisper base, never loaded concurrently by the job queue.
