"""
BizLens Enterprise Application Launcher
Run the entire project with a single command:
    python app.py

Optional flags:
    python app.py --dev    # Launches FastAPI backend + Vite frontend concurrently with hot-reloading
"""
import os
import sys
import time
import argparse
import webbrowser
import threading
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

# Set working directory to backend so sqlite and storage paths resolve consistently
os.chdir(BACKEND_DIR)

# Clean sys.path so ROOT_DIR does not shadow backend/app package
while str(ROOT_DIR) in sys.path:
    sys.path.remove(str(ROOT_DIR))
while "" in sys.path:
    sys.path.remove("")
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.environ["PYTHONPATH"] = str(BACKEND_DIR) + os.pathsep + os.environ.get("PYTHONPATH", "")


def ensure_port_free(port: int = 8000):
    """Ensure the target port is free before starting Uvicorn, preventing [Errno 10048]."""
    try:
        current_pid = os.getpid()
        if os.name == "nt":
            out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, stderr=subprocess.DEVNULL).decode()
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and parts[1].endswith(f":{port}") and parts[3] == "LISTENING":
                    pid = int(parts[4])
                    if pid != current_pid and pid > 0:
                        print(f"[BizLens] Freeing port {port} (terminating lingering process PID {pid})...")
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True, check=False)
                        time.sleep(1.0)
    except Exception:
        pass


def open_browser(url: str, delay: float = 1.5):
    """Open default web browser after server initializes."""
    def _open():
        time.sleep(delay)
        try:
            print(f"[BizLens] Opening application in browser: {url}")
            webbrowser.open(url)
        except Exception:
            pass
    threading.Thread(target=_open, daemon=True).start()


def ensure_frontend_deps():
    """Install frontend npm dependencies automatically on a fresh clone if missing."""
    use_shell = os.name == "nt"
    vite_bin = FRONTEND_DIR / "node_modules" / ".bin" / ("vite.cmd" if os.name == "nt" else "vite")
    if not vite_bin.exists():
        print("[BizLens] Installing frontend dependencies (one-time setup)...")
        res = subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), shell=use_shell)
        if res.returncode != 0:
            raise RuntimeError("Failed to install frontend dependencies via 'npm install'. Ensure Node.js 18+ and npm are installed.")


def run_dev_mode():
    """Concurrently run FastAPI backend (8000) and Vite frontend (5173) with hot reload."""
    ensure_port_free(8000)
    use_shell = os.name == "nt"
    print("=" * 65)
    print("  BizLens - Autonomous BI Engine [DEVELOPMENT MODE]")
    print("  Backend API:      http://127.0.0.1:8000")
    print("  Frontend UI:      http://localhost:5173/")
    print("  API Docs:         http://127.0.0.1:8000/api/docs")
    print("=" * 65)

    ensure_frontend_deps()

    # Launch Vite in background
    print("[BizLens] Starting Vite Frontend Dev Server...")
    frontend_proc = subprocess.Popen(["npm", "run", "dev"], cwd=str(FRONTEND_DIR), shell=use_shell)

    open_browser("http://localhost:5173/", delay=2.0)

    try:
        import uvicorn
        print("[BizLens] Starting FastAPI Backend...")
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=str(BACKEND_DIR))
    except KeyboardInterrupt:
        print("\n[BizLens] Shutting down development servers...")
    finally:
        if frontend_proc:
            try:
                frontend_proc.terminate()
            except Exception:
                pass


def run_unified_mode():
    """Run unified full-stack application from FastAPI on port 8000 (serves frontend + backend)."""
    ensure_port_free(8000)
    use_shell = os.name == "nt"
    # Verify frontend dist exists; if not, install npm deps (if needed) and build automatically
    if not (DIST_DIR / "index.html").exists():
        ensure_frontend_deps()
        print("[BizLens] Production frontend build not found. Building with Vite...")
        res = subprocess.run(["npm", "run", "build"], cwd=str(FRONTEND_DIR), shell=use_shell)
        if res.returncode != 0:
            raise RuntimeError("Frontend build failed ('npm run build').")

    print("=" * 65)
    print("  BizLens - Enterprise BI Engine & Copilot")
    print("  Web Dashboard:    http://127.0.0.1:8000/")
    print("  Backend API:      http://127.0.0.1:8000/api/v1/health")
    print("  Interactive Docs: http://127.0.0.1:8000/api/docs")
    print("=" * 65)

    open_browser("http://127.0.0.1:8000/", delay=1.5)

    import uvicorn
    from app.main import app as fastapi_app
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BizLens Enterprise Application Launcher")
    parser.add_argument("--dev", action="store_true", help="Launch in development mode with live Vite frontend hot-reloading")
    args = parser.parse_args()

    if args.dev:
        run_dev_mode()
    else:
        run_unified_mode()
