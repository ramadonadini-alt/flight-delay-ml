from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.config import STATIC_DIR
from backend.routes.analytics import router as analytics_router
from backend.routes.prediction import router as prediction_router
from backend.services.prediction_service import prediction_service

app = FastAPI(
    title="Flight Risk Prediction API",
    description="API untuk estimasi peluang pembatalan penerbangan.",
    version="2.0.0",
)

app.include_router(prediction_router)
app.include_router(analytics_router)


@app.middleware("http")
async def prevent_stale_frontend(request, call_next):
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.endswith((".html", ".js", ".css")):
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "models": {
            "cancellation": prediction_service.cancellation_ready,
        },
    }


@app.get("/health", include_in_schema=False)
def legacy_health():
    return health()


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
