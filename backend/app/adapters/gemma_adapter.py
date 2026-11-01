"""Local Gemma via Ollama's HTTP API. Only talks to OLLAMA_BASE_URL (default loopback)."""
import json, httpx
from ..config import settings

class OllamaDown(RuntimeError): ...
class ModelMissing(RuntimeError): ...
class BadModelOutput(RuntimeError): ...

def status() -> dict:
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3)
        names = [m["name"] for m in r.json().get("models", [])]
        ok = settings.gemma_model in names or settings.gemma_model + ':latest' in names
        return {"ready": ok, "detail": "available" if ok else f"run: ollama pull {settings.gemma_model}"}
    except Exception:
        return {"ready": False, "detail": "Ollama is not reachable. Start it with: ollama serve"}

def chat(system: str, user: str, schema: dict | None = None, timeout=300) -> str:
    body = {"model": settings.gemma_model, "stream": False, "options": {"temperature": 0.1},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if schema: body["format"] = schema
    try:
        r = httpx.post(f"{settings.ollama_base_url}/api/chat", json=body, timeout=timeout)
    except httpx.HTTPError as e: raise OllamaDown("Could not reach Ollama") from e
    if r.status_code == 404: raise ModelMissing(f"Model {settings.gemma_model} missing. Run: ollama pull {settings.gemma_model}")
    if r.status_code >= 400: raise OllamaDown(f"Ollama error {r.status_code}")
    return r.json()["message"]["content"]

def chat_validated(system: str, user: str, model_cls, retries=1):
    """Ask for JSON, validate with Pydantic, retry once on malformed output."""
    last = None
    for attempt in range(retries + 1):
        raw = chat(system, user if attempt == 0 else user + "\n\nReturn ONLY valid JSON matching the schema.",
                   model_cls.model_json_schema())
        try:
            return model_cls.model_validate(json.loads(raw))
        except Exception as e: last = e
    raise BadModelOutput("The model returned output that could not be validated") from last
