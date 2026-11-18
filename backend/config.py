from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
DATASET_PATH = BASE_DIR / "dataset" / "flight_cancellation_dataset_10000.csv"
EVALUATION_DIR = BASE_DIR / "evaluation"
MODEL_DIR = BASE_DIR / "model"
CANCELLATION_MODEL_PATH = MODEL_DIR / "model_flight_cancellation.joblib"

RISK_THRESHOLDS = {"low": 0.30, "medium": 0.60}
