"""
Zyntra Virtual Try-On — In-Memory Async Job Queue
==================================================
Simple single-worker queue for GPU inference jobs.
One job processes at a time; all others wait in line.

API:
  enqueue_job(job_data: dict) -> str   # returns job_id
  get_job(job_id) -> dict | None
  get_all_jobs() -> list[dict]
"""

import uuid
import time
import threading
import traceback
from pathlib import Path

from tryon.avatars import TRYON_RESULTS_DIR
from tryon.pipeline import generate_tryon

# ─── Job store ───────────────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}          # job_id → job_dict
_queue: list[str]      = []          # ordered list of pending job_ids
_lock  = threading.Lock()
_worker_event = threading.Event()

JOB_TIMEOUT_SECS = 300   # 5 min hard timeout watchdog
MAX_RETRIES       = 1     # auto-retry on crash


def _make_job(job_data: dict) -> dict:
    return {
        "id":         str(uuid.uuid4()),
        "status":     "queued",    # queued | processing | done | failed
        "progress":   "Waiting in queue…",
        "queue_pos":  0,
        "result_url": None,
        "error":      None,
        "retries":    0,
        "created_at": time.time(),
        "started_at": None,
        "finished_at": None,
        **job_data,               # avatar_id, items, cache_key, user_id, etc.
    }


def enqueue_job(job_data: dict) -> str:
    """Create and enqueue a new job. Returns job_id."""
    job = _make_job(job_data)
    with _lock:
        _jobs[job["id"]] = job
        _queue.append(job["id"])
        _update_queue_positions()
    _worker_event.set()
    print(f"[Queue] Job {job['id']} enqueued (queue depth={len(_queue)})")
    return job["id"]


def get_job(job_id: str) -> dict | None:
    with _lock:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def get_all_jobs() -> list[dict]:
    with _lock:
        return [dict(j) for j in _jobs.values()]


def _update_queue_positions():
    for pos, jid in enumerate(_queue):
        if jid in _jobs:
            _jobs[jid]["queue_pos"] = pos + 1


def _set_progress(job_id: str, msg: str):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["progress"] = msg


def _process_job(job_id: str):
    """Process a single job. Called from worker thread."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return
        job["status"]     = "processing"
        job["started_at"] = time.time()
        job["progress"]   = "Starting generation…"
        job["queue_pos"]  = 0

    print(f"[Queue] Processing job {job_id}")

    def progress_cb(msg: str):
        _set_progress(job_id, msg)

    try:
        # Watchdog timeout guard
        result_container = [None]
        error_container  = [None]

        def _run():
            try:
                result_container[0] = generate_tryon(
                    avatar_id=job["avatar_id"],
                    items=job["items"],
                    progress_cb=progress_cb,
                    custom_model_bytes=job.get("custom_model_bytes"),
                    gender=job.get("gender", "male")
                )
            except Exception as exc:
                error_container[0] = exc

        t = threading.Thread(target=_run, daemon=True)
        t.start()
        t.join(timeout=JOB_TIMEOUT_SECS)

        if t.is_alive():
            raise TimeoutError(f"Job exceeded {JOB_TIMEOUT_SECS}s timeout")

        if error_container[0]:
            raise error_container[0]

        result_bytes = result_container[0]
        if result_bytes is None:
            raise RuntimeError("Pipeline returned no image data")

        # Save result image
        result_path = TRYON_RESULTS_DIR / f"{job_id}.png"
        result_path.write_bytes(result_bytes)
        result_url  = f"/tryon/result/{job_id}.png"

        with _lock:
            job = _jobs[job_id]
            job["status"]      = "done"
            job["result_url"]  = result_url
            job["progress"]    = "Complete"
            job["finished_at"] = time.time()

        print(f"[Queue] Job {job_id} DONE — {result_url}")

    except Exception as exc:
        tb = traceback.format_exc()
        print(f"[Queue] Job {job_id} FAILED: {exc}\n{tb}")
        with _lock:
            job = _jobs.get(job_id, {})
            retries = job.get("retries", 0)

        if retries < MAX_RETRIES:
            print(f"[Queue] Auto-retrying job {job_id} (attempt {retries + 1})")
            with _lock:
                _jobs[job_id]["retries"]  += 1
                _jobs[job_id]["status"]    = "queued"
                _jobs[job_id]["progress"]  = "Retrying…"
                _queue.insert(0, job_id)   # re-queue at front
                _update_queue_positions()
        else:
            with _lock:
                job = _jobs[job_id]
                job["status"]      = "failed"
                job["error"]       = str(exc)
                job["progress"]    = "Failed"
                job["finished_at"] = time.time()


def _worker_loop():
    """Background worker — runs forever, one job at a time."""
    print("[Queue] Worker thread started")
    while True:
        _worker_event.wait()
        _worker_event.clear()

        while True:
            with _lock:
                if not _queue:
                    break
                job_id = _queue.pop(0)
                _update_queue_positions()

            _process_job(job_id)


# ─── Start background worker ──────────────────────────────────────────────────
_worker_thread = threading.Thread(target=_worker_loop, name="vton-worker", daemon=True)
_worker_thread.start()
