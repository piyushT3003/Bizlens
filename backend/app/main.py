import time
import uuid
from typing import Callable
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.errors import (
    BizLensError,
    ErrorEnvelope,
    ErrorDetail,
    ERR_INTERNAL,
    ERR_VALIDATION,
)
from app.api.v1.router import api_v1_router
from app.db.init_db import init_db

# Initialize structured logging
setup_logging()


class RequestIdAndSecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        # 1. Generate or extract Request ID
        request_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        request.state.request_id = request_id

        start_time = time.time()
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error("unhandled_request_error", path=request.url.path, duration_ms=duration_ms, error=str(exc))
            raise exc

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("http_request", path=request.url.path, method=request.method, status_code=response.status_code, duration_ms=duration_ms)

        # 2. Inject security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: "
            "https://fonts.googleapis.com https://fonts.gstatic.com "
            "https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none';"
        )
        return response


from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app_starting", env=settings.APP_ENV)
    init_db()
    logger.info("app_ready")
    yield
    logger.info("app_stopping")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# Attach Middlewares
app.add_middleware(RequestIdAndSecurityHeadersMiddleware)

_raw_origins = settings.cors_origin_list
if "*" in _raw_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    _safe_origins = [o for o in _raw_origins if "*" not in o]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_safe_origins,
        allow_origin_regex=r"^https://([a-zA-Z0-9_-]+\.)*netlify\.app$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Exception Handlers enforcing ErrorEnvelope contract
@app.exception_handler(BizLensError)
async def handle_bizlens_error(request: Request, exc: BizLensError):
    req_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                details=exc.details,
                request_id=req_id,
            )
        ).model_dump(),
    )


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException):
    req_id = getattr(request.state, "request_id", None)
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=code,
                message=str(exc.detail),
                details=None,
                request_id=req_id,
            )
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", None)
    details = {"errors": exc.errors()}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=ERR_VALIDATION,
                message="Invalid input data format.",
                details=details,
                request_id=req_id,
            )
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def handle_generic_exception(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", None)
    logger.error("internal_server_error", error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=ERR_INTERNAL,
                message="An unexpected server error occurred. Please try again later.",
                details=None,
                request_id=req_id,
            )
        ).model_dump(),
    )


# Attach API routes
app.include_router(api_v1_router)

# Mount Frontend SPA Build if available
from pathlib import Path
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path("frontend/dist"),
    Path("../frontend/dist"),
]

dist_dir = None
for c in candidates:
    if c.exists() and (c / "index.html").exists():
        dist_dir = c.resolve()
        break

if dist_dir:
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(str(dist_dir / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = dist_dir / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(dist_dir / "index.html"))
