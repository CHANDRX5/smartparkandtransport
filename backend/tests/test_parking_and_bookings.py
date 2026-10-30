"""SmartPark AI - Parking Discovery, Booking Workflow, and Payment Tests."""
import pytest
from datetime import datetime, timedelta, timezone


def test_parking_facilities_crud_and_booking(client, admin_token, user_token):
    # 1. Admin creates a facility
    fac_payload = {
        "name": "Test Terminal Park",
        "address": "Terminal 1 Gate 4",
        "city": "Bengaluru",
        "latitude": 12.9500,
        "longitude": 77.6000,
        "total_capacity": 50,
        "available_spaces": 50,
        "price_per_hour": 40.0,
        "operating_hours": {"open": "00:00", "close": "23:59"},
        "amenities": ["cctv", "covered", "ev_charging"]
    }
    create_res = client.post(
        "/api/v1/parking/facilities",
        json=fac_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code in [200, 201]
    facility_id = create_res.json()["id"]

    # 2. Regular user searches facilities
    list_res = client.get("/api/v1/parking/facilities?city=Bengaluru")
    assert list_res.status_code == 200
    facilities = list_res.json()["items"]
    assert any(f["id"] == facility_id for f in facilities)

    # 3. Create a booking for this facility
    now = datetime.now(timezone.utc)
    start_time = now + timedelta(hours=2)
    end_time = now + timedelta(hours=5)
    booking_payload = {
        "facility_id": facility_id,
        "vehicle_reg_number": "KA-04-TEST-1234",
        "vehicle_type": "car",
        "booking_date": now.isoformat(),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration_hours": 3.0
    }
    book_res = client.post(
        "/api/v1/bookings/",
        json=booking_payload,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert book_res.status_code in [200, 201]
    booking_data = book_res.json()
    assert "booking_ref" in booking_data
    assert booking_data["total_amount"] > 0
    booking_id = booking_data["id"]

    # 4. Process Payment for this booking (Sandbox)
    pay_payload = {
        "booking_id": booking_id,
        "payment_method": "demo_sandbox"
    }
    pay_res = client.post(
        "/api/v1/payments/",
        json=pay_payload,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert pay_res.status_code in [200, 201]
    pay_data = pay_res.json()
    assert pay_data["status"] in ["pending", "completed"]
    assert "transaction_ref" in pay_data


def test_owner_management_and_isolation(client, operator1_token, operator2_token):
    # 1. Operator 1 creates a facility
    fac_payload = {
        "name": "Operator 1 Plaza",
        "address": "MG Road Sector 4",
        "city": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "total_capacity": 20,
        "available_spaces": 20,
        "price_per_hour": 50.0,
        "operating_hours": {"open": "06:00", "close": "22:00"},
        "amenities": ["cctv", "ev_charging"],
    }
    create_res = client.post(
        "/api/v1/parking/facilities",
        json=fac_payload,
        headers={"Authorization": f"Bearer {operator1_token}"},
    )
    assert create_res.status_code in [200, 201]
    facility_id = create_res.json()["id"]

    # 2. Operator 1 creates a parking space in their facility
    space_payload = {
        "space_number": "OP1-BAY-01",
        "vehicle_type": "car",
        "floor_level": "Level 1",
    }
    space_res = client.post(
        f"/api/v1/parking/facilities/{facility_id}/spaces",
        json=space_payload,
        headers={"Authorization": f"Bearer {operator1_token}"},
    )
    assert space_res.status_code == 201
    space_id = space_res.json()["id"]

    # 3. Operator 1 updates slot status to occupied
    status_res = client.patch(
        f"/api/v1/parking/facilities/{facility_id}/spaces/{space_id}/status",
        json={"slot_status": "occupied", "status_note": "Reserved for visitor"},
        headers={"Authorization": f"Bearer {operator1_token}"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["slot_status"] == "occupied"
    assert status_res.json()["is_occupied"] is True

    # 4. Strict Owner Isolation: Operator 2 attempts to update Operator 1's space -> MUST BE 403 Forbidden
    forbidden_res = client.patch(
        f"/api/v1/parking/facilities/{facility_id}/spaces/{space_id}/status",
        json={"slot_status": "available"},
        headers={"Authorization": f"Bearer {operator2_token}"},
    )
    assert forbidden_res.status_code == 403

    # Operator 2 attempts to create slot in Operator 1's facility -> MUST BE 403 Forbidden
    forbidden_create = client.post(
        f"/api/v1/parking/facilities/{facility_id}/spaces",
        json={"space_number": "HACK-01"},
        headers={"Authorization": f"Bearer {operator2_token}"},
    )
    assert forbidden_create.status_code == 403


def test_ai_aerial_parking_detection_and_review(client, operator1_token):
    # 1. Create a dummy image in memory
    from io import BytesIO
    from PIL import Image

    img = Image.new("RGB", (400, 300), color=(120, 120, 120))
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    # 2. Analyze aerial snapshot
    files = {"file": ("test_aerial.jpg", img_byte_arr, "image/jpeg")}
    data = {"grid_rows": "2", "grid_cols": "4"}
    analysis_res = client.post(
        "/api/v1/ai/parking-detection",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {operator1_token}"},
    )
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    assert analysis_data["total_detected_spaces"] == 8
    assert "confidence_score" in analysis_data
    assert "detected_spaces" in analysis_data
    assert analysis_data["status"] == "pending_review"
    analysis_id = analysis_data["analysis_id"]

    # 3. Human review and correction
    corrected_spaces = analysis_data["detected_spaces"]
    corrected_spaces[0]["status"] = "apparently_vacant"
    review_res = client.patch(
        f"/api/v1/ai/parking-detection/{analysis_id}/review",
        json={
            "detected_spaces": corrected_spaces,
            "review_notes": "Manually verified by operator: Bay 1 confirmed vacant",
        },
        headers={"Authorization": f"Bearer {operator1_token}"},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "reviewed"
    assert review_res.json()["review_notes"] == "Manually verified by operator: Bay 1 confirmed vacant"

