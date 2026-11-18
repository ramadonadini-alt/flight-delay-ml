from fastapi import APIRouter, HTTPException, Query

from backend.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    airline: str | None = Query(default=None),
    origin: str | None = Query(default=None),
    destination: str | None = Query(default=None),
    ticket_class: str | None = Query(default=None),
    season: str | None = Query(default=None),
):
    try:
        return analytics_service.analytics({
            "airline": airline,
            "origin": origin,
            "destination": destination,
            "ticket_class": ticket_class,
            "season": season,
        })
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/airlines")
def get_airlines():
    try:
        return analytics_service.airlines()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/routes")
def get_routes():
    try:
        return analytics_service.routes()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/route-details")
def get_route_details(origin: str = Query(min_length=3, max_length=3), destination: str = Query(min_length=3, max_length=3)):
    if origin == destination:
        raise HTTPException(status_code=422, detail="Bandara asal dan tujuan harus berbeda.")
    try:
        return analytics_service.route_details(origin, destination)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
