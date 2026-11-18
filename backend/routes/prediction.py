from fastapi import APIRouter, HTTPException

from backend.schemas.prediction_schema import FlightPredictionRequest
from backend.services.prediction_service import prediction_service

router = APIRouter(prefix="/api", tags=["prediction"])


@router.post("/predict/cancellation")
def predict_cancellation(data: FlightPredictionRequest):
    if not prediction_service.cancellation_ready:
        raise HTTPException(status_code=503, detail="Model pembatalan belum tersedia atau gagal dimuat.")
    try:
        return {"success": True, "flight": prediction_service.prepared_summary(data), "cancellation": prediction_service.predict_cancellation(data)}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/predict")
def predict(data: FlightPredictionRequest):
    if not prediction_service.cancellation_ready:
        raise HTTPException(status_code=503, detail="Model pembatalan belum tersedia atau gagal dimuat.")
    try:
        return {
            "success": True,
            "flight": prediction_service.prepared_summary(data),
            "cancellation": prediction_service.predict_cancellation(data),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
