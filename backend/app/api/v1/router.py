from fastapi import APIRouter
from app.api.v1 import ops, datasets, analytics, chat, reports, quality, findings, forecasting, scenarios, settings as settings_api

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(ops.router)
api_v1_router.include_router(datasets.router)
api_v1_router.include_router(analytics.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(quality.router)
api_v1_router.include_router(findings.router)
api_v1_router.include_router(forecasting.router)
api_v1_router.include_router(scenarios.router)
api_v1_router.include_router(settings_api.router)


