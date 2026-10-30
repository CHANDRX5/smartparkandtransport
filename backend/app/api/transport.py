"""SmartPark AI - Transport & Route Planning API Routes."""
import math
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
import uuid
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.transport import (
    TransportRoute, TransportStop, TransportObservation,
    RouteHistory, AIPrediction, Notification,
    BusService, BusTrip, BusBooking, NearbyPlace, Complaint
)
from app.models.payment import Wallet, WalletTransaction
from app.schemas.transport import (
    TransportRouteOut, TransportStopOut, CrowdPredictionRequest, CrowdPredictionOut,
    RoutePlanRequest, RouteOut, RouteHistoryOut, NearbySearchRequest, NearbyFacilityOut,
    BusServiceCreate, BusServiceOut, BusSeatMapOut, BusSeatStatus,
    BusBookingCreate, BusBookingOut,
    NearbyPlaceCreate, NearbyPlaceOut,
    ComplaintCreate, ComplaintOut, ComplaintStatusUpdate, EmergencyContactOut,
    WeatherPointOut, WeatherVerifyOut, WeatherForecastOut, WeatherForecastItem
)
from app.models.parking import ParkingFacility

router = APIRouter(prefix="/transport", tags=["Transport & Routes"])



# --- Transport Routes ---
@router.get("/routes", response_model=list[TransportRouteOut])
def list_transport_routes(
    query: Optional[str] = None,
    route_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List transport routes."""
    q = db.query(TransportRoute).filter(TransportRoute.is_active == True)
    if query:
        q = q.filter(
            TransportRoute.route_name.ilike(f"%{query}%") |
            TransportRoute.route_number.ilike(f"%{query}%")
        )
    if route_type:
        q = q.filter(TransportRoute.route_type == route_type)
    return [TransportRouteOut.model_validate(r) for r in q.all()]


@router.get("/routes/{route_id}/stops", response_model=list[TransportStopOut])
def list_route_stops(route_id: int, db: Session = Depends(get_db)):
    """List stops for a transport route."""
    stops = db.query(TransportStop).filter(
        TransportStop.route_id == route_id
    ).order_by(TransportStop.stop_order).all()
    return [TransportStopOut.model_validate(s) for s in stops]


# --- Crowd Prediction ---
@router.post("/crowd-prediction", response_model=CrowdPredictionOut)
def predict_crowd(
    data: CrowdPredictionRequest,
    db: Session = Depends(get_db),
):
    """Predict crowd level for a transport route at given time."""
    route = db.query(TransportRoute).filter(TransportRoute.id == data.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    now = datetime.now(timezone.utc)
    day = data.day_of_week if data.day_of_week is not None else now.weekday()
    hour = data.hour_of_day if data.hour_of_day is not None else now.hour

    # Check for historical observations
    observations = db.query(TransportObservation).filter(
        TransportObservation.route_id == data.route_id,
        TransportObservation.day_of_week == day,
    ).all()

    if observations:
        # Average crowd percentage from observations at similar hours
        similar = [o for o in observations if abs(o.hour_of_day - hour) <= 1]
        if similar:
            avg_pct = sum(o.crowd_percentage or 50.0 for o in similar) / len(similar)
        else:
            avg_pct = sum(o.crowd_percentage or 50.0 for o in observations) / len(observations)
    else:
        # Demo prediction based on time patterns
        avg_pct = _demo_crowd_prediction(day, hour)

    # Determine crowd level
    if avg_pct < 30:
        level = "low"
    elif avg_pct < 60:
        level = "moderate"
    elif avg_pct < 85:
        level = "high"
    else:
        level = "very_high"

    # Peak hours (demo pattern)
    peak_hours = [8, 9, 17, 18, 19]
    alt_times = [h for h in range(6, 22) if h not in peak_hours and abs(h - hour) <= 3]

    # Save prediction
    pred = AIPrediction(
        prediction_type="transport",
        route_id=data.route_id,
        target_datetime=now,
        day_of_week=day,
        hour_of_day=hour,
        predicted_crowd_level=level,
        predicted_occupancy=avg_pct / 100,
        confidence=0.6 if not observations else 0.75,
        is_demo_prediction=len(observations) == 0,
        model_version="rule_based_v1",
    )
    db.add(pred)
    db.commit()

    return CrowdPredictionOut(
        route_id=route.id,
        route_name=route.route_name,
        day_of_week=day,
        hour_of_day=hour,
        crowd_level=level,
        crowd_percentage=round(avg_pct, 1),
        confidence=pred.confidence,
        peak_hours=peak_hours,
        alternative_times=alt_times[:4],
        is_demo_prediction=pred.is_demo_prediction,
        explanation=f"{'Demo estimate' if pred.is_demo_prediction else 'Based on historical observations'}: "
                    f"Expected {level} crowding ({avg_pct:.0f}%) at hour {hour} on day {day}.",
    )


def _demo_crowd_prediction(day: int, hour: int) -> float:
    """Generate realistic demo crowd patterns."""
    # Weekend vs weekday
    is_weekend = day >= 5
    if is_weekend:
        if 10 <= hour <= 14:
            return 55.0
        elif 16 <= hour <= 20:
            return 65.0
        else:
            return 25.0
    else:
        # Weekday rush hours
        if 7 <= hour <= 9:
            return 85.0
        elif 17 <= hour <= 19:
            return 90.0
        elif 12 <= hour <= 14:
            return 50.0
        elif 6 <= hour <= 22:
            return 35.0
        else:
            return 10.0


# --- Route Planner ---
@router.post("/route-plan", response_model=RouteOut)
async def plan_route(
    data: RoutePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Plan a route between two points using OSRM."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = (
            f"{settings.OSRM_API_URL}/route/v1/driving/"
            f"{data.origin_lng},{data.origin_lat};"
            f"{data.destination_lng},{data.destination_lat}"
            f"?overview=full&geometries=geojson&steps=true&alternatives=true"
        )

        if data.route_type == "toll_free":
            url += "&exclude=toll"

        response = await client.get(url)
        result = response.json()
    
        if result.get("code") != "Ok" or not result.get("routes"):
            raise HTTPException(status_code=404, detail="No route found. Try different locations.")

        route = result["routes"][0]
        distance_km = round(route["distance"] / 1000, 2)
        duration_min = round(route["duration"] / 60, 1)

        # Extract geometry
        geometry = route.get("geometry", {}).get("coordinates", [])
        # Convert [lng, lat] to [lat, lng] for Leaflet
        geometry_latlon = [[coord[1], coord[0]] for coord in geometry]

        # Extract step instructions
        instructions = []
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                maneuver = step.get("maneuver", {})
                name = step.get("name", "")
                instruction = maneuver.get("type", "continue")
                if name:
                    instruction += f" on {name}"
                instructions.append(instruction)

        route_out = RouteOut(
            distance_km=distance_km,
            duration_minutes=duration_min,
            route_type=data.route_type,
            geometry=geometry_latlon,
            instructions=instructions[:20],
            data_source="OSRM (Open Source Routing Machine)",
            last_updated=datetime.now(timezone.utc).isoformat(),
        )

        # Add weather info if requested
        if data.route_type == "weather_aware":
            route_out.weather_info = await _get_route_weather(
                data.origin_lat, data.origin_lng,
                data.destination_lat, data.destination_lng
            )


# --- Weather Service Integration (OpenWeatherMap + Open-Meteo Fallback) ---
WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
}


def _mask_api_key(key: Optional[str]) -> Optional[str]:
    """Mask sensitive API key for safe display (never show full secret)."""
    if not key or len(key) < 8:
        return None
    return f"{key[:4]}...{key[-4:]}"


async def fetch_point_weather(lat: float, lng: float, location: str = "Location") -> dict:
    """
    Fetch real-time weather using OpenWeatherMap when configured,
    with automatic graceful fallback to Open-Meteo or regional baseline.
    Handles invalid keys (401), rate limits (429), timeouts, and network errors safely.
    Secret keys are never printed in logs or returned.
    """
    api_key = settings.effective_weather_api_key

    # 1. Try OpenWeatherMap if configured
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{settings.WEATHER_API_URL}/weather",
                    params={"lat": lat, "lon": lng, "appid": api_key, "units": "metric"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    main_data = data.get("main", {})
                    weather_desc = data.get("weather", [{}])[0].get("description", "Clear").title()
                    icon_code = data.get("weather", [{}])[0].get("icon")
                    wind_data = data.get("wind", {})
                    return {
                        "location": location,
                        "lat": lat,
                        "lng": lng,
                        "temp_c": round(main_data.get("temp", 25.0), 1),
                        "feels_like_c": round(main_data.get("feels_like", main_data.get("temp", 25.0)), 1),
                        "description": weather_desc,
                        "humidity": main_data.get("humidity"),
                        "wind_speed": round(wind_data.get("speed", 0.0), 1),
                        "pressure": main_data.get("pressure"),
                        "visibility_km": round(data.get("visibility", 10000) / 1000, 1),
                        "icon": icon_code,
                        "source": "OpenWeatherMap API",
                        "status": "live_openweathermap",
                        "warning": None,
                    }
                elif resp.status_code == 401:
                    # Key is inactive or unauthorized; fallback smoothly
                    pass
                elif resp.status_code == 429:
                    # Rate limit exceeded; fallback smoothly
                    pass
        except Exception:
            # Network error or timeout; fallback smoothly
            pass

    # 2. Open-Meteo Fallback (High precision, public meteorological service)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "current_weather": "true",
                    "hourly": "relative_humidity_2m,surface_pressure,visibility"
                }
            )
            if resp.status_code == 200:
                body = resp.json()
                cw = body.get("current_weather", {})
                code = cw.get("weathercode", 0)
                desc = WMO_CODES.get(code, "Clear Sky")

                hourly = body.get("hourly", {})
                humidity = hourly.get("relative_humidity_2m", [None])[0] if hourly.get("relative_humidity_2m") else 55
                pressure = int(hourly.get("surface_pressure", [1013])[0]) if hourly.get("surface_pressure") else 1013
                visibility_m = hourly.get("visibility", [10000])[0] if hourly.get("visibility") else 10000

                return {
                    "location": location,
                    "lat": lat,
                    "lng": lng,
                    "temp_c": round(cw.get("temperature", 25.0), 1),
                    "feels_like_c": round(cw.get("temperature", 25.0), 1),
                    "description": desc,
                    "humidity": humidity,
                    "wind_speed": round(cw.get("windspeed", 5.0), 1),
                    "pressure": pressure,
                    "visibility_km": round(visibility_m / 1000, 1) if visibility_m else 10.0,
                    "icon": "01d" if cw.get("is_day", 1) == 1 else "01n",
                    "source": "Open-Meteo Meteorological Service (Fallback)",
                    "status": "live_open_meteo_fallback",
                    "warning": "OpenWeatherMap key inactive/limited; served via Open-Meteo live feed." if api_key else None,
                }
    except Exception:
        pass

    # 3. Regional Meteorological Baseline (Ensures zero crashes for offline / cold starts)
    return {
        "location": location,
        "lat": lat,
        "lng": lng,
        "temp_c": 26.5,
        "feels_like_c": 27.0,
        "description": "Partly Cloudy (Baseline)",
        "humidity": 65,
        "wind_speed": 12.0,
        "pressure": 1012,
        "visibility_km": 10.0,
        "icon": "02d",
        "source": "Regional Meteorological Baseline",
        "status": "regional_baseline",
        "warning": "Live meteorological providers currently unreachable; displaying regional baseline.",
    }


async def fetch_weather_forecast(lat: float, lng: float, location: str = "Location", days: int = 3) -> dict:
    """Fetch multi-day weather forecast with OpenWeatherMap + Open-Meteo fallback."""
    api_key = settings.effective_weather_api_key
    forecast_items = []

    # 1. Try OpenWeatherMap 5-day / 3-hour forecast
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{settings.WEATHER_API_URL}/forecast",
                    params={"lat": lat, "lon": lng, "appid": api_key, "units": "metric"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for entry in data.get("list", [])[:8 * days:2]:
                        forecast_items.append({
                            "datetime": entry.get("dt_txt", ""),
                            "temp_c": round(entry.get("main", {}).get("temp", 25.0), 1),
                            "description": entry.get("weather", [{}])[0].get("description", "Clear").title(),
                            "humidity": entry.get("main", {}).get("humidity"),
                            "wind_speed": round(entry.get("wind", {}).get("speed", 0.0), 1),
                            "rain_prob": round(entry.get("pop", 0.0) * 100, 0),
                        })
                    if forecast_items:
                        return {
                            "location": location,
                            "lat": lat,
                            "lng": lng,
                            "source": "OpenWeatherMap API",
                            "forecasts": forecast_items,
                        }
        except Exception:
            pass

    # 2. Open-Meteo Forecast Fallback
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "hourly": "temperature_2m,precipitation_probability,weathercode,windspeed_10m",
                    "forecast_days": days
                }
            )
            if resp.status_code == 200:
                h = resp.json().get("hourly", {})
                times = h.get("time", [])
                temps = h.get("temperature_2m", [])
                probs = h.get("precipitation_probability", [])
                codes = h.get("weathercode", [])
                winds = h.get("windspeed_10m", [])

                for idx in range(0, min(len(times), days * 24), 6):
                    code = codes[idx] if idx < len(codes) else 0
                    forecast_items.append({
                        "datetime": times[idx],
                        "temp_c": round(temps[idx], 1) if idx < len(temps) else 25.0,
                        "description": WMO_CODES.get(code, "Clear Sky"),
                        "humidity": 60,
                        "wind_speed": round(winds[idx], 1) if idx < len(winds) else 10.0,
                        "rain_prob": float(probs[idx]) if idx < len(probs) else 0.0,
                    })
                return {
                    "location": location,
                    "lat": lat,
                    "lng": lng,
                    "source": "Open-Meteo Meteorological Service (Fallback)",
                    "forecasts": forecast_items,
                }
    except Exception:
        pass

    # 3. Baseline forecast
    return {
        "location": location,
        "lat": lat,
        "lng": lng,
        "source": "Regional Meteorological Baseline",
        "forecasts": [
            {
                "datetime": datetime.now(timezone.utc).isoformat(),
                "temp_c": 27.0,
                "description": "Partly Cloudy",
                "humidity": 65,
                "wind_speed": 10.0,
                "rain_prob": 15.0
            }
        ],
    }


async def _get_route_weather(lat1, lng1, lat2, lng2):
    """Fetch real-time weather for route endpoints using extended weather service."""
    points = [("Origin", lat1, lng1), ("Destination", lat2, lng2)]
    weather_info = []
    for label, lat, lng in points:
        weather_info.append(await fetch_point_weather(lat, lng, location=label))
    return weather_info


# --- Weather Endpoints ---
@router.get("/weather", response_model=WeatherPointOut)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    location: Optional[str] = Query("Location", description="Location name or label"),
):
    """
    Get live weather data for coordinates.
    Connects to OpenWeatherMap using backend-configured key with automatic Open-Meteo fallback.
    Never exposes API keys to client.
    """
    return await fetch_point_weather(lat, lng, location=location)


@router.get("/weather/forecast", response_model=WeatherForecastOut)
async def get_weather_forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    location: Optional[str] = Query("Location", description="Location name"),
    days: int = Query(3, ge=1, le=5, description="Forecast days (1-5)"),
):
    """Get multi-day weather forecast for coordinates."""
    return await fetch_weather_forecast(lat, lng, location=location, days=days)


@router.get("/weather/verify", response_model=WeatherVerifyOut)
async def verify_weather_api():
    """
    Diagnostic endpoint to verify OpenWeatherMap API connection using configured key.
    Checks HTTP connection, validates responses (200, 401, 429), and reports fallback status.
    The secret key is masked and never exposed in full.
    """
    key = settings.effective_weather_api_key
    masked = _mask_api_key(key)
    endpoint = f"{settings.WEATHER_API_URL}/weather"

    if not key:
        return WeatherVerifyOut(
            configured=False,
            key_present=False,
            key_masked=None,
            endpoint=endpoint,
            api_status="not_configured",
            http_code=None,
            fallback_active=True,
            fallback_provider="Open-Meteo Meteorological Service",
            message="No OpenWeatherMap API key configured in backend/.env. Open-Meteo fallback is active."
        )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                endpoint,
                params={"lat": 12.9716, "lon": 77.5946, "appid": key, "units": "metric"}
            )
            http_code = resp.status_code
            if http_code == 200:
                return WeatherVerifyOut(
                    configured=True,
                    key_present=True,
                    key_masked=masked,
                    endpoint=endpoint,
                    api_status="active",
                    http_code=200,
                    fallback_active=False,
                    fallback_provider="Open-Meteo Meteorological Service",
                    message="OpenWeatherMap API connection verified successfully! Live data is active."
                )
            elif http_code == 401:
                return WeatherVerifyOut(
                    configured=True,
                    key_present=True,
                    key_masked=masked,
                    endpoint=endpoint,
                    api_status="unauthorized",
                    http_code=401,
                    fallback_active=True,
                    fallback_provider="Open-Meteo Meteorological Service",
                    message="Key configured in .env; OpenWeatherMap returned 401 Unauthorized (key may be pending activation by OpenWeatherMap or invalid). Open-Meteo live fallback is fully active."
                )
            elif http_code == 429:
                return WeatherVerifyOut(
                    configured=True,
                    key_present=True,
                    key_masked=masked,
                    endpoint=endpoint,
                    api_status="rate_limited",
                    http_code=429,
                    fallback_active=True,
                    fallback_provider="Open-Meteo Meteorological Service",
                    message="OpenWeatherMap rate limit reached (429). Open-Meteo fallback is handling requests."
                )
            else:
                return WeatherVerifyOut(
                    configured=True,
                    key_present=True,
                    key_masked=masked,
                    endpoint=endpoint,
                    api_status="error",
                    http_code=http_code,
                    fallback_active=True,
                    fallback_provider="Open-Meteo Meteorological Service",
                    message=f"OpenWeatherMap returned HTTP {http_code}. Open-Meteo fallback is handling requests."
                )
    except Exception as exc:
        return WeatherVerifyOut(
            configured=True,
            key_present=True,
            key_masked=masked,
            endpoint=endpoint,
            api_status="network_error",
            http_code=None,
            fallback_active=True,
            fallback_provider="Open-Meteo Meteorological Service",
            message=f"Network error connecting to OpenWeatherMap ({type(exc).__name__}). Open-Meteo fallback is active."
        )




@router.get("/route-history", response_model=list[RouteHistoryOut])
def get_route_history(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's recent route history."""
    routes = db.query(RouteHistory).filter(
        RouteHistory.user_id == current_user.id
    ).order_by(RouteHistory.created_at.desc()).limit(limit).all()
    return [RouteHistoryOut.model_validate(r) for r in routes]


# --- GPS Nearby Facilities ---
@router.post("/nearby", response_model=list[NearbyFacilityOut])
def find_nearby(
    data: NearbySearchRequest,
    db: Session = Depends(get_db),
):
    """Find nearby facilities (parking, hospitals, etc.)."""
    from app.api.parking import haversine_distance

    results = []

    if data.facility_type == "parking":
        facilities = db.query(ParkingFacility).filter(ParkingFacility.is_active == True).all()
        for f in facilities:
            dist = haversine_distance(data.latitude, data.longitude, f.latitude, f.longitude)
            if dist <= data.radius_km:
                results.append(NearbyFacilityOut(
                    id=f.id,
                    name=f.name,
                    address=f.address,
                    latitude=f.latitude,
                    longitude=f.longitude,
                    distance_km=round(dist, 2),
                    facility_type="parking",
                    details={
                        "available_spaces": f.available_spaces,
                        "price_per_hour": f.price_per_hour,
                        "total_capacity": f.total_capacity,
                    },
                ))
    else:
        # For non-parking facilities, use Overpass API (OpenStreetMap)
        try:
            overpass_types = {
                "hospital": "amenity=hospital",
                "fuel": "amenity=fuel",
                "ev_charging": "amenity=charging_station",
                "pharmacy": "amenity=pharmacy",
                "atm": "amenity=atm",
            }
            osm_tag = overpass_types.get(data.facility_type, f"amenity={data.facility_type}")

            # Use Overpass API
            overpass_url = "https://overpass-api.de/api/interpreter"
            query = f"""
            [out:json][timeout:10];
            node[{osm_tag}](around:{int(data.radius_km * 1000)},{data.latitude},{data.longitude});
            out body 20;
            """

            import httpx
            resp = httpx.post(overpass_url, data={"data": query}, timeout=10.0)
            if resp.status_code == 200:
                elements = resp.json().get("elements", [])
                for el in elements[:20]:
                    lat = el.get("lat", 0)
                    lon = el.get("lon", 0)
                    dist = haversine_distance(data.latitude, data.longitude, lat, lon)
                    results.append(NearbyFacilityOut(
                        name=el.get("tags", {}).get("name", f"Unknown {data.facility_type}"),
                        address=el.get("tags", {}).get("addr:street", ""),
                        latitude=lat,
                        longitude=lon,
                        distance_km=round(dist, 2),
                        facility_type=data.facility_type,
                    ))
        except Exception:
            pass  # Return empty if API fails

    results.sort(key=lambda x: x.distance_km)
    return results


# ─── BUS SERVICES & CONCURRENCY-SAFE SEAT BOOKING ────────────────────────────

@router.get("/buses", response_model=List[BusServiceOut])
def list_buses(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List available bus services with optional route and operator filters."""
    query = db.query(BusService).filter(BusService.is_active == True)
    if origin:
        query = query.filter(BusService.departure_point.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(BusService.destination_point.ilike(f"%{destination}%"))
    if operator:
        query = query.filter(BusService.operator_name.ilike(f"%{operator}%"))
    return query.all()


@router.post("/buses", response_model=BusServiceOut, status_code=201)
def create_bus_service(
    data: BusServiceCreate,
    current_user: User = Depends(require_role(["admin", "transport_operator"])),
    db: Session = Depends(get_db),
):
    """Add a new bus service (Admin / Transport Operator only)."""
    service = BusService(
        operator_name=data.operator_name,
        bus_number=data.bus_number,
        service_type=data.service_type,
        route_name=data.route_name,
        departure_point=data.departure_point,
        destination_point=data.destination_point,
        intermediate_stops=data.intermediate_stops,
        departure_time=data.departure_time,
        arrival_time=data.arrival_time,
        fare=data.fare,
        total_seats=data.total_seats or 28,
        seat_layout=data.seat_layout or {"rows": 7, "cols": 4, "type": "2x2"},
        created_by=current_user.id,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/buses/{service_id}/trips/{trip_date}/seats", response_model=BusSeatMapOut)
def get_bus_seat_map(
    service_id: int,
    trip_date: str,
    db: Session = Depends(get_db),
):
    """
    Get interactive seat status (available, booked, held) for a specific bus trip date.
    Concurrently checked against active database reservations.
    """
    service = db.query(BusService).filter(
        BusService.id == service_id,
        BusService.is_active == True
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Bus service not found or inactive")

    # Find or auto-initialize the trip record for this date
    trip = db.query(BusTrip).filter(
        BusTrip.bus_service_id == service_id,
        BusTrip.trip_date == trip_date
    ).first()

    if not trip:
        trip = BusTrip(
            bus_service_id=service_id,
            trip_date=trip_date,
            status="scheduled",
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

    # Get active bookings for this trip
    active_bookings = db.query(BusBooking).filter(
        BusBooking.trip_id == trip.id,
        BusBooking.status.in_(["confirmed", "held"])
    ).all()

    booked_map = {b.seat_number: b for b in active_bookings}

    # Generate standard 28-seat 2x2 layout (Rows 1 to 7, Columns A, B, C, D)
    seat_letters = ["A", "B", "C", "D"]
    seats: List[BusSeatStatus] = []
    total_seats = service.total_seats or 28
    rows = (total_seats + 3) // 4

    for r in range(1, rows + 1):
        for col_idx, col_let in enumerate(seat_letters):
            seat_num = f"{r}{col_let}"
            if len(seats) >= total_seats:
                break
            
            is_booked = seat_num in booked_map
            passenger = booked_map[seat_num].passenger_name if is_booked else None
            status = "booked" if is_booked else "available"

            seats.append(BusSeatStatus(
                seat_number=seat_num,
                row=r,
                col=col_idx + 1,
                status=status,
                passenger_name=passenger,
            ))

    available_count = sum(1 for s in seats if s.status == "available")

    return BusSeatMapOut(
        trip_id=trip.id,
        bus_service_id=service.id,
        operator_name=service.operator_name,
        bus_number=service.bus_number,
        route_name=service.route_name,
        trip_date=trip_date,
        departure_time=service.departure_time,
        arrival_time=service.arrival_time,
        fare=service.fare,
        total_seats=total_seats,
        available_seats=available_count,
        seats=seats,
    )


@router.post("/buses/book-seat", response_model=BusBookingOut, status_code=201)
def book_bus_seat(
    data: BusBookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Concurrency-safe seat booking with double-booking prevention.
    Protected by DB UniqueConstraint('trip_id', 'seat_number') and transactional debit.
    """
    trip = db.query(BusTrip).filter(BusTrip.id == data.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Bus trip not found")

    service = db.query(BusService).filter(BusService.id == trip.bus_service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Associated bus service not found")

    fare = service.fare

    # 1. Check existing booking for the seat
    existing = db.query(BusBooking).filter(
        BusBooking.trip_id == trip.id,
        BusBooking.seat_number == data.seat_number,
        BusBooking.status.in_(["confirmed", "held"])
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Seat {data.seat_number} is already booked for this trip. Please choose another seat."
        )

    # 2. Process payment via Wallet if chosen
    payment_ref = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    wallet_txn_id = None
    if data.payment_method == "wallet":
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if not wallet or wallet.balance < fare:
            available = wallet.balance if wallet else 0.0
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient wallet balance (Available: ₹{available:.2f}, Required: ₹{fare:.2f}). Please top up your wallet."
            )
        # Deduct wallet atomically
        wallet.balance = round(wallet.balance - fare, 2)
        txn = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type="DEBIT",
            amount=fare,
            balance_after=wallet.balance,
            reference_type="bus_booking",
            status="SUCCESS",
            description=f"Bus Seat {data.seat_number} ({service.operator_name})",
        )
        db.add(txn)
        db.flush()
        payment_ref = txn.transaction_ref
        wallet_txn_id = txn.id

    # 3. Create BusBooking with race-condition catch
    booking_ref = f"BUS-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    booking = BusBooking(
        booking_ref=booking_ref,
        trip_id=trip.id,
        user_id=current_user.id,
        passenger_name=data.passenger_name,
        passenger_phone=data.passenger_phone,
        seat_number=data.seat_number,
        fare=fare,
        status="confirmed",
        payment_method=data.payment_method or "wallet",
        payment_ref=payment_ref,
    )
    db.add(booking)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # If wallet was debited, roll it back (rollback already undoes the session)
        raise HTTPException(
            status_code=409,
            detail=f"Seat {data.seat_number} was just booked by another user. Your funds were not charged. Please select another seat."
        )

    db.refresh(booking)

    # Add in-app notification
    db.add(Notification(
        user_id=current_user.id,
        title="Bus Booking Confirmed",
        message=f"Seat {booking.seat_number} confirmed on {service.operator_name} ({service.route_name}). Booking Ref: {booking.booking_ref}",
        notification_type="booking",
        reference_type="bus_booking",
        reference_id=booking.id,
    ))
    db.commit()

    out = BusBookingOut.model_validate(booking)
    out.bus_number = service.bus_number
    out.operator_name = service.operator_name
    out.route_name = service.route_name
    out.trip_date = trip.trip_date
    out.departure_time = service.departure_time
    return out


@router.get("/buses/my-bookings", response_model=List[BusBookingOut])
def get_my_bus_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all bus seat bookings for the authenticated user."""
    bookings = db.query(BusBooking).filter(
        BusBooking.user_id == current_user.id
    ).order_by(BusBooking.created_at.desc()).all()

    results = []
    for b in bookings:
        out = BusBookingOut.model_validate(b)
        trip = db.query(BusTrip).filter(BusTrip.id == b.trip_id).first()
        if trip:
            out.trip_date = trip.trip_date
            service = db.query(BusService).filter(BusService.id == trip.bus_service_id).first()
            if service:
                out.bus_number = service.bus_number
                out.operator_name = service.operator_name
                out.route_name = service.route_name
                out.departure_time = service.departure_time
        results.append(out)
    return results


@router.post("/buses/bookings/{booking_id}/cancel", response_model=BusBookingOut)
def cancel_bus_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a bus booking and process automatic wallet refund if applicable."""
    booking = db.query(BusBooking).filter(
        BusBooking.id == booking_id,
        BusBooking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = "cancelled"

    # Process refund if paid via wallet
    if booking.payment_method == "wallet":
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if wallet:
            wallet.balance = round(wallet.balance + booking.fare, 2)
            db.add(WalletTransaction(
                wallet_id=wallet.id,
                transaction_type="REFUND",
                amount=booking.fare,
                balance_after=wallet.balance,
                reference_type="bus_booking",
                reference_id=booking.id,
                status="SUCCESS",
                description=f"Refund for cancelled Bus Booking {booking.booking_ref} (Seat {booking.seat_number})",
            ))

    db.add(Notification(
        user_id=current_user.id,
        title="Bus Booking Cancelled",
        message=f"Bus Booking {booking.booking_ref} cancelled. Refund of ₹{booking.fare:.2f} credited to your wallet.",
        notification_type="booking",
        reference_type="bus_booking",
        reference_id=booking.id,
    ))
    db.commit()
    db.refresh(booking)

    out = BusBookingOut.model_validate(booking)
    return out


# ─── NEARBY SERVICES (HOSPITALS, HOTELS, RESTAURANTS, PARKS, MECHANICS) ──────

@router.get("/nearby-places", response_model=List[NearbyPlaceOut])
def list_nearby_places(
    category: Optional[str] = None,
    query: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 20.0,
    db: Session = Depends(get_db),
):
    """
    Search nearby verified emergency, vehicle mechanic, hospital, hotel, and park facilities.
    Computes distance when user coordinates are provided.
    """
    from app.api.parking import haversine_distance

    q = db.query(NearbyPlace)
    if category and category.lower() != "all":
        q = q.filter(NearbyPlace.category == category.lower())
    if query:
        q = q.filter(
            NearbyPlace.name.ilike(f"%{query}%") |
            NearbyPlace.address.ilike(f"%{query}%")
        )

    places = q.all()
    results = []

    for p in places:
        dist = None
        if lat is not None and lng is not None:
            dist = round(haversine_distance(lat, lng, p.latitude, p.longitude), 2)
            if dist > radius_km:
                continue

        out = NearbyPlaceOut.model_validate(p)
        out.distance_km = dist
        results.append(out)

    if lat is not None and lng is not None:
        results.sort(key=lambda x: x.distance_km or 9999)

    return results


@router.post("/nearby-places", response_model=NearbyPlaceOut, status_code=201)
def create_nearby_place(
    data: NearbyPlaceCreate,
    current_user: User = Depends(require_role(["admin", "operator"])),
    db: Session = Depends(get_db),
):
    """Add a verified nearby service facility (Admin/Operator only)."""
    place = NearbyPlace(
        name=data.name,
        category=data.category.lower(),
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        phone=data.phone,
        opening_hours=data.opening_hours or "24 Hours",
        description=data.description,
        rating=data.rating or 4.5,
        is_verified=data.is_verified if data.is_verified is not None else True,
        created_by=current_user.id,
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return NearbyPlaceOut.model_validate(place)


# ─── EMERGENCY ASSISTANCE & COMPLAINTS TRACKING ──────────────────────────────

@router.get("/emergency-contacts", response_model=List[EmergencyContactOut])
def get_emergency_contacts():
    """Return verified official emergency services and SmartPark helpline directory."""
    return [
        EmergencyContactOut(
            service_name="National Emergency Helpline",
            category="Police & General Rescue",
            number="112",
            description="Integrated pan-India emergency service for police, fire, and instant rescue.",
            badge="National SOS",
            is_toll_free=True,
        ),
        EmergencyContactOut(
            service_name="Ambulance & Medical Emergency",
            category="Hospital Emergency",
            number="108",
            description="Emergency medical transport, trauma care, and rapid paramedic dispatch.",
            badge="Medical",
            is_toll_free=True,
        ),
        EmergencyContactOut(
            service_name="Women Safety Helpline",
            category="Women Safety",
            number="1091",
            description="24x7 immediate police protection, safety distress response, and counseling.",
            badge="Women SOS",
            is_toll_free=True,
        ),
        EmergencyContactOut(
            service_name="National Highway Breakdown Helpline",
            category="Roadside Vehicle Recovery",
            number="1033",
            description="NHAI Highway emergency patrol, crane assistance, and roadside mechanical breakdown.",
            badge="Highway SOS",
            is_toll_free=True,
        ),
        EmergencyContactOut(
            service_name="Fire & Rescue Force",
            category="Fire Department",
            number="101",
            description="Fire extinguishing, vehicle entrapment rescue, and hazardous spill containment.",
            badge="Fire Rescue",
            is_toll_free=True,
        ),
        EmergencyContactOut(
            service_name="SmartPark AI Dedicated Helpdesk",
            category="SmartPark Support",
            number="+91 80 4000 7275",
            description="Customer assistance for parking gates, payments, bus ticketing, and lost recovery.",
            badge="Support",
            is_toll_free=False,
        ),
    ]


@router.post("/complaints", response_model=ComplaintOut, status_code=201)
def submit_complaint(
    data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """File a customer support complaint or issue report."""
    ref = f"CMP-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
    complaint = Complaint(
        complaint_ref=ref,
        user_id=current_user.id,
        category=data.category,
        subject=data.subject,
        description=data.description,
        linked_reference=data.linked_reference,
        contact_email=data.contact_email or current_user.email,
        contact_phone=data.contact_phone,
        status="OPEN",
    )
    db.add(complaint)

    # In-app notification
    db.add(Notification(
        user_id=current_user.id,
        title="Issue Report Submitted",
        message=f"Your ticket {ref} ({data.subject}) has been logged. Our support desk will review it shortly.",
        notification_type="support",
        reference_type="complaint",
    ))
    db.commit()
    db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)


@router.get("/complaints/my", response_model=List[ComplaintOut])
def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all complaints submitted by the current user."""
    items = db.query(Complaint).filter(
        Complaint.user_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()
    return [ComplaintOut.model_validate(c) for c in items]


@router.get("/complaints/all", response_model=List[ComplaintOut])
def get_all_complaints(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "support"])),
    db: Session = Depends(get_db),
):
    """List all user complaints for administrative/support review."""
    q = db.query(Complaint)
    if status:
        q = q.filter(Complaint.status == status.upper())
    return [ComplaintOut.model_validate(c) for c in q.order_by(Complaint.created_at.desc()).all()]


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    data: ComplaintStatusUpdate,
    current_user: User = Depends(require_role(["admin", "support"])),
    db: Session = Depends(get_db),
):
    """Update ticket resolution status (OPEN, IN_REVIEW, RESOLVED, CLOSED)."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")

    complaint.status = data.status.upper()
    if data.resolution_notes:
        complaint.resolution_notes = data.resolution_notes

    if complaint.status in ("RESOLVED", "CLOSED"):
        complaint.resolved_by = current_user.id
        complaint.resolved_at = datetime.now(timezone.utc)

    # Notify ticket author
    db.add(Notification(
        user_id=complaint.user_id,
        title=f"Ticket {complaint.complaint_ref} Updated",
        message=f"Status changed to {complaint.status}. Notes: {data.resolution_notes or 'No notes provided.'}",
        notification_type="support",
        reference_type="complaint",
        reference_id=complaint.id,
    ))
    db.commit()
    db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)

