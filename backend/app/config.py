import os
from pathlib import Path

def _b(k, d): return os.getenv(k, d).lower() in ("1", "true", "yes")

class Settings:
    def __init__(self):
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        self.gemma_model = os.getenv("GEMMA_MODEL", "gemma3:1b")
        self.whisper_model = os.getenv("WHISPER_MODEL", "base")
        self.whisper_device = os.getenv("WHISPER_DEVICE", "cpu")
        self.whisper_compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")
        self.demo_mode = _b("DEMO_MODE", "false")
        self.data_dir = Path(os.getenv("GHOSTLIGHT_DATA_DIR", "./data")).resolve()
        self.max_upload_bytes = int(os.getenv("MAX_UPLOAD_MB", "50")) * 1024 * 1024
        self.max_duration_s = int(os.getenv("MAX_DURATION_MIN", "30")) * 60
        self.idle_lock_s = int(os.getenv("IDLE_LOCK_MINUTES", "10")) * 60
        self.allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",")
        self.allowed_hosts = os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",")
        self.argon_memory_kib = int(os.getenv("ARGON_MEMORY_KIB", "65536"))
        self.argon_time = int(os.getenv("ARGON_TIME", "3"))
        self.use_embeddings = _b("USE_EMBEDDINGS", "true")

settings = Settings()
