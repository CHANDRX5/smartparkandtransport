"""SmartPark AI - Database Seeding Script.

Seeds realistic simulated demonstration data for users, parking facilities, spaces,
historical occupancy, bookings, payments, lost & found reports, vehicle matches,
transport routes, stops, crowd observations, and notifications.

All generated data is explicitly flagged as simulated demonstration data.
"""
import sys
import os
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    User, ParkingFacility, ParkingSpace, ParkingAvailability,
    Vehicle, Booking, Payment,
    LostVehicleReport, FoundVehicleReport, VehicleImage,
    SuggestedMatch, ReportStatusHistory,
    TransportRoute, TransportStop, TransportObservation,
    SavedLocation, AIPrediction, Notification
)


def seed_database():
    print("Initializing SmartPark AI Database Seeding...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter_by(email="admin@smartpark.ai").first():
            print("Database already contains seed data. Skipping user recreation or re-seeding.")
            db.close()
            return

        print("Creating demo users...")
        admin_user = User(
            email="admin@smartpark.ai",
            username="admin",
            hashed_password=get_password_hash("Admin@123"),
            full_name="System Administrator",
            phone="+91 98765 43210",
            role="admin",
            is_active=True
        )
        operator_user = User(
            email="operator@smartpark.ai",
            username="operator",
            hashed_password=get_password_hash("Operator@123"),
            full_name="ParkOps Manager",
            phone="+91 98765 43211",
            role="operator",
            is_active=True
        )
        citizen_user = User(
            email="user@smartpark.ai",
            username="citizen",
            hashed_password=get_password_hash("User@123"),
            full_name="John Citizen",
            phone="+91 98765 43212",
            role="citizen",
            is_active=True
        )
        db.add_all([admin_user, operator_user, citizen_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(operator_user)
        db.refresh(citizen_user)

        print("Creating demo parking facilities...")
        facilities_data = [
            {
                "name": "MG Road Metro Smart Hub Parking",
                "address": "12 MG Road, Brigade Junction",
                "city": "Bengaluru",
                "latitude": 12.9756,
                "longitude": 77.6067,
                "total_capacity": 120,
                "available_spaces": 42,
                "price_per_hour": 50.0,
                "operating_hours": {"open": "00:00", "close": "23:59"},
                "amenities": ["cctv", "ev_charging", "covered", "valet", "24x7"]
            },
            {
                "name": "Indiranagar 100ft Multi-Level Park",
                "address": "45 100 Feet Road, HAL 2nd Stage",
                "city": "Bengaluru",
                "latitude": 12.9719,
                "longitude": 77.6412,
                "total_capacity": 80,
                "available_spaces": 15,
                "price_per_hour": 60.0,
                "operating_hours": {"open": "06:00", "close": "23:00"},
                "amenities": ["cctv", "ev_charging", "covered"]
            },
            {
                "name": "Koramangala 80ft Tech Park Haven",
                "address": "88 80 Feet Road, 4th Block, Koramangala",
                "city": "Bengaluru",
                "latitude": 12.9352,
                "longitude": 77.6245,
                "total_capacity": 150,
                "available_spaces": 68,
                "price_per_hour": 40.0,
                "operating_hours": {"open": "00:00", "close": "23:59"},
                "amenities": ["cctv", "wheelchair_accessible", "restroom"]
            },
            {
                "name": "Whitefield ITPL Gateway Parking",
                "address": "International Tech Park, Whitefield Main Rd",
                "city": "Bengaluru",
                "latitude": 12.9857,
                "longitude": 77.7317,
                "total_capacity": 200,
                "available_spaces": 94,
                "price_per_hour": 45.0,
                "operating_hours": {"open": "00:00", "close": "23:59"},
                "amenities": ["cctv", "ev_charging", "covered", "restroom"]
            },
            {
                "name": "Majestic Central Transit Parking",
                "address": "Opposite Kempegowda Bus Station",
                "city": "Bengaluru",
                "latitude": 12.9777,
                "longitude": 77.5726,
                "total_capacity": 250,
                "available_spaces": 31,
                "price_per_hour": 35.0,
                "operating_hours": {"open": "00:00", "close": "23:59"},
                "amenities": ["cctv", "direct_metro_access", "covered"]
            },
            {
                "name": "Electronic City Phase 1 Express Park",
                "address": "Hosur Road, Near Toll Plaza",
                "city": "Bengaluru",
                "latitude": 12.8452,
                "longitude": 77.6602,
                "total_capacity": 100,
                "available_spaces": 55,
                "price_per_hour": 30.0,
                "operating_hours": {"open": "05:00", "close": "23:59"},
                "amenities": ["cctv", "ev_charging", "shuttle"]
            }
        ]

        facility_instances = []
        for fac in facilities_data:
            facility = ParkingFacility(
                name=fac["name"],
                address=fac["address"],
                city=fac["city"],
                latitude=fac["latitude"],
                longitude=fac["longitude"],
                total_capacity=fac["total_capacity"],
                available_spaces=fac["available_spaces"],
                price_per_hour=fac["price_per_hour"],
                operator_id=operator_user.id,
                operating_hours=fac["operating_hours"],
                amenities=fac["amenities"],
                is_demo_data=True
            )
            db.add(facility)
            facility_instances.append(facility)
        db.commit()

        print("Creating demarcated parking spaces...")
        space_types = ["car", "suv", "motorcycle", "car", "car"]
        for fac in facility_instances:
            db.refresh(fac)
            for i in range(1, 16):
                stype = space_types[i % len(space_types)]
                space = ParkingSpace(
                    facility_id=fac.id,
                    space_number=f"P-{i:02d}",
                    vehicle_type=stype,
                    floor_level="G" if i <= 8 else "1st",
                    is_covered=True,
                    is_ev_charging=(i % 4 == 0),
                    is_occupied=(i % 3 == 0)
                )
                db.add(space)

        print("Generating historical occupancy records for ML...")
        now = datetime.now(timezone.utc)
        for fac in facility_instances:
            for day_offset in range(14, 0, -1):
                for hour in [8, 10, 12, 14, 17, 19, 21]:
                    base_rate = 0.4
                    if hour in [9, 10, 11, 17, 18, 19]:
                        base_rate = 0.85
                    elif hour in [12, 13, 14]:
                        base_rate = 0.65
                    occupied = int(fac.total_capacity * base_rate)
                    avail = fac.total_capacity - occupied
                    rate = round(occupied / fac.total_capacity, 2)
                    
                    hist_entry = ParkingAvailability(
                        facility_id=fac.id,
                        timestamp=now - timedelta(days=day_offset, hours=24-hour),
                        total_spaces=fac.total_capacity,
                        occupied_spaces=occupied,
                        available_spaces=avail,
                        occupancy_rate=rate,
                        day_of_week=(now - timedelta(days=day_offset)).weekday(),
                        hour_of_day=hour,
                        is_demo_data=True
                    )
                    db.add(hist_entry)
        db.commit()

        print("Creating demo vehicle, booking & payment...")
        demo_vehicle = Vehicle(
            owner_id=citizen_user.id,
            registration_number="KA-01-MJ-5421",
            vehicle_type="car",
            make="Hyundai",
            model="Creta",
            color="White"
        )
        db.add(demo_vehicle)
        db.commit()
        db.refresh(demo_vehicle)

        start_time = now + timedelta(hours=2)
        end_time = now + timedelta(hours=6)
        booking1 = Booking(
            booking_ref="SP-BK-2026-9041",
            user_id=citizen_user.id,
            facility_id=facility_instances[0].id,
            vehicle_id=demo_vehicle.id,
            vehicle_reg_number="KA-01-MJ-5421",
            vehicle_type="car",
            booking_date=now,
            start_time=start_time,
            end_time=end_time,
            duration_hours=4.0,
            price_per_hour=50.0,
            total_amount=200.0,
            status="confirmed"
        )
        db.add(booking1)
        db.commit()
        db.refresh(booking1)

        payment1 = Payment(
            booking_id=booking1.id,
            user_id=citizen_user.id,
            amount=200.0,
            currency="INR",
            status="completed",
            payment_method="demo_sandbox",
            transaction_ref="SP-TXN-98421049",
            is_demo_payment=True,
            paid_at=now
        )
        db.add(payment1)

        print("Creating Lost & Found reports and match engine data...")
        lost_rep = LostVehicleReport(
            reporter_id=citizen_user.id,
            report_ref="LV-2026-0042",
            vehicle_reg_number="KA-05-AB-9876",
            vehicle_type="car",
            make="Honda",
            model="City",
            color="Silver",
            last_known_location="Phoenix Marketcity Underground Parking, Whitefield",
            last_known_latitude=12.9961,
            last_known_longitude=77.6970,
            last_seen_date=now - timedelta(days=2),
            description="Silver sedan with minor scratch on left rear bumper. Tinted rear glass.",
            contact_phone="+91 98765 43212",
            contact_visibility="private",
            status="potential_match"
        )
        db.add(lost_rep)
        db.commit()
        db.refresh(lost_rep)

        found_rep = FoundVehicleReport(
            reporter_id=operator_user.id,
            report_ref="FV-2026-0081",
            vehicle_reg_number="KA-05-AB-9876",
            vehicle_type="car",
            make="Honda",
            model="City",
            color="Silver",
            found_location="ITPL Gateway Parking Area Bay 4B, Whitefield",
            found_latitude=12.9857,
            found_longitude=77.7317,
            found_date=now - timedelta(days=1),
            description="Unattended vehicle parked for over 48 hours without active ticket. Matching silver Honda City.",
            contact_phone="+91 98765 43211",
            status="potential_match"
        )
        db.add(found_rep)
        db.commit()
        db.refresh(found_rep)

        match = SuggestedMatch(
            lost_report_id=lost_rep.id,
            found_report_id=found_rep.id,
            match_score=94.5,
            match_reasons="Exact license plate match (KA-05-AB-9876); Matching make (Honda) and model (City); Matching color (Silver); Nearby location within 4.2 km.",
            status="pending"
        )
        db.add(match)

        hist = ReportStatusHistory(
            lost_report_id=lost_rep.id,
            old_status="open",
            new_status="potential_match",
            changed_by=admin_user.id,
            notes="Automated Rule-Based Match Engine identified 94.5% match with report FV-2026-0081"
        )
        db.add(hist)

        print("Creating Public Transport routes, stops and crowd observations...")
        route_purple = TransportRoute(
            route_number="Purple Line",
            route_name="Baiyappanahalli to Kengeri Express",
            route_type="metro",
            origin="Baiyappanahalli",
            destination="Kengeri",
            frequency_minutes=5,
            is_active=True,
            is_demo_data=True
        )
        route_bus = TransportRoute(
            route_number="500-D",
            route_name="Silk Board to Hebbal Outer Ring Road",
            route_type="bus",
            origin="Central Silk Board",
            destination="Hebbal",
            frequency_minutes=10,
            is_active=True,
            is_demo_data=True
        )
        db.add_all([route_purple, route_bus])
        db.commit()
        db.refresh(route_purple)
        db.refresh(route_bus)

        metro_stops = [
            ("Baiyappanahalli", 1, 12.9907, 77.6525, "08:00"),
            ("Indiranagar", 2, 12.9783, 77.6408, "08:08"),
            ("Halasuru", 3, 12.9760, 77.6264, "08:14"),
            ("Trinity", 4, 12.9729, 77.6171, "08:18"),
            ("MG Road", 5, 12.9756, 77.6067, "08:22"),
            ("Cubbon Park", 6, 12.9813, 77.5971, "08:26"),
            ("Majestic Inter-change", 7, 12.9754, 77.5728, "08:33")
        ]
        for name, seq, lat, lng, arr in metro_stops:
            db.add(TransportStop(
                route_id=route_purple.id,
                stop_name=name,
                stop_order=seq,
                latitude=lat,
                longitude=lng,
                scheduled_arrival=arr
            ))

        for hour in [8, 9, 12, 14, 17, 18, 20]:
            level = "high" if hour in [8, 9, 17, 18] else ("moderate" if hour in [12, 14] else "low")
            pct = 88.0 if level == "high" else (55.0 if level == "moderate" else 28.0)
            db.add(TransportObservation(
                route_id=route_purple.id,
                timestamp=now - timedelta(hours=24-hour),
                day_of_week=now.weekday(),
                hour_of_day=hour,
                crowd_level=level,
                crowd_percentage=pct,
                is_demo_data=True
            ))

        print("Creating notifications...")
        db.add_all([
            Notification(
                user_id=citizen_user.id,
                title="Booking Confirmed: MG Road Metro Smart Hub",
                message="Your parking spot at MG Road Metro Smart Hub is confirmed for today. Ref: SP-BK-2026-9041.",
                notification_type="booking",
                is_read=False
            ),
            Notification(
                user_id=citizen_user.id,
                title="Potential Vehicle Match Found! (94.5%)",
                message="A vehicle matching your reported Honda City (KA-05-AB-9876) has been sighted at ITPL Gateway Parking.",
                notification_type="lost_found",
                is_read=False
            ),
            Notification(
                user_id=citizen_user.id,
                title="Payment Received",
                message="Payment of INR 200.00 for Booking SP-BK-2026-9041 was successfully processed via Sandbox.",
                notification_type="payment",
                is_read=True
            )
        ])

        db.commit()
        print("SmartPark AI database successfully seeded with realistic demonstration data!")
        print("Demo Credentials:")
        print("  Admin:    admin@smartpark.ai    / Admin@123")
        print("  Operator: operator@smartpark.ai / Operator@123")
        print("  Citizen:  user@smartpark.ai     / User@123")

    except Exception as e:
        db.rollback()
        print(f"Error during database seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
