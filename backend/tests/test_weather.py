"""Unit tests for SmartPark AI Weather Service integration."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_weather_verify_endpoint():
    """Verify weather configuration diagnostic endpoint."""
    res = client.get("/api/v1/transport/weather/verify")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "key_present" in data
    assert "endpoint" in data
    assert "api_status" in data
    assert "fallback_active" in data
    assert "message" in data
    # Ensure full secret key is never leaked
    if data.get("key_masked"):
        assert "..." in data["key_masked"]
        assert len(data["key_masked"]) <= 12


def test_current_weather_endpoint():
    """Verify live weather endpoint with coordinates."""
    res = client.get("/api/v1/transport/weather", params={"lat": 12.9716, "lng": 77.5946, "location": "Bengaluru"})
    assert res.status_code == 200
    data = res.json()
    assert data["location"] == "Bengaluru"
    assert "temp_c" in data
    assert isinstance(data["temp_c"], (int, float))
    assert "description" in data
    assert "source" in data
    assert "status" in data
    # Ensure sensitive keys are never in payload
    assert "appid" not in data
    assert "api_key" not in data


def test_weather_forecast_endpoint():
    """Verify multi-day weather forecast endpoint."""
    res = client.get("/api/v1/transport/weather/forecast", params={"lat": 12.9716, "lng": 77.5946, "days": 2})
    assert res.status_code == 200
    data = res.json()
    assert "forecasts" in data
    assert isinstance(data["forecasts"], list)
    assert len(data["forecasts"]) > 0
    item = data["forecasts"][0]
    assert "temp_c" in item
    assert "description" in item
