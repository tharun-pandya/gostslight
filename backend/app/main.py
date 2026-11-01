from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .api import vault, stories, transcription, memories, search, collections, exports
from .adapters import whisper_adapter, gemma_adapter, embedding_adapter

app = FastAPI(title="Ghostlight", version="0.1.0", docs_url=None if settings.demo_mode else "/docs")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                   allow_headers=["Content-Type", "X-Session"])

@app.middleware("http")
async def guard(request: Request, call_next):
    host = (request.headers.get("host") or "").split(":")[0]
    origin = request.headers.get("origin")
    if host not in settings.allowed_hosts: return JSONResponse({"detail": "Host not allowed"}, 403)
    same_origin = origin == f"http://{request.headers.get('host')}"
    if origin and origin not in settings.allowed_origins and not same_origin: return JSONResponse({"detail": "Origin not allowed"}, 403)
    if int(request.headers.get("content-length") or 0) > settings.max_upload_bytes + 1_000_000:
        return JSONResponse({"detail": "Request too large"}, 413)
    p = request.url.path
    if settings.demo_mode and p.startswith("/api/v1") and p not in ("/api/v1/health", "/api/v1/vault/status"):
        return JSONResponse({"detail": "Demo mode: private features are disabled"}, 403)
    try: return await call_next(request)
    except Exception:  # never leak paths or private data
        return JSONResponse({"detail": "Internal error"}, 500)

for m in (vault, stories, transcription, memories, search, collections, exports): app.include_router(m.r)

@app.get("/api/v1/health")
def health(): return {"ok": True, "demo_mode": settings.demo_mode}

@app.get("/api/v1/models/status")
def models():
    mem = None
    try:
        for l in open("/proc/meminfo"):
            if l.startswith("MemAvailable"): mem = round(int(l.split()[1]) / 1048576, 1)
    except OSError: pass
    warn = f"Only {mem} GB RAM available; consider gemma3:1b + whisper base." if mem is not None and mem < 3 else None
    return {"whisper": whisper_adapter.status(), "gemma": {**gemma_adapter.status(), "model": settings.gemma_model},
            "embeddings": embedding_adapter.status(), "available_ram_gb": mem, "warning": warn}

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

@app.get("/favicon.ico", include_in_schema=False)
def favicon(): return Response(status_code=204)

if DIST.exists():  # `npm run build` once, then this single server serves the whole app
    app.mount("/", StaticFiles(directory=DIST, html=True), name="ui")
else:
    @app.get("/", include_in_schema=False)
    def root():
        return HTMLResponse("<body style='font-family:sans-serif;background:#16161a;color:#f6efe0;padding:2rem'>"
            "<h1>Ghostlight backend is running</h1><p>This is the API. The app UI is not built yet.</p>"
            "<p>Option A: <code>cd frontend &amp;&amp; npm install &amp;&amp; npm run dev</code>, then open "
            "<a style='color:#f0b84a' href='http://127.0.0.1:5173'>http://127.0.0.1:5173</a> (backend must be on port 8000).</p>"
            "<p>Option B: <code>cd frontend &amp;&amp; npm run build</code>, restart this server, and open this address again.</p>"
            "<p><a style='color:#f0b84a' href='/api/v1/health'>API health</a></p></body>")
