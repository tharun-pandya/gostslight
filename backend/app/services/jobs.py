"""Bounded single-worker job queue (one heavy model task at a time). Status is persisted encrypted."""
import threading
from concurrent.futures import ThreadPoolExecutor
from . import vault_service as vs

MAX_PENDING = 4
_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="gl-job")
_lock = threading.Lock(); _active = 0

class Busy(RuntimeError): ...

def _save(key, job): vs.put(key, "job", job["id"], {k: v for k, v in job.items() if k != "id"}, job.get("story_id"))

def submit(key, kind, story_id, fn) -> dict:
    """fn(progress_cb) -> dict result. Marked 'done' only after fn returns (it verifies its own output)."""
    global _active
    with _lock:
        if _active >= MAX_PENDING: raise Busy("Too many jobs queued; please wait")
        if any(j["story_id"] == story_id and j["kind"] == kind and j["status"] in ("queued", "running")
               for j in vs.list_kind(key, "job")):
            raise Busy("This story is already being processed")
        _active += 1
    job = {"id": vs.new_id("job_"), "kind": kind, "story_id": story_id, "status": "queued", "progress": 0.0, "error": None, "result": None}
    _save(key, job)
    def run():
        global _active
        try:
            job["status"] = "running"; _save(key, job)
            def prog(p): job["progress"] = round(p, 2); _save(key, job)
            job["result"] = fn(prog); job["progress"] = 1.0; job["status"] = "done"
        except Exception as e:
            job["status"] = "failed"; job["error"] = str(e)[:300] or e.__class__.__name__
        finally:
            try: _save(key, job)
            except Exception: pass
            with _lock: _active -= 1
    _pool.submit(run)
    return job

def recover_interrupted(key):
    for j in vs.list_kind(key, "job"):
        if j["status"] in ("queued", "running"):
            j["status"] = "failed"; j["error"] = "Interrupted by restart; please retry"
            _save(key, j)
