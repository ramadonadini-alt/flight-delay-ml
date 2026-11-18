from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class FlightPredictionRequest(BaseModel):
    booking_date: date
    departure_date: date
    booking_hour: int = Field(ge=0, le=23)
    booking_channel: Literal["Call Center", "Mobile App", "Travel Agent", "Website"]

    passenger_age: int = Field(ge=1, le=120)
    passenger_gender: Literal["Female", "Male", "Prefer not to say"]
    passenger_type: Literal["Adult", "Child", "Senior"]
    nationality: Literal["Australia", "China", "Indonesia", "Japan", "Malaysia", "Other", "Singapore"]
    passenger_count: int = Field(ge=1, le=20)
    frequent_flyer: Literal["No", "Yes"]

    airline: Literal["AirAsia", "Batik Air", "Citilink", "Garuda Indonesia", "Lion Air", "Super Air Jet"]
    origin: Literal["BPN", "BTH", "CGK", "DPS", "KNO", "LOP", "PDG", "PLM", "SOC", "SUB", "UPG", "YIA"]
    destination: Literal["BPN", "BTH", "CGK", "DPS", "KNO", "LOP", "PDG", "PLM", "SOC", "SUB", "UPG", "YIA"]
    flight_distance_km: float = Field(gt=0, le=15000)
    flight_duration_minutes: int = Field(gt=0, le=2000)
    departure_hour: int = Field(ge=0, le=23)
    transit_count: int = Field(ge=0, le=5)

    ticket_class: Literal["Business", "Economy", "First"]
    ticket_price_idr: float = Field(gt=0, le=500000000)
    payment_method: Literal["Bank Transfer", "Credit Card", "Debit Card", "E-Wallet", "Virtual Account"]
    baggage_count: int = Field(ge=0, le=10)
    previous_cancellation_history: int = Field(ge=0, le=50)

    @model_validator(mode="after")
    def validate_dates_and_route(self):
        days_before_departure = (self.departure_date - self.booking_date).days
        if days_before_departure < 0:
            raise ValueError("Tanggal keberangkatan tidak boleh lebih awal dari tanggal pemesanan.")
        if days_before_departure > 365:
            raise ValueError("Jarak tanggal pemesanan dan keberangkatan maksimal 365 hari.")
        if self.origin == self.destination:
            raise ValueError("Bandara asal dan tujuan harus berbeda.")
        age_range = {
            "Child": (1, 12, "Anak-anak"),
            "Adult": (13, 59, "Dewasa"),
            "Senior": (60, 120, "Lansia"),
        }[self.passenger_type]
        minimum_age, maximum_age, passenger_label = age_range
        if not minimum_age <= self.passenger_age <= maximum_age:
            raise ValueError(
                f"Usia untuk kategori {passenger_label} harus antara {minimum_age} sampai {maximum_age} tahun."
            )
        return self
