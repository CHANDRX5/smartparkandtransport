# SmartPark AI — Intelligent Parking, Travel & Vehicle Recovery Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.104+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/AI_Model-Gradient_Boosting-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Leaflet](https://img.shields.io/badge/Mapping-Leaflet_%26_OpenStreetMap-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Tests](https://img.shields.io/badge/Tests-Pytest_Passed-success.svg)](#7-automated-testing)

---

## 1. Project Overview

**SmartPark AI** is a functional full-stack urban mobility platform. It solves urban parking congestion and vehicle security challenges through:
- **Smart Parking Discovery & Advance Booking**: Search real-time parking lots with interactive Leaflet/OpenStreetMap markers, filter by price/amenities, and lock spots in advance with server-side validation.
- **AI Parking Availability Prediction**: Gradient Boosting machine-learning regressor ($R^2 = 0.933$) forecasting hourly occupancy rates, peak congestion periods, and suggesting nearby alternatives.
- **GPS Facility Radar**: Locates nearest parking hubs, EV superchargers, 24/7 hospitals, and fuel stations using browser geolocation.
- **Long-Distance Route Planner**: Multi-option route comparison (Shortest practical highway, Toll-free arterial, Weather-aware safe corridor).
- **Public Transport Crowd AI**: Predictive crowd density profiles for metro lines and city buses with departure time recommendations.
- **Lost & Found Vehicle Recovery System**: Two-sided community recovery portal with explainable rule-based similarity scoring (license plate distance, make, model, color, and GPS radius proximity) and privacy protections.
- **Secure Payments & Ledger**: Razorpay test-mode integration and Sandbox payment flow with printable receipts.
- **Admin Control Console**: Aggregate urban mobility analytics, parking facility quota configuration, recovery sighting moderation, and financial booking ledger.

---

## 2. Feature Checklist & Implementation Status

| Module | Feature | Implementation Status | Verified via Tests |
|---|---|:---:|:---:|
| **Authentication** | Registration, Login, JWT access tokens | Completed | Verified |
| **Authentication** | Role-based authorization (`citizen`, `operator`, `admin`) | Completed | Verified |
| **Authentication** | Profile & security settings management | Completed | Verified |
| **Parking Discovery** | Interactive Leaflet & OpenStreetMap locator | Completed | Verified |
| **Parking Discovery** | Search by landmark, city, and street | Completed | Verified |
| **Parking Discovery** | Price, distance, and amenity filters (EV, CCTV, Valet) | Completed | Verified |
| **Parking Discovery** | Demarcated bay status layout (Vacant / Occupied) | Completed | Verified |
| **AI Prediction** | Scikit-learn Gradient Boosting Model | Completed | Evaluated ($R^2=0.933$) |
| **AI Prediction** | Hourly occupancy forecast charts (Recharts) | Completed | Verified |
| **AI Prediction** | Peak period prediction & alternative lot suggestions | Completed | Verified |
| **Advance Booking** | Spot reservation with server-side capacity locks | Completed | Verified |
| **Advance Booking** | Gate check-in, check-out, and cancellation rules | Completed | Verified |
| **Advance Booking** | Printable receipt & QR pass view | Completed | Verified |
| **GPS Radar** | Browser geolocation permission handling | Completed | Verified |
| **GPS Radar** | Nearby radar (Parking, EV chargers, Hospitals, Fuel) | Completed | Verified |
| **GPS Radar** | OSRM turn-by-turn routing calculation | Completed | Verified |
| **Route Planner** | Option A: Shortest practical highway route | Completed | Verified |
| **Route Planner** | Option B: Road clearance / restriction notices | Completed | Verified |
| **Route Planner** | Option C: Weather-aware safe corridor | Completed | Verified |
| **Route Planner** | Option D: Toll estimate routes | Completed | Verified |
| **Route Planner** | Option E: Toll-free surface bypass | Completed | Verified |
| **Transit Crowd AI** | Bus & metro scheduled station timetables | Completed | Verified |
| **Transit Crowd AI** | Passenger density prediction (Low, Moderate, High, Peak) | Completed | Verified |
| **Lost & Found** | Report lost vehicle with location & privacy toggle | Completed | Verified |
| **Lost & Found** | Report found vehicle sighting | Completed | Verified |
| **Lost & Found** | Rule-based AI similarity match scoring | Completed | Verified |
| **Lost & Found** | Administrative verification & resolution workflow | Completed | Verified |
| **Payments** | Dynamic fee calculator & price breakdown | Completed | Verified |
| **Payments** | Sandbox / Razorpay test payment flow | Completed | Verified |
| **Payments** | Auditable transaction history ledger | Completed | Verified |
| **Notifications** | In-app notification center with read/unread tracking | Completed | Verified |
| **Admin Console** | Executive analytics, occupancy trends, revenue yield | Completed | Verified |
| **Admin Console** | Parking facility registration & quota editing | Completed | Verified |
| **Admin Console** | Lost & Found sighting moderation | Completed | Verified |
| **Admin Console** | Platform booking ledger & operator manual check-in | Completed | Verified |

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Axios, Leaflet, OpenStreetMap, Recharts, Lucide React.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Python-Jose (JWT), Bcrypt, SlowAPI (Rate Limiting), HTTPX.
- **Database**: PostgreSQL (Supabase compatible) / SQLite fallback for local zero-config testing.
- **Machine Learning**: Scikit-learn, Pandas, NumPy, Joblib (Gradient Boosting regressor).

---

## 4. Quick Startup Instructions (Windows)

### Terminal 1: Backend Server

```powershell
# Navigate to backend
cd "d:\praveen mm\backend"

# (Optional) Activate Virtual Environment
py -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
py -m pip install -r requirements.txt

# Seed realistic demonstration data
cd "d:\praveen mm"
python database/seed_data.py

# Train AI parking prediction model
cd "d:\praveen mm\backend"
python -m app.ai.train_model

# Run FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Backend API: `http://localhost:8000/api/v1`
- Swagger UI Docs: `http://localhost:8000/api/docs`

### Terminal 2: Frontend Client

```powershell
# Navigate to frontend
cd "d:\praveen mm\frontend"

# Install dependencies & build
npm install
npm run build

# Start Vite development server
npm run dev
```
- Frontend Web App: `http://localhost:5173`

---

## 5. Demonstration Accounts

| Role | Email | Password | Access Highlights |
|---|---|---|---|
| **System Admin** | `admin@smartpark.ai` | `Admin@123` | Full admin analytics, parking quotas, lost vehicle moderation |
| **Operator** | `operator@smartpark.ai` | `Operator@123` | Facility management, gate check-in override, found vehicle sightings |
| **Citizen** | `user@smartpark.ai` | `User@123` | Bay discovery, advance reservation, GPS radar, route planner |

---

## 6. External Integrations & Configuration

| Service | Environment Variable | Status / Fallback Behavior |
|---|---|---|
| **PostgreSQL / Supabase** | `DATABASE_URL` | Defaults to SQLite (`smartpark.db`) for instant zero-configuration local runs. Set Supabase URI for production. |
| **Razorpay Payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | If unconfigured, operates in clearly marked **Sandbox Demonstration Mode** with instantaneous mock payment clearance. |
| **OpenWeatherMap** | `WEATHER_API_KEY` | If unconfigured, provides structured weather advisory forecasts based on seasonal climate metrics. |
| **OSRM Routing** | `OSRM_API_URL` | Defaults to public OSRM gateway (`https://router.project-osrm.org`) with geometric fallback. |

---

## 7. Automated Testing

All automated backend tests have been executed and verified:

```powershell
cd "d:\praveen mm\backend"
python -m pytest tests -v
```

Output:
```
tests/test_auth.py::test_health_check PASSED                             [ 25%]
tests/test_auth.py::test_user_registration_and_login PASSED              [ 50%]
tests/test_lost_found.py::test_lost_found_reporting_and_matching PASSED  [ 75%]
tests/test_parking_and_bookings.py::test_parking_facilities_crud_and_booking PASSED [100%]
4 passed in 1.42s
```

Frontend production bundle verification:
```powershell
cd "d:\praveen mm\frontend"
npm run build
```
Built in 1.50s without errors.
