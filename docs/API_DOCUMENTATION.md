# SmartPark AI — REST API Documentation

Base URL: `http://localhost:8000/api/v1`  
Interactive OpenAPI Swagger Docs: `http://localhost:8000/api/docs`  
ReDoc Documentation: `http://localhost:8000/api/redoc`

---

## 1. Authentication Endpoints (`/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user (`citizen`, `operator`, `admin`) |
| `POST` | `/auth/login` | Public | Authenticate via email & password, returns JWT token |
| `GET` | `/auth/me` | Bearer Token | Retrieve currently authenticated user profile |
| `PUT` | `/auth/me` | Bearer Token | Update user profile (name, phone, vehicle info) |

---

## 2. Smart Parking Discovery (`/parking`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/parking/facilities` | Public | Search parking lots with filters (`city`, `lat`, `lng`, `radius_km`, `min_available`) |
| `GET` | `/parking/facilities/{id}` | Public | Detailed parking facility profile, pricing, spaces & amenities |
| `POST` | `/parking/facilities` | Operator/Admin | Create a new parking facility |
| `PUT` | `/parking/facilities/{id}` | Operator/Admin | Update facility details or space count |
| `GET` | `/parking/facilities/{id}/spaces` | Public | Real-time map of individual demarcated bays & status |

---

## 3. Parking Bookings (`/bookings`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/bookings` | Authenticated | Create an advance parking reservation with space lock |
| `GET` | `/bookings/my` | Authenticated | Fetch active, upcoming, and past user bookings |
| `GET` | `/bookings/{id}` | Authenticated | Fetch specific booking confirmation & receipt view |
| `POST` | `/bookings/{id}/check-in` | Authenticated | Operator or User check-in validation |
| `POST` | `/bookings/{id}/cancel` | Authenticated | Cancel booking & release space |

---

## 4. Payments & Transactions (`/payments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | Authenticated | Initialize Razorpay payment order or Sandbox token |
| `POST` | `/payments/verify` | Authenticated | Verify Razorpay HMAC signature & complete booking |
| `POST` | `/payments/process-demo` | Authenticated | Instant simulated sandbox payment for demonstration |
| `GET` | `/payments/history` | Authenticated | Fetch transaction ledger and receipt references |

---

## 5. AI Predictions & Analytics (`/predictions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/predictions/parking/{facility_id}` | Public | AI occupancy forecast for future hours using Scikit-Learn |
| `GET` | `/predictions/admin-analytics` | Admin | Aggregate revenue, occupancy trends & model performance |
| `GET` | `/predictions/notifications` | Authenticated | In-app notification center |
| `PATCH` | `/predictions/notifications/{id}/read`| Authenticated | Mark notification as read |

---

## 6. Route Planning & GPS Tracker (`/transport`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/transport/nearby` | Public | Find nearest parking, EV chargers, fuel stations & hospitals |
| `POST` | `/transport/routes` | Public | Multi-option route planning (Shortest, Toll-free, Weather-aware) |
| `GET` | `/transport/crowd-prediction` | Public | AI crowd level estimation for buses and transit routes |
| `GET` | `/transport/routes-list` | Public | List transit lines and scheduled stops |

---

## 7. Lost & Found Vehicle Recovery (`/lost-found`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/lost-found/lost-reports` | Authenticated | Submit lost/stolen vehicle report with location & photos |
| `GET` | `/lost-found/lost-reports` | Public | List lost vehicle reports (with privacy-redacted contacts) |
| `POST` | `/lost-found/found-reports` | Authenticated | Submit found/abandoned vehicle sighting |
| `GET` | `/lost-found/found-reports` | Public | List found vehicle reports |
| `GET` | `/lost-found/lost-reports/{id}/matches`| Authenticated | AI/rule-based match suggestions with similarity scores |
| `POST` | `/lost-found/matches/{id}/review` | Admin/Operator | Confirm or reject potential recovery match |
| `POST` | `/lost-found/upload-photo` | Authenticated | Secure image upload with MIME validation |
