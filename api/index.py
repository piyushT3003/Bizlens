import os
import sys
import shutil
from pathlib import Path

# Identify project roots
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Add backend directory to sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Serverless environment initialization: Vercel / Lambda have read-only filesystems except /tmp
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if is_serverless:
    # 1. Setup writable SQLite database in /tmp
    tmp_db = Path("/tmp/bizlens.db")
    src_db = BACKEND_DIR / "bizlens.db"
    if not tmp_db.exists() and src_db.exists():
        try:
            shutil.copy2(src_db, tmp_db)
        except Exception as e:
            print(f"Error copying bizlens.db to /tmp: {e}")

    # 2. Setup writable storage directory in /tmp
    tmp_storage = Path("/tmp/storage")
    src_storage = BACKEND_DIR / "storage"
    if not tmp_storage.exists() and src_storage.exists():
        try:
            shutil.copytree(src_storage, tmp_storage, dirs_exist_ok=True)
        except Exception as e:
            print(f"Error copying storage to /tmp: {e}")

    # Point environment variables so config.py picks them up
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db.as_posix()}"
    os.environ["STORAGE_ROOT"] = str(tmp_storage.resolve())

# Import the FastAPI application
from app.main import app

try:
    from mangum import Mangum
    handler = Mangum(app)
except Exception:
    handler = app
