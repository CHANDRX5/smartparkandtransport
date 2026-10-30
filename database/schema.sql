-- SmartPark AI Database Schema (PostgreSQL & SQLite Compatible DDL)
-- Intelligent Parking, Travel & Vehicle Recovery Platform

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(50) DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Parking Facilities
CREATE TABLE IF NOT EXISTS parking_facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    total_capacity INTEGER NOT NULL,
    available_spaces INTEGER NOT NULL,
    hourly_rate DOUBLE PRECISION NOT NULL,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    operating_hours VARCHAR(100) DEFAULT '24/7',
    amenities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_facilities_city ON parking_facilities(city);
CREATE INDEX IF NOT EXISTS idx_facilities_coords ON parking_facilities(latitude, longitude);

-- Parking Spaces
CREATE TABLE IF NOT EXISTS parking_spaces (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES parking_facilities(id) ON DELETE CASCADE,
    space_number VARCHAR(50) NOT NULL,
    space_type VARCHAR(50) DEFAULT 'standard',
    floor VARCHAR(20) DEFAULT 'G',
    is_occupied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_spaces_facility ON parking_spaces(facility_id);

-- Parking Availability History
CREATE TABLE IF NOT EXISTS parking_availability (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES parking_facilities(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occupied_spaces INTEGER NOT NULL,
    total_capacity INTEGER NOT NULL,
    occupancy_percentage DOUBLE PRECISION NOT NULL,
    is_simulated BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_availability_facility_ts ON parking_availability(facility_id, timestamp);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    make_model VARCHAR(100),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    facility_id INTEGER REFERENCES parking_facilities(id) ON DELETE CASCADE,
    space_id INTEGER REFERENCES parking_spaces(id) ON DELETE SET NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_facility ON bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_method VARCHAR(50) DEFAULT 'online',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    is_simulated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- Lost Vehicle Reports
CREATE TABLE IF NOT EXISTS lost_vehicle_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_reference VARCHAR(50) UNIQUE NOT NULL,
    license_plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    last_seen_location TEXT NOT NULL,
    last_seen_latitude DOUBLE PRECISION,
    last_seen_longitude DOUBLE PRECISION,
    last_seen_datetime TIMESTAMP NOT NULL,
    description TEXT,
    contact_name VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    hide_contact_details BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lost_license ON lost_vehicle_reports(license_plate);
CREATE INDEX IF NOT EXISTS idx_lost_status ON lost_vehicle_reports(status);

-- Found Vehicle Reports
CREATE TABLE IF NOT EXISTS found_vehicle_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_reference VARCHAR(50) UNIQUE NOT NULL,
    license_plate VARCHAR(50),
    vehicle_type VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    found_location TEXT NOT NULL,
    found_latitude DOUBLE PRECISION,
    found_longitude DOUBLE PRECISION,
    found_datetime TIMESTAMP NOT NULL,
    description TEXT,
    contact_name VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_found_license ON found_vehicle_reports(license_plate);

-- Vehicle Images
CREATE TABLE IF NOT EXISTS vehicle_images (
    id SERIAL PRIMARY KEY,
    lost_report_id INTEGER REFERENCES lost_vehicle_reports(id) ON DELETE CASCADE,
    found_report_id INTEGER REFERENCES found_vehicle_reports(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suggested Matches
CREATE TABLE IF NOT EXISTS suggested_matches (
    id SERIAL PRIMARY KEY,
    lost_report_id INTEGER REFERENCES lost_vehicle_reports(id) ON DELETE CASCADE,
    found_report_id INTEGER REFERENCES found_vehicle_reports(id) ON DELETE CASCADE,
    match_score DOUBLE PRECISION NOT NULL,
    match_reasons TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_matches_lost ON suggested_matches(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_found ON suggested_matches(found_report_id);

-- Report Status History
CREATE TABLE IF NOT EXISTS report_status_history (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    report_id INTEGER NOT NULL,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transport Routes & Stops
CREATE TABLE IF NOT EXISTS transport_routes (
    id SERIAL PRIMARY KEY,
    route_number VARCHAR(50) NOT NULL,
    route_name VARCHAR(150) NOT NULL,
    transport_type VARCHAR(50) DEFAULT 'BUS',
    origin VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transport_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES transport_routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    stop_sequence INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    scheduled_arrival_time VARCHAR(20)
);

-- Transport Crowd Observations
CREATE TABLE IF NOT EXISTS transport_observations (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES transport_routes(id) ON DELETE CASCADE,
    stop_id INTEGER REFERENCES transport_stops(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    crowd_level VARCHAR(50) DEFAULT 'MODERATE',
    crowd_percentage DOUBLE PRECISION NOT NULL,
    source VARCHAR(50) DEFAULT 'SIMULATED',
    is_simulated BOOLEAN DEFAULT TRUE
);

-- Saved Locations
CREATE TABLE IF NOT EXISTS saved_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Route History
CREATE TABLE IF NOT EXISTS route_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    origin_name VARCHAR(200) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_name VARCHAR(200) NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    route_type VARCHAR(50) DEFAULT 'shortest',
    distance_km DOUBLE PRECISION NOT NULL,
    duration_mins DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Predictions
CREATE TABLE IF NOT EXISTS ai_predictions (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES parking_facilities(id) ON DELETE CASCADE,
    predicted_for_time TIMESTAMP NOT NULL,
    predicted_occupancy_percentage DOUBLE PRECISION NOT NULL,
    predicted_available_spaces INTEGER NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    model_version VARCHAR(50) DEFAULT 'rf-v1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
