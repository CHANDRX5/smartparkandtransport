# SmartPark AI Documentation Hub

Welcome to the comprehensive technical documentation for **SmartPark AI — Intelligent Parking, Travel & Vehicle Recovery Platform**.

---

## 1. Documentation Index

- [SETUP_GUIDE.md](file:///d:/praveen%20mm/docs/SETUP_GUIDE.md): Complete Windows installation, execution, and troubleshooting steps.
- [API_DOCUMENTATION.md](file:///d:/praveen%20mm/docs/API_DOCUMENTATION.md): RESTful endpoint specifications across authentication, discovery, advance reservation, payments, GPS radar, and lost vehicle recovery.
- [DATABASE_DESIGN.md](file:///d:/praveen%20mm/docs/DATABASE_DESIGN.md): Normalized relational schema definitions, entity relationships (ERD), constraints, and table definitions.

---

## 2. Platform Architecture Overview

```
                          ┌─────────────────────────────┐
                          │   SmartPark AI Frontend     │
                          │   (React 19, TS, Tailwind)  │
                          └──────────────┬──────────────┘
                                         │ Axios REST API
                                         ▼
                          ┌─────────────────────────────┐
                          │    FastAPI Backend Server   │
                          │  (/api/v1 REST Endpoints)   │
                          └──────┬───────┬───────┬──────┘
                                 │       │       │
                 ┌───────────────┘       │       └──────────────┐
                 ▼                       ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │  SQLAlchemy ORM │    │ Scikit-Learn ML │    │ OSRM & OpenMap  │
        │ (PostgreSQL/DB) │    │  (GradientBoost)│    │  (Geo Routing)  │
        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 3. Core Modules & Innovations

1. **Smart Parking Discovery & Advance Booking**:
   - Leaflet interactive map with vacancy status.
   - Server-side transaction validation preventing spot double-booking.
   - Demarcated bay status layout (Standard, EV Fast Charger, SUV, Two-Wheeler).

2. **AI Availability Prediction**:
   - Gradient Boosting regressor trained on ingress/egress records.
   - Hour-by-hour forecast with confidence levels and alternative lot suggestions.

3. **GPS Facility Radar & Long-Distance Route Planner**:
   - Geolocation-aware radar locating nearest EV chargers, emergency hospitals, and parking.
   - Multi-option long-distance routing: Shortest practical highway, toll-free bypass, weather-safe corridor.

4. **Public Transport Crowd Prediction**:
   - Hourly passenger density profiles for metropolitan buses and metro lines.
   - Alleviation departure time recommendations.

5. **Lost & Found Vehicle Recovery System**:
   - Two-sided community reporting.
   - Privacy protection toggles hiding private phone numbers from public feeds.
   - Explainable rule-based similarity scoring (license plate distance, make/model/color similarity, and GPS proximity radius).
