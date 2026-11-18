from datetime import date

import joblib
import numpy as np
import pandas as pd

from backend.config import CANCELLATION_MODEL_PATH, RISK_THRESHOLDS
from backend.schemas.prediction_schema import FlightPredictionRequest


def _season_for(date_value: date) -> str:
    if date_value.month in (12, 1, 2):
        return "Rainy Season"
    if date_value.month in (6, 7, 8):
        return "Dry Season"
    return "Transition Season"


def _risk_level(probability: float) -> str:
    if probability < RISK_THRESHOLDS["low"]:
        return "Low Risk"
    if probability < RISK_THRESHOLDS["medium"]:
        return "Medium Risk"
    return "High Risk"


FEATURE_LABELS = {
    "days_before_departure": "Jarak waktu pemesanan", "booking_hour": "Jam pemesanan",
    "booking_channel": "Kanal pemesanan", "passenger_age": "Usia penumpang",
    "passenger_gender": "Jenis kelamin", "passenger_type": "Kategori penumpang",
    "nationality": "Kewarganegaraan", "passenger_count": "Jumlah penumpang",
    "frequent_flyer": "Status frequent flyer", "airline": "Maskapai", "origin": "Bandara asal",
    "destination": "Bandara tujuan", "flight_distance_km": "Jarak penerbangan",
    "flight_duration_minutes": "Durasi penerbangan", "departure_hour": "Jam keberangkatan",
    "flight_day": "Hari keberangkatan", "ticket_class": "Kelas tiket", "ticket_price_idr": "Harga tiket",
    "payment_method": "Metode pembayaran", "baggage_count": "Jumlah bagasi", "season": "Musim",
    "previous_cancellation_history": "Riwayat pembatalan", "transit_count": "Jumlah transit",
}

VALUE_LABELS = {
    "Mobile App": "Aplikasi seluler", "Website": "Situs web", "Travel Agent": "Agen perjalanan", "Call Center": "Pusat panggilan",
    "Female": "Perempuan", "Male": "Laki-laki", "Prefer not to say": "Tidak menyebutkan",
    "Adult": "Dewasa", "Child": "Anak-anak", "Senior": "Lansia", "Yes": "Ya", "No": "Tidak",
    "Economy": "Ekonomi", "Business": "Bisnis", "First": "Kelas utama",
    "Bank Transfer": "Transfer bank", "Credit Card": "Kartu kredit", "Debit Card": "Kartu debit",
    "E-Wallet": "Dompet digital", "Virtual Account": "Akun virtual",
    "Rainy Season": "Musim hujan", "Dry Season": "Musim kemarau", "Transition Season": "Musim peralihan",
}


def _display_value(feature: str, value) -> str:
    if feature == "flight_distance_km":
        return f"{float(value):,.0f} km".replace(",", ".")
    if feature == "flight_duration_minutes":
        return f"{int(value)} menit"
    if feature == "passenger_age":
        return f"{int(value)} tahun"
    if feature == "days_before_departure":
        return f"{int(value)} hari"
    if feature == "ticket_price_idr":
        return f"Rp{float(value):,.0f}".replace(",", ".")
    if feature in {"baggage_count", "transit_count", "previous_cancellation_history"}:
        return str(int(value))
    if feature in {"booking_hour", "departure_hour"}:
        return f"{int(value):02d}.00"
    return VALUE_LABELS.get(str(value), str(value))


class PredictionService:
    def __init__(self):
        self.cancellation_model = self._load_model(CANCELLATION_MODEL_PATH)

    @staticmethod
    def _load_model(path):
        if not path.exists():
            return None
        try:
            return joblib.load(path)
        except Exception:
            return None

    @property
    def cancellation_ready(self) -> bool:
        return self.cancellation_model is not None

    @staticmethod
    def _payload_for_model(data: FlightPredictionRequest, model) -> pd.DataFrame:
        raw = data.model_dump()
        raw["days_before_departure"] = (data.departure_date - data.booking_date).days
        raw["flight_day"] = data.departure_date.strftime("%A")
        raw["season"] = _season_for(data.departure_date)
        frame = pd.DataFrame([raw])
        features = list(model.feature_names_in_)
        missing = [feature for feature in features if feature not in frame.columns]
        if missing:
            raise ValueError(f"Fitur model tidak dapat dibuat: {', '.join(missing)}")
        return frame[features]

    def predict_with(self, data: FlightPredictionRequest, model, label: str) -> dict:
        if model is None:
            raise FileNotFoundError(f"Model {label} belum tersedia.")
        input_data = self._payload_for_model(data, model)
        prediction = int(model.predict(input_data)[0])
        result = {"available": True, "prediction": prediction}
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(input_data)[0]
            probability_by_class = {
                str(model_class): round(float(probability), 6)
                for model_class, probability in zip(model.classes_, probabilities)
            }
            probability = float(probability_by_class.get("1", 0))
            result.update(
                probability=round(probability, 6),
                probability_percent=round(probability * 100, 2),
                risk_level=_risk_level(probability),
                probabilities=probability_by_class,
            )
            if label == "pembatalan":
                influencers = self._score_influencers(model, input_data)
                result["explanation"] = {
                    "message": (
                        f"Probabilitas {probability * 100:.1f}% berasal dari gabungan seluruh fitur yang diisi, "
                        "bukan dari satu penyebab tunggal."
                    ),
                    "risk_rule": (
                        "Risiko rendah di bawah 30%, menengah 30% sampai kurang dari 60%, "
                        "dan tinggi mulai 60%. Ambang ini adalah aturan tampilan aplikasi."
                    ),
                    "factors_considered": [
                        f"Tiket dipesan {(data.departure_date - data.booking_date).days} hari sebelum keberangkatan.",
                        f"Kanal pemesanan: {_display_value('booking_channel', data.booking_channel)}.",
                        f"Rute: {data.origin} ke {data.destination} dengan {data.airline}.",
                        f"Jadwal berangkat pukul {data.departure_hour:02d}.00; durasi {data.flight_duration_minutes} menit.",
                        f"Kelas {_display_value('ticket_class', data.ticket_class)}, {data.transit_count} transit, dan riwayat pembatalan {data.previous_cancellation_history} kali.",
                    ],
                    "score_influencers": influencers,
                    "influencer_note": (
                        "Arah ini menunjukkan pengaruh pada skor statistik model untuk data yang diisi, "
                        "bukan penyebab pasti pembatalan di dunia nyata."
                    ),
                }
        return result

    @staticmethod
    def _score_influencers(model, input_data: pd.DataFrame) -> list[dict]:
        """Return the strongest per-feature logistic-regression score contributions when available."""
        try:
            preprocessor = model.named_steps["preprocessor"]
            classifier = model.named_steps["classifier"]
            if np.asarray(classifier.coef_).shape[0] != 1 or str(classifier.classes_[1]) != "1":
                return []
            transformed = preprocessor.transform(input_data)
            values = np.asarray(transformed.toarray() if hasattr(transformed, "toarray") else transformed).ravel()
            feature_names = preprocessor.get_feature_names_out()
            coefficients = np.asarray(classifier.coef_)[0]
            if len(values) != len(coefficients) or len(values) != len(feature_names):
                return []

            scores = {feature: 0.0 for feature in input_data.columns}
            for feature_name, value, coefficient in zip(feature_names, values, coefficients):
                for feature in input_data.columns:
                    if feature_name == f"num__{feature}" or feature_name.startswith(f"cat__{feature}_"):
                        scores[feature] += float(value * coefficient)
                        break

            notable = [(feature, score) for feature, score in scores.items() if abs(score) >= 0.015]
            strongest = sorted(notable, key=lambda item: abs(item[1]), reverse=True)[:4]
            return [
                {
                    "feature": FEATURE_LABELS.get(feature, feature),
                    "value": _display_value(feature, input_data.iloc[0][feature]),
                    "direction": "menaikkan" if score > 0 else "menurunkan",
                }
                for feature, score in strongest
            ]
        except (AttributeError, KeyError, IndexError, TypeError, ValueError):
            return []

    def predict_cancellation(self, data: FlightPredictionRequest) -> dict:
        return self.predict_with(data, self.cancellation_model, "pembatalan")

    def prepared_summary(self, data: FlightPredictionRequest) -> dict:
        return {
            "booking_date": data.booking_date.isoformat(),
            "departure_date": data.departure_date.isoformat(),
            "days_before_departure": (data.departure_date - data.booking_date).days,
            "flight_day": data.departure_date.strftime("%A"),
            "season": _season_for(data.departure_date),
            "airline": data.airline,
            "origin": data.origin,
            "destination": data.destination,
            "departure_hour": data.departure_hour,
            "passenger_count": data.passenger_count,
            "ticket_class": data.ticket_class,
        }


prediction_service = PredictionService()
