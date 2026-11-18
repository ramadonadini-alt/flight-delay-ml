from functools import lru_cache

import pandas as pd

from backend.config import DATASET_PATH


@lru_cache(maxsize=1)
def _dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError("Dataset penerbangan tidak ditemukan.")
    return pd.read_csv(DATASET_PATH)


def _filtered_dataset(filters: dict) -> pd.DataFrame:
    data = _dataset()
    filtered = data
    for column, value in filters.items():
        if value and column in filtered.columns:
            filtered = filtered[filtered[column] == value]
    return filtered


def _records(series: pd.Series) -> list[dict]:
    return [{"label": str(label), "value": int(value)} for label, value in series.items()]


def _rate_by(data: pd.DataFrame, group_column: str, target_column: str) -> list[dict]:
    grouped = data.groupby(group_column, dropna=False)[target_column].agg(["count", "sum", "mean"]).reset_index()
    return [
        {
            "label": str(row[group_column]),
            "flights": int(row["count"]),
            "events": int(row["sum"]),
            "rate": round(float(row["mean"]) * 100, 2),
        }
        for _, row in grouped.sort_values("count", ascending=False).iterrows()
    ]


def analytics(filters: dict) -> dict:
    data = _filtered_dataset(filters)
    total = len(data)
    cancelled = int(data["cancellation_status"].sum()) if total else 0
    return {
        "source": "dataset_simulasi",
        "filters": filters,
        "summary": {
            "total_flights": total,
            "total_cancelled": cancelled,
            "cancellation_rate": round((cancelled / total * 100) if total else 0, 2),
        },
        "charts": {
            "cancellation_by_airline": _rate_by(data, "airline", "cancellation_status"),
            "flights_by_airline": _records(data["airline"].value_counts()),
            "cancellation_by_origin": _rate_by(data, "origin", "cancellation_status"),
            "cancellation_by_destination": _rate_by(data, "destination", "cancellation_status"),
            "flights_by_ticket_class": _records(data["ticket_class"].value_counts()),
            "passenger_age": _records(pd.cut(data["passenger_age"], bins=[0, 12, 17, 34, 54, 120], include_lowest=True).value_counts().sort_index()),
            "booking_channel": _records(data["booking_channel"].value_counts()),
            "flights_by_season": _records(data["season"].value_counts()),
            "risk_outcomes": [
                {"label": "Cancelled", "value": cancelled},
                {"label": "Not Cancelled", "value": total - cancelled},
            ],
        },
    }


def airlines() -> dict:
    data = _dataset()
    return {"source": "dataset_simulasi", "items": _rate_by(data, "airline", "cancellation_status")}


def routes() -> dict:
    data = _dataset().copy()
    data["route"] = data["origin"] + " - " + data["destination"]
    return {"source": "dataset_simulasi", "items": _rate_by(data, "route", "cancellation_status")[:30]}


def route_details(origin: str, destination: str) -> dict:
    data = _dataset()
    route_data = data[(data["origin"] == origin) & (data["destination"] == destination)]
    if route_data.empty:
        raise LookupError("Rute tidak ditemukan pada dataset referensi.")
    return {
        "source": "dataset_simulasi",
        "origin": origin,
        "destination": destination,
        "flight_distance_km": int(round(route_data["flight_distance_km"].median())),
        "flight_duration_minutes": int(round(route_data["flight_duration_minutes"].median())),
        "sample_size": int(len(route_data)),
    }
