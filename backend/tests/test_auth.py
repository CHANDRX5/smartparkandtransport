"""SmartPark AI - Authentication & Authorization Unit/API Tests."""
import pytest


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "SmartPark AI"


def test_user_registration_and_login(client):
    reg_payload = {
        "email": "newuser@smartpark.ai",
        "username": "newuser",
        "password": "SecurePassword123!",
        "full_name": "New Citizen",
        "phone": "+91 99999 88888",
        "role": "citizen"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code in [200, 201]
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "newuser@smartpark.ai"

    # Duplicate registration should fail
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # Login with correct password
    login_payload = {
        "email": "newuser@smartpark.ai",
        "password": "SecurePassword123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data

    # Login with invalid password
    bad_login = {
        "email": "newuser@smartpark.ai",
        "password": "WrongPassword!"
    }
    bad_res = client.post("/api/v1/auth/login", json=bad_login)
    assert bad_res.status_code == 401

    # Access profile with token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["email"] == "newuser@smartpark.ai"
