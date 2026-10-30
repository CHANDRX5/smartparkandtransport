"""
SmartPark AI - Comprehensive Safe, Non-Destructive Database Migration Script
Applies all new tables, columns, indexes, and initial verified seed data without altering or dropping existing data.
"""
import sqlite3
import os
import sys

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist, skipping.")
        return

    print(f"Checking & migrating database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Helper function to add columns safely
    def add_columns_if_missing(table_name, columns):
        cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        if cur.fetchone():
            cur.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {row[1] for row in cur.fetchall()}
            for col_name, col_type in columns:
                if col_name not in existing_cols:
                    print(f"Adding column '{col_name}' to '{table_name}'...")
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")

    # 1. parking_spaces
    add_columns_if_missing("parking_spaces", [
        ("slot_status", "VARCHAR(30) DEFAULT 'available'"),
        ("updated_at", "DATETIME"),
        ("updated_by", "INTEGER"),
        ("status_note", "TEXT"),
    ])

    # 2. lost_vehicle_reports
    add_columns_if_missing("lost_vehicle_reports", [
        ("verification_status", "VARCHAR(30) DEFAULT 'PENDING_VERIFICATION'"),
        ("verifier_id", "INTEGER"),
        ("verified_at", "DATETIME"),
        ("verification_notes", "TEXT"),
    ])

    # 3. found_vehicle_reports
    add_columns_if_missing("found_vehicle_reports", [
        ("verification_status", "VARCHAR(30) DEFAULT 'PENDING_VERIFICATION'"),
        ("verifier_id", "INTEGER"),
        ("verified_at", "DATETIME"),
        ("verification_notes", "TEXT"),
    ])

    # 4. image_analyses table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS image_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        facility_id INTEGER REFERENCES parking_facilities(id),
        image_name VARCHAR(255) NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        total_detected INTEGER DEFAULT 0,
        occupied_count INTEGER DEFAULT 0,
        vacant_count INTEGER DEFAULT 0,
        unknown_count INTEGER DEFAULT 0,
        confidence_score FLOAT DEFAULT 0.0,
        detected_spaces JSON DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'completed',
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT,
        created_at DATETIME,
        updated_at DATETIME
    )
    """)

    # 5. wallets table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        balance FLOAT NOT NULL DEFAULT 0.0,
        currency VARCHAR(10) DEFAULT 'INR',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME,
        updated_at DATETIME
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)")

    # 6. wallet_transactions table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount FLOAT NOT NULL,
        transaction_type VARCHAR(30) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
        transaction_ref VARCHAR(100) NOT NULL UNIQUE,
        reference_id VARCHAR(100),
        description VARCHAR(255) NOT NULL,
        payout_destination VARCHAR(255),
        created_at DATETIME
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON wallet_transactions(user_id)")

    # 7. bus_services table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bus_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_name VARCHAR(100) NOT NULL,
        bus_number VARCHAR(50) NOT NULL,
        service_type VARCHAR(50) DEFAULT 'AC Executive',
        route_name VARCHAR(255) NOT NULL,
        departure_point VARCHAR(255) NOT NULL,
        destination_point VARCHAR(255) NOT NULL,
        intermediate_stops JSON DEFAULT '[]',
        departure_time VARCHAR(10) NOT NULL,
        arrival_time VARCHAR(10) NOT NULL,
        fare FLOAT NOT NULL,
        total_seats INTEGER NOT NULL DEFAULT 28,
        seat_layout JSON DEFAULT '{"rows": 7, "cols": 4, "type": "2x2"}',
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME
    )
    """)

    # 8. bus_trips table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bus_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bus_service_id INTEGER NOT NULL REFERENCES bus_services(id),
        trip_date VARCHAR(20) NOT NULL,
        status VARCHAR(30) DEFAULT 'scheduled',
        created_at DATETIME
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_bus_trips_service_date ON bus_trips(bus_service_id, trip_date)")

    # 9. bus_bookings table with double-booking prevention constraint
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bus_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_ref VARCHAR(30) NOT NULL UNIQUE,
        trip_id INTEGER NOT NULL REFERENCES bus_trips(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        passenger_name VARCHAR(100) NOT NULL,
        passenger_phone VARCHAR(20) NOT NULL,
        seat_number VARCHAR(10) NOT NULL,
        fare FLOAT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
        payment_method VARCHAR(50) DEFAULT 'wallet',
        payment_ref VARCHAR(100),
        created_at DATETIME,
        CONSTRAINT uq_trip_seat UNIQUE (trip_id, seat_number)
    )
    """)

    # 10. nearby_places table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS nearby_places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        phone VARCHAR(50),
        opening_hours VARCHAR(100) DEFAULT '24 Hours',
        description TEXT,
        rating FLOAT DEFAULT 4.5,
        is_verified BOOLEAN DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME,
        updated_at DATETIME
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_nearby_category ON nearby_places(category)")

    # 11. complaints table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_ref VARCHAR(30) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        category VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        linked_reference VARCHAR(100),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        resolution_notes TEXT,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at DATETIME,
        created_at DATETIME,
        updated_at DATETIME
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id)")

    # 12. Seed default nearby places if empty
    cur.execute("SELECT count(*) FROM nearby_places")
    if cur.fetchone()[0] == 0:
        print("Seeding initial verified nearby places...")
        seed_places = [
            ("Manipal Hospital Central", "hospital", "98 HAL Airport Road, Kodihalli, Bengaluru", 12.9592, 77.6499, "+91 80 2502 4444", "24/7 Emergency Care", "Multi-speciality tertiary care hospital with 24x7 trauma care", 4.8),
            ("Apollo Speciality Hospital", "hospital", "21/2 14th Cross, 3rd Block, Jayanagar, Bengaluru", 12.9298, 77.5833, "+91 80 4668 8888", "24 Hours Emergency", "Super speciality medical center with emergency ambulance fleet", 4.7),
            ("The Oberoi Bengaluru", "hotel", "37-39 MG Road, Bengaluru", 12.9734, 77.6190, "+91 80 2558 5858", "Check-in: 14:00", "5-star luxury hotel with secure visitor valet parking", 4.9),
            ("Taj West End", "hotel", "25 Race Course Road, High Grounds, Bengaluru", 12.9867, 77.5843, "+91 80 6660 5660", "24 Hours Concierge", "Heritage hotel with lush gardens and EV charging", 4.8),
            ("Vidyarthi Bhavan", "restaurant", "32 Gandhi Bazaar, Basavanagudi, Bengaluru", 12.9443, 77.5714, "+91 80 2667 7588", "06:30 - 20:00", "Iconic South Indian culinary landmark established in 1943", 4.6),
            ("MTR - Mavalli Tiffin Room", "restaurant", "14 Lalbagh Road, Mavalli, Bengaluru", 12.9556, 77.5862, "+91 80 2222 0022", "06:30 - 21:00", "Legendary heritage breakfast and lunch destination", 4.7),
            ("Cubbon Park", "park", "Kasturba Road, Sampangi Rama Nagara, Bengaluru", 12.9763, 77.5929, "+91 80 2286 4189", "06:00 - 18:00", "300-acre historic lung space with wide walking tracks", 4.8),
            ("Lalbagh Botanical Garden", "park", "Mavalli, Bengaluru", 12.9507, 77.5848, "+91 80 2657 0181", "06:00 - 19:00", "Historic 240-acre botanical haven with famous glass house", 4.8),
            ("Bosch Car Service - QuickFix Autoworks", "mechanic", "12 Koramangala 4th Block, 80 Feet Road, Bengaluru", 12.9344, 77.6288, "+91 98450 12345", "08:00 - 21:00", "Authorized multi-brand vehicle repair, battery jumpstart & diagnostics", 4.7),
            ("Express Roadside & Tyre Clinic", "mechanic", "Hosur Main Road, Near Silk Board Flyover, Bengaluru", 12.9176, 77.6233, "+91 99800 54321", "24/7 Breakdown Assistance", "Emergency puncture repair, towing, wheel alignment & mobile mechanic", 4.6),
        ]
        for p in seed_places:
            cur.execute("""
            INSERT INTO nearby_places (name, category, address, latitude, longitude, phone, opening_hours, description, rating, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            """, p)

    # 13. Seed default bus services if empty
    cur.execute("SELECT count(*) FROM bus_services")
    if cur.fetchone()[0] == 0:
        print("Seeding initial verified bus services...")
        seed_buses = [
            ("KSRTC Airavat Club Class", "KA-01-F-9901", "AC Multi-Axle Sleeper", "Bengaluru ⇄ Mysuru Express", "Kempegowda Majestic Terminal 2, Bengaluru", "Suburban Bus Stand, Mysuru", '["Kengeri Satellite", "Bidadi", "Ramanagara", "Mandya"]', "06:30", "09:45", 350.0, 28),
            ("KSRTC Flybus Non-Stop", "KA-01-F-9902", "AC Volvo Executive", "KIA Airport ⇄ Electronic City", "Kempegowda Int'l Airport T1", "Electronic City Phase 1 Toll", '["Hebbal Flyover", "Tin Factory", "Silk Board"]', "08:00", "10:15", 300.0, 32),
            ("BMTC Vajra Express", "KA-01-FA-4401", "Low Floor AC", "Majestic ⇄ ITPL Whitefield", "Majestic Bus Station Platform 14", "ITPL Main Gate, Whitefield", '["Corporation", "Domlur", "HAL Main Gate", "Marathahalli", "Kundalahalli"]', "07:15", "08:50", 110.0, 36),
            ("Greenline Royal Cruiser", "KA-51-AB-1234", "Luxury Multi-Axle Sleeper", "Bengaluru ⇄ Chennai Central", "Shantinagar Bus Station, Bengaluru", "Koyambedu CMBT, Chennai", '["Hosur", "Krishnagiri", "Vellore Bypass", "Sriperumbudur"]', "22:30", "05:15", 750.0, 28),
        ]
        for b in seed_buses:
            cur.execute("""
            INSERT INTO bus_services (operator_name, bus_number, service_type, route_name, departure_point, destination_point, intermediate_stops, departure_time, arrival_time, fare, total_seats, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            """, b)

    conn.commit()
    conn.close()
    print(f"Migration completed successfully for {db_path} without data loss.")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    smartpark_db = os.path.join(base_dir, "smartpark.db")
    test_db = os.path.join(base_dir, "test_smartpark.db")
    migrate_db(smartpark_db)
    migrate_db(test_db)
