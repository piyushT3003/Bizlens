"""
BizLens Backend & Application Launcher
Run directly using: python app.py
"""
import sys
from pathlib import Path
import uvicorn

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("=" * 65)
    print("  Starting BizLens Analytics Engine & Frontend SPA")
    print("  Web Dashboard:    http://127.0.0.1:8000/")
    print("  Backend API:      http://127.0.0.1:8000/api/v1/health")
    print("  API Docs:         http://127.0.0.1:8000/api/docs")
    print("=" * 65)
    from app.main import app as fastapi_app
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="info")
