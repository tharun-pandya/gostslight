"""Explicit, opt-in model downloader. Ghostlight never downloads models silently."""
import os, sys
w = os.getenv("WHISPER_MODEL", "base"); e = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")
print(f"This will download Whisper '{w}' (~150 MB) and '{e}' (~470 MB) from Hugging Face to your cache.")
if input("Continue? [y/N] ").lower() != "y": sys.exit("Cancelled.")
from faster_whisper import WhisperModel
WhisperModel(w, device="cpu", compute_type="int8"); print("Whisper cached.")
from sentence_transformers import SentenceTransformer
SentenceTransformer(e); print("Embedding model cached. Also run: ollama pull gemma3:1b")
