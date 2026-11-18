from datetime import date

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from backend.config import CANCELLATION_MODEL_PATH, RISK_THRESHOLDS, STATIC_DIR
from backend.routes.analytics import router as analytics_router
from backend.routes.prediction import router as prediction_router
from backend.schemas.prediction_schema import FlightPredictionRequest


def load_model(path):
    """Muat model joblib; kembalikan None jika file tidak tersedia/gagal dibaca."""
    if not path.exists():
        return None
    try:
        return joblib.load(path)
    except Exception:
        return None


cancellation_model = load_model(CANCELLATION_MODEL_PATH)


def season_for(date_value: date) -> str:
    if date_value.month in (12, 1, 2):
        return "Rainy Season"
    if date_value.month in (6, 7, 8):
        return "Dry Season"
    return "Transition Season"

app = FastAPI(
    title="Flight Risk Prediction API",
    description="API untuk estimasi peluang pembatalan penerbangan.",
    version="2.0.0",
)

# Route utama proyek, termasuk POST /api/predict dan endpoint analitik.
app.include_router(prediction_router)
app.include_router(analytics_router)


@app.get("/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "models": {"cancellation": cancellation_model is not None},
    }


@app.post("/predict", tags=["prediction"])
def predict(data: FlightPredictionRequest):
    """Alias POST /predict untuk prediksi pembatalan penerbangan."""
    if cancellation_model is None:
        raise HTTPException(
            status_code=503,
            detail="Model pembatalan belum tersedia atau gagal dimuat.",
        )
    try:
        # Bentuk semua fitur model langsung di app.py.
        features = data.model_dump()
        features["days_before_departure"] = (data.departure_date - data.booking_date).days
        features["flight_day"] = data.departure_date.strftime("%A")
        features["season"] = season_for(data.departure_date)
        model_input = pd.DataFrame([features])

        # Gunakan urutan dan kolom yang model terima saat training.
        model_features = list(cancellation_model.feature_names_in_)
        missing = [name for name in model_features if name not in model_input.columns]
        if missing:
            raise ValueError(f"Fitur model tidak dapat dibuat: {', '.join(missing)}")
        model_input = model_input[model_features]

        prediction = int(cancellation_model.predict(model_input)[0])
        result = {"available": True, "prediction": prediction}
        if hasattr(cancellation_model, "predict_proba"):
            probabilities = cancellation_model.predict_proba(model_input)[0]
            probability_by_class = {
                str(model_class): round(float(probability), 6)
                for model_class, probability in zip(cancellation_model.classes_, probabilities)
            }
            probability = float(probability_by_class.get("1", 0))
            if probability < RISK_THRESHOLDS["low"]:
                risk_level = "Low Risk"
            elif probability < RISK_THRESHOLDS["medium"]:
                risk_level = "Medium Risk"
            else:
                risk_level = "High Risk"
            result.update(
                probability=round(probability, 6),
                probability_percent=round(probability * 100, 2),
                risk_level=risk_level,
                probabilities=probability_by_class,
            )
        return {
            "success": True,
            "flight": {
                "booking_date": data.booking_date.isoformat(),
                "departure_date": data.departure_date.isoformat(),
                "days_before_departure": features["days_before_departure"],
                "flight_day": features["flight_day"],
                "season": features["season"],
                "airline": data.airline,
                "origin": data.origin,
                "destination": data.destination,
                "departure_hour": data.departure_hour,
                "passenger_count": data.passenger_count,
                "ticket_class": data.ticket_class,
            },
            "cancellation": result,
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.middleware("http")
async def prevent_stale_frontend(request, call_next):
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.endswith((".html", ".js", ".css")):
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


# Static mount harus terakhir supaya tidak menutupi endpoint API.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
