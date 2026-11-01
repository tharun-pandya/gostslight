# API (all under /api/v1; header `X-Session: <token>` after unlock). Interactive docs at /docs unless DEMO_MODE.
Vault: POST /vault/create|unlock|lock · GET /vault/status · DELETE /vault?confirm=true
Stories: POST /stories (multipart) · GET /stories · GET|DELETE /stories/{id} · GET /stories/{id}/audio · PATCH /stories/{id}/consent
Transcription: POST /stories/{id}/transcribe → job · GET /jobs/{job} · GET|PUT /stories/{id}/transcript
Memories: POST /stories/{id}/extract → job · GET /stories/{id}/memories · GET /memories (filters: category, person, place, story_id, language, year_from, year_to) · PATCH /memories/{id}/approve|reject · GET /timeline · GET /people
Archive: POST /search · POST /ask · GET|POST /collections
Exports: POST /exports/markdown|collection (need `confirm_plaintext:true`) · POST /exports/encrypted
System: GET /health · GET /models/status
