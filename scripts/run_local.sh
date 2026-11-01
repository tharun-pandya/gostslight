#!/usr/bin/env bash
# Starts backend (127.0.0.1:8000) and frontend dev server (127.0.0.1:5173).
set -e
cd "$(dirname "$0")/.."
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
(cd frontend && npm install --no-audit --no-fund)
(cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACK=$!; trap "kill $BACK" EXIT
(cd frontend && npm run dev)
