# SmartPark AI — Windows Setup & Execution Guide

This comprehensive guide details the step-by-step setup and local execution of the **SmartPark AI** intelligent parking, route planning, transit crowd estimation, and vehicle recovery platform on Windows.

---

## 1. Prerequisites & Required Software

Make sure the following runtimes are installed on your Windows machine:
1. **Python 3.10+**: [python.org](https://www.python.org/downloads/) (Check "Add Python to PATH" during installation).
2. **Node.js 18+ & npm 9+**: [nodejs.org](https://nodejs.org/) (Recommended: Node.js LTS).
3. **Git**: [git-scm.com](https://git-scm.com/).
4. **PostgreSQL** *(Optional for production)*: [postgresql.org](https://www.postgresql.org/) or a free hosted instance from [Supabase](https://supabase.com). SQLite is enabled by default for zero-config local testing.

---

## 2. Project Directory Structure

```
smartpark-ai/
  frontend/          # React 19 + TypeScript + Vite + Tailwind CSS + Leaflet
  backend/           # FastAPI + SQLAlchemy + Scikit-learn + Pydantic
  database/          # schema.sql and seed_data.py
  docs/              # Architecture, DB schema, API specs, and setup docs
```

---

## 3. Backend Setup & Startup (Terminal 1)

Open a new PowerShell terminal in the project root:

```powershell
# 1. Navigate to the backend directory
cd "d:\praveen mm\backend"

# 2. (Optional) Create and activate a Python virtual environment
py -m venv .venv
.\.venv\Scripts\activate

# 3. Install required Python packages
py -m pip install -r requirements.txt

# 4. Copy environment configuration
copy .env.example .env

# 5. Seed the database with demo users, facilities & ML training data
cd "d:\praveen mm"
python database/seed_data.py

# 6. Train the Scikit-learn parking availability prediction model
cd "d:\praveen mm\backend"
python -m app.ai.train_model

# 7. Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once started:
- API Base URL: `http://localhost:8000/api/v1`
- Interactive Swagger UI: `http://localhost:8000/api/docs`
- ReDoc Documentation: `http://localhost:8000/api/redoc`

---

## 4. Frontend Setup & Startup (Terminal 2)

Open a second PowerShell terminal in the project root:

```powershell
# 1. Navigate to the frontend directory
cd "d:\praveen mm\frontend"

# 2. Install Node dependencies
npm install

# 3. Verify production build
npm run build

# 4. Start the Vite development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

---

## 5. Demo Credentials

The platform includes 3 pre-seeded demonstration accounts:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **System Administrator** | `admin@smartpark.ai` | `Admin@123` | Full analytics dashboard, parking facility management, lost & found review, booking ledger |
| **Facility Operator** | `operator@smartpark.ai` | `Operator@123` | Facility management, gate check-in override, found vehicle sighting logs |
| **Citizen / Driver** | `user@smartpark.ai` | `User@123` | Smart parking discovery, advance spot reservation, GPS radar, route comparison, reporting lost vehicle |

---

## 6. Running Automated Tests

To run the automated backend test suite (Auth, Parking discovery, Advance booking, Payments, Lost & Found match engine):

```powershell
cd "d:\praveen mm\backend"
python -m pytest tests -v
```

---

## 7. Connecting Hosted PostgreSQL / Supabase

To switch from local SQLite to Supabase or PostgreSQL:
1. Open `backend/.env`.
2. Update the `DATABASE_URL` variable:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
3. Run the schema creation:
   ```powershell
   python -c "from app.core.database import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine)"
   ```
4. Run the seed script:
   ```powershell
   python database/seed_data.py
   ```

---

## 8. Troubleshooting Common Issues

### Issue A: Port 8000 or 5173 is already in use
```powershell
# Find and terminate process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Issue B: Leaflet Map tiles not rendering
Verify your device has active internet access to reach `https://{s}.tile.openstreetmap.org`.

### Issue C: Geolocation Permission Denied
If browser geolocation permission is denied, the application gracefully defaults to the metropolitan city center coordinates without crashing.
