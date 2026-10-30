"""SmartPark AI - Lost & Found Vehicle Recovery Unit/API Tests."""
import pytest
from datetime import datetime, timezone


def test_lost_found_reporting_and_matching(client, admin_token, user_token):
    now = datetime.now(timezone.utc)

    # 1. Report lost vehicle
    lost_payload = {
        "vehicle_reg_number": "KA-51-AB-1122",
        "vehicle_type": "car",
        "make": "Toyota",
        "model": "Innova Crysta",
        "color": "Grey",
        "last_known_location": "Electronic City Gate 3",
        "last_known_latitude": 12.8450,
        "last_known_longitude": 77.6600,
        "last_seen_date": now.isoformat(),
        "description": "Grey Innova with rooftop carrier",
        "contact_phone": "+91 91234 56789",
        "contact_visibility": "private"
    }
    lost_res = client.post(
        "/api/v1/lost-found/lost",
        json=lost_payload,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert lost_res.status_code in [200, 201]
    lost_data = lost_res.json()
    assert "report_ref" in lost_data
    lost_id = lost_data["id"]

    # 2. Report found vehicle matching the lost vehicle
    found_payload = {
        "vehicle_reg_number": "KA-51-AB-1122",
        "vehicle_type": "car",
        "make": "Toyota",
        "model": "Innova Crysta",
        "color": "Grey",
        "found_location": "Hosur Road Service Lane near Gate 3",
        "found_latitude": 12.8460,
        "found_longitude": 77.6610,
        "found_date": now.isoformat(),
        "description": "Unattended Grey Toyota Innova found parked on service road",
        "contact_phone": "+91 90000 11111",
        "contact_preference": "in_app"
    }
    found_res = client.post(
        "/api/v1/lost-found/found",
        json=found_payload,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert found_res.status_code in [200, 201]
    found_data = found_res.json()
    assert "report_ref" in found_data

    # 3. Check for suggested matches
    match_res = client.get(
        f"/api/v1/lost-found/matches/{lost_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert match_res.status_code == 200
    matches = match_res.json()
    assert len(matches) >= 1
    assert matches[0]["match_score"] >= 0.4
