"""
Seed script for FleetPulse v2 development database.

Creates:
- 1 tenant: "Sidra" (Kuwait, KWD)
- 1 admin user: admin@fleetpulse.com / admin123
- 1 demo user: demo@fleetpulse.com / demo123
- 200 drivers with Arabic names, each on ONE platform
- 2 shift templates: Morning (6:00-14:00), Evening (14:00-22:00)
- 50 vehicles: 35 motorcycles + 15 cars (assigned to first 50 drivers)
- 200 location_logs (latest GPS for each driver around Kuwait City)
- 10 devices (for first 10 drivers)
- 20 shifts (first 10 drivers × today + yesterday)
- 20 attendance records
- 150 captured orders
- 15 cash records
- 6 tickets
"""
import asyncio
import random
import sys
import os
from datetime import time, date, datetime, timezone, timedelta
from decimal import Decimal
from dateutil.relativedelta import relativedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.models.tenant import Tenant
from app.models.user import User
from app.models.driver import Driver
from app.models.shift import ShiftTemplate, Shift
from app.models.vehicle import Vehicle
from app.models.location import LocationLog
from app.models.device import Device
from app.models.order import CapturedOrder
from app.models.attendance import AttendanceRecord
from app.models.cash import CashRecord
from app.models.ticket import Ticket
from app.services.auth_service import hash_password


async def seed():
    # Use OWNER connection to bypass RLS for seeding
    owner_url = settings.DATABASE_URL.replace("fleetpulse_app", "fleetpulse").replace(
        "fleetpulse_app_dev", "fleetpulse_dev"
    )
    engine = create_async_engine(owner_url, echo=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        async with session.begin():
            # ── Tenant ──
            tenant = Tenant(
                name="Sidra",
                slug="sidra",
                name_ar="سدرة",
                country="KWT",
                timezone="Asia/Kuwait",
                currency="KWD",
                subscription_plan="growth",
                max_drivers=250,
                settings={"language": "en", "late_threshold_minutes": 15},
            )
            session.add(tenant)
            await session.flush()
            tenant_id = tenant.id
            print(f"Created tenant: {tenant.name} (ID: {tenant_id})")

            # Set tenant context for RLS-protected tables
            await session.execute(
                text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
            )

            # ── Admin User ──
            admin = User(
                tenant_id=tenant_id,
                email="admin@fleetpulse.com",
                password_hash=hash_password("admin123"),
                name="System Admin",
                name_ar="مدير النظام",
                role="admin",
                language="en",
            )
            session.add(admin)
            await session.flush()
            print(f"Created admin: {admin.email}")

            # ── Demo User (read-only viewer) ──
            demo = User(
                tenant_id=tenant_id,
                email="demo@fleetpulse.com",
                password_hash=hash_password("demo123"),
                name="Demo User",
                name_ar="مستخدم تجريبي",
                role="viewer",
                language="en",
            )
            session.add(demo)
            await session.flush()
            print(f"Created demo: {demo.email}")

            # ── 200 Drivers ──
            first_names = [
                ("Ahmed", "أحمد"), ("Fahad", "فهد"), ("Khaled", "خالد"),
                ("Mohammed", "محمد"), ("Abdulrahman", "عبدالرحمن"), ("Sultan", "سلطان"),
                ("Nasser", "ناصر"), ("Yousef", "يوسف"), ("Omar", "عمر"),
                ("Ali", "علي"), ("Ibrahim", "إبراهيم"), ("Hamad", "حمد"),
                ("Saad", "سعد"), ("Turki", "تركي"), ("Faisal", "فيصل"),
                ("Bader", "بدر"), ("Nawaf", "نواف"), ("Mishal", "مشعل"),
                ("Rashed", "راشد"), ("Salman", "سلمان"),
            ]
            family_names = [
                ("Al-Shammari", "الشمري"), ("Al-Otaibi", "العتيبي"),
                ("Al-Mutairi", "المطيري"), ("Al-Dosari", "الدوسري"),
                ("Al-Hajri", "الهاجري"), ("Al-Enezi", "العنزي"),
                ("Al-Ajmi", "العجمي"), ("Al-Rashidi", "الرشيدي"),
                ("Al-Subaie", "السبيعي"), ("Al-Harbi", "الحربي"),
                ("Al-Azmi", "العازمي"), ("Al-Fadhli", "الفضلي"),
                ("Al-Kandari", "الكندري"), ("Al-Sabah", "الصباح"),
                ("Al-Bloushi", "البلوشي"), ("Al-Dhafeeri", "الظفيري"),
                ("Al-Ghanim", "الغانم"), ("Al-Khaldi", "الخالدي"),
                ("Al-Marri", "المري"), ("Al-Jaber", "الجابر"),
            ]
            platforms = ["talabat", "talabat", "keeta", "keeta", "deliveroo", "deliveroo", "jahez", "jahez", "talabat", "keeta"]
            license_groups = ["License 1", "License 2", "License 3", "License 4"]

            random.seed(42)
            name_combos = [(f, l) for f in first_names for l in family_names]
            random.shuffle(name_combos)

            drivers_data = []
            for i in range(200):
                fn, ln = name_combos[i]
                platform = platforms[i % len(platforms)]
                lg = license_groups[i % 4]
                drivers_data.append({
                    "employee_id": f"DRV-{i+1:03d}",
                    "name": f"{fn[0]} {ln[0]}",
                    "name_ar": f"{fn[1]} {ln[1]}",
                    "phone": f"+9659900{i+1:04d}",
                    "platform": platform,
                    "license_group": lg,
                    "license_number": f"KW-DL-{i+1:03d}",
                    "license_expiry": date.today() + relativedelta(months=random.randint(3, 24)),
                })

            for d in drivers_data:
                driver = Driver(tenant_id=tenant_id, nationality="Kuwaiti", **d)
                session.add(driver)
            await session.flush()
            print(f"Created {len(drivers_data)} drivers")

            # ── Shift Templates ──
            morning = ShiftTemplate(
                tenant_id=tenant_id,
                name="Morning Shift",
                name_ar="الوردية الصباحية",
                start_time=time(6, 0),
                end_time=time(14, 0),
            )
            evening = ShiftTemplate(
                tenant_id=tenant_id,
                name="Evening Shift",
                name_ar="الوردية المسائية",
                start_time=time(14, 0),
                end_time=time(22, 0),
            )
            session.add(morning)
            session.add(evening)
            await session.flush()
            print("Created 2 shift templates: Morning (6:00-14:00), Evening (14:00-22:00)")

            # ── 50 Vehicles (35 motorcycles + 15 cars) ──
            moto_models = [
                ("Honda", "PCX 150"), ("Yamaha", "NMAX 155"), ("Honda", "ADV 150"),
                ("Suzuki", "Burgman 200"), ("Kymco", "Downtown 350"),
            ]
            car_models = [
                ("Toyota", "Yaris"), ("Nissan", "Sunny"), ("Kia", "Pegas"),
                ("Hyundai", "Accent"), ("Toyota", "Corolla"),
            ]
            colors = ["Black", "White", "Silver", "Blue", "Red", "Grey"]
            ownerships = ["company", "company", "company", "rented"]

            vehicles_data = []
            for i in range(35):
                make, model = moto_models[i % len(moto_models)]
                vehicles_data.append({
                    "plate_number": f"KW-1{i+1:03d}", "make": make, "model": model,
                    "year": random.choice([2023, 2024, 2025]), "vehicle_type": "motorcycle",
                    "ownership": random.choice(ownerships), "fuel_type": "petrol",
                    "current_mileage": random.randint(1000, 30000),
                    "color": random.choice(colors),
                })
            for i in range(15):
                make, model = car_models[i % len(car_models)]
                vehicles_data.append({
                    "plate_number": f"KW-2{i+1:03d}", "make": make, "model": model,
                    "year": random.choice([2023, 2024, 2025]), "vehicle_type": "car",
                    "ownership": random.choice(ownerships), "fuel_type": "petrol",
                    "current_mileage": random.randint(3000, 50000),
                    "color": random.choice(colors),
                })

            vehicle_objs = []
            for v in vehicles_data:
                vehicle = Vehicle(tenant_id=tenant_id, **v)
                session.add(vehicle)
                vehicle_objs.append(vehicle)
            await session.flush()
            print(f"Created {len(vehicles_data)} vehicles (35 motorcycles, 15 cars)")

            # ── Assign vehicles to first 50 drivers ──
            drivers_result = await session.execute(
                text("SELECT id FROM drivers WHERE tenant_id = :tid ORDER BY employee_id"),
                {"tid": str(tenant_id)},
            )
            driver_ids = [row[0] for row in drivers_result.fetchall()]

            for i, vehicle in enumerate(vehicle_objs):
                await session.execute(
                    text("UPDATE drivers SET current_vehicle_id = :vid WHERE id = :did"),
                    {"vid": str(vehicle.id), "did": str(driver_ids[i])},
                )
            await session.flush()
            print(f"Assigned {len(vehicle_objs)} vehicles to drivers DRV-001 through DRV-050")

            # ── Location Logs (latest GPS for all 200 drivers) ──
            # Uniformly distributed across Kuwait's urban area — no ocean
            now = datetime.now(timezone.utc)

            # Predefined land-only rectangular zones across Kuwait's urban areas
            KUWAIT_LAND_ZONES = [
                # (lat_min, lat_max, lng_min, lng_max, weight) — weight = relative driver density
                (29.335, 29.350, 48.055, 48.085, 3),  # Salmiya / Rumaithiya
                (29.325, 29.345, 48.020, 48.055, 3),  # Hawalli / Jabriya
                (29.310, 29.335, 47.980, 48.020, 2),  # Surra / Khaldiya
                (29.340, 29.360, 47.945, 47.978, 2),  # Shuwaikh Industrial
                (29.270, 29.310, 47.940, 47.995, 3),  # Farwaniya / Khaitan
                (29.230, 29.270, 48.030, 48.075, 2),  # Sabah Al Salem
                (29.270, 29.305, 48.030, 48.065, 2),  # Mishref / Bayan
                (29.140, 29.180, 48.100, 48.140, 1),  # Fintaas / Abu Halifa
                (29.190, 29.230, 48.050, 48.100, 1),  # Mangaf / Fahad Al Ahmad
                (29.355, 29.378, 47.978, 48.005, 2),  # Kuwait City Downtown / Sharq
            ]
            zone_weights = [z[4] for z in KUWAIT_LAND_ZONES]

            def random_kuwait_land_point():
                zone = random.choices(KUWAIT_LAND_ZONES, weights=zone_weights, k=1)[0]
                lat = random.uniform(zone[0], zone[1])
                lng = random.uniform(zone[2], zone[3])
                return lat, lng

            for i, driver_id in enumerate(driver_ids):
                lat, lng = random_kuwait_land_point()
                speed = random.uniform(5.0, 55.0)
                bearing = random.uniform(0.0, 360.0)
                loc = LocationLog(
                    tenant_id=tenant_id,
                    driver_id=driver_id,
                    latitude=round(lat, 6),
                    longitude=round(lng, 6),
                    speed=round(speed, 1),
                    accuracy=round(random.uniform(5.0, 15.0), 1),
                    bearing=round(bearing, 1),
                    recorded_at=now - timedelta(seconds=random.randint(0, 300)),
                )
                session.add(loc)
            await session.flush()
            print(f"Created {len(driver_ids)} location logs (Kuwait City area)")

            # ── Devices (10) — for first 10 drivers ──
            first_10_ids = driver_ids[:10]
            device_models = [
                "Samsung Galaxy A54", "Samsung Galaxy A34", "Xiaomi Redmi Note 12",
                "Oppo A78", "Samsung Galaxy A54", "Samsung Galaxy A34",
                "Xiaomi Redmi Note 12", "Oppo A78", "Samsung Galaxy A54", "Samsung Galaxy A34",
            ]
            os_versions = [
                "Android 14", "Android 13", "Android 14", "Android 13", "Android 14",
                "Android 13", "Android 14", "Android 14", "Android 13", "Android 14",
            ]
            random.seed(42)  # reproducible

            device_objs = []
            for i, driver_id in enumerate(first_10_ids):
                device = Device(
                    tenant_id=tenant_id,
                    device_token=f"DEV-TOKEN-{i+1:03d}",
                    device_model=device_models[i],
                    os_version=os_versions[i],
                    app_version="1.0.0",
                    battery_level=random.randint(15, 98),
                    status="active",
                    assigned_driver_id=driver_id,
                    last_heartbeat_at=now - timedelta(minutes=random.randint(0, 45)),
                    last_location_lat=random_kuwait_land_point()[0],
                    last_location_lng=random_kuwait_land_point()[1],
                )
                session.add(device)
                device_objs.append(device)
            await session.flush()

            # Update each driver's device_id
            for i, device in enumerate(device_objs):
                await session.execute(
                    text("UPDATE drivers SET device_id = :dev_id WHERE id = :did"),
                    {"dev_id": str(device.id), "did": str(first_10_ids[i])},
                )
            await session.flush()
            print(f"Created {len(device_objs)} devices and linked to first 10 drivers")

            # ── Shifts (20) — today and yesterday ──
            morning_template_id = morning.id
            evening_template_id = evening.id
            today = date.today()
            yesterday = today - timedelta(days=1)

            shift_objs = []  # track for attendance linking

            # Today morning shifts: drivers 0-7 (8 drivers), status=in_progress
            for i in range(8):
                scheduled_start = datetime(today.year, today.month, today.day, 6, 0, tzinfo=timezone.utc)
                scheduled_end = datetime(today.year, today.month, today.day, 14, 0, tzinfo=timezone.utc)
                actual_start = scheduled_start + timedelta(minutes=random.randint(0, 10))
                shift = Shift(
                    tenant_id=tenant_id,
                    driver_id=first_10_ids[i],
                    template_id=morning_template_id,
                    date=today,
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    actual_start=actual_start,
                    status="active",
                    clock_in_method="agent",
                )
                session.add(shift)
                shift_objs.append(shift)

            # Today evening shifts: drivers 8-9 (2 drivers), status=scheduled
            for i in range(8, 10):
                scheduled_start = datetime(today.year, today.month, today.day, 14, 0, tzinfo=timezone.utc)
                scheduled_end = datetime(today.year, today.month, today.day, 22, 0, tzinfo=timezone.utc)
                shift = Shift(
                    tenant_id=tenant_id,
                    driver_id=first_10_ids[i],
                    template_id=evening_template_id,
                    date=today,
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    status="scheduled",
                )
                session.add(shift)
                shift_objs.append(shift)

            # Yesterday morning shifts: first 10 drivers, status=completed
            for i in range(10):
                scheduled_start = datetime(yesterday.year, yesterday.month, yesterday.day, 6, 0, tzinfo=timezone.utc)
                scheduled_end = datetime(yesterday.year, yesterday.month, yesterday.day, 14, 0, tzinfo=timezone.utc)
                actual_start = scheduled_start + timedelta(minutes=random.randint(0, 8))
                actual_end = scheduled_end + timedelta(minutes=random.randint(-10, 15))
                shift = Shift(
                    tenant_id=tenant_id,
                    driver_id=first_10_ids[i],
                    template_id=morning_template_id,
                    date=yesterday,
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    actual_start=actual_start,
                    actual_end=actual_end,
                    status="completed",
                    clock_in_method="agent",
                    clock_out_method="agent",
                )
                session.add(shift)
                shift_objs.append(shift)

            await session.flush()
            print(f"Created {len(shift_objs)} shifts (10 today + 10 yesterday)")

            # ── Attendance Records (20) — today and yesterday ──
            # Today: 8 present (7 on-time, 1 late), 1 absent, 1 day_off
            # shift_objs[0..7] = today morning, [8..9] = today evening, [10..19] = yesterday

            # Today morning (drivers 0-7):
            for i in range(8):
                shift = shift_objs[i]
                scheduled_start = datetime(today.year, today.month, today.day, 6, 0, tzinfo=timezone.utc)
                if i == 5:
                    # Driver 5: late by 12 minutes
                    att = AttendanceRecord(
                        tenant_id=tenant_id,
                        driver_id=first_10_ids[i],
                        shift_id=shift.id,
                        date=today,
                        status="late",
                        scheduled_start=scheduled_start,
                        actual_start=scheduled_start + timedelta(minutes=12),
                        late_minutes=12,
                        source="agent",
                    )
                else:
                    # On-time
                    att = AttendanceRecord(
                        tenant_id=tenant_id,
                        driver_id=first_10_ids[i],
                        shift_id=shift.id,
                        date=today,
                        status="present",
                        scheduled_start=scheduled_start,
                        actual_start=scheduled_start + timedelta(minutes=random.randint(0, 5)),
                        late_minutes=0,
                        source="agent" if i != 3 else "manual",
                    )
                session.add(att)

            # Today: driver 8 = absent, driver 9 = day_off (evening shift scheduled)
            att_absent = AttendanceRecord(
                tenant_id=tenant_id,
                driver_id=first_10_ids[8],
                shift_id=shift_objs[8].id,
                date=today,
                status="absent",
                scheduled_start=datetime(today.year, today.month, today.day, 14, 0, tzinfo=timezone.utc),
                source="manual",
                notes="No show, no communication",
            )
            session.add(att_absent)

            att_dayoff = AttendanceRecord(
                tenant_id=tenant_id,
                driver_id=first_10_ids[9],
                shift_id=shift_objs[9].id,
                date=today,
                status="day_off",
                scheduled_start=datetime(today.year, today.month, today.day, 14, 0, tzinfo=timezone.utc),
                source="manual",
                notes="Approved day off",
            )
            session.add(att_dayoff)

            # Yesterday: 9 present, 1 late (driver 3, 8 late_minutes)
            for i in range(10):
                shift = shift_objs[10 + i]  # yesterday shifts
                scheduled_start = datetime(yesterday.year, yesterday.month, yesterday.day, 6, 0, tzinfo=timezone.utc)
                if i == 3:
                    att = AttendanceRecord(
                        tenant_id=tenant_id,
                        driver_id=first_10_ids[i],
                        shift_id=shift.id,
                        date=yesterday,
                        status="late",
                        scheduled_start=scheduled_start,
                        actual_start=scheduled_start + timedelta(minutes=8),
                        late_minutes=8,
                        source="agent",
                    )
                else:
                    att = AttendanceRecord(
                        tenant_id=tenant_id,
                        driver_id=first_10_ids[i],
                        shift_id=shift.id,
                        date=yesterday,
                        status="present",
                        scheduled_start=scheduled_start,
                        actual_start=scheduled_start + timedelta(minutes=random.randint(0, 5)),
                        late_minutes=0,
                        source="agent" if i != 7 else "manual",
                    )
                session.add(att)

            await session.flush()
            print("Created 20 attendance records (10 today + 10 yesterday)")

            # ── Captured Orders (150) — spread over today and yesterday ──
            # Build driver platform lookup (first 10 drivers)
            driver_platforms = {}
            for d in drivers_data[:10]:
                drv_result = await session.execute(
                    text("SELECT id FROM drivers WHERE tenant_id = :tid AND employee_id = :eid"),
                    {"tid": str(tenant_id), "eid": d["employee_id"]},
                )
                drv_row = drv_result.fetchone()
                if drv_row:
                    driver_platforms[drv_row[0]] = d["platform"]

            platform_prefixes = {
                "talabat": "TAL",
                "keeta": "KEE",
                "deliveroo": "DEL",
                "jahez": "JAH",
            }

            order_count = 0
            today_str = today.strftime("%Y%m%d")
            yesterday_str = yesterday.strftime("%Y%m%d")

            # Today: ~80 orders spread across 6:00 to current (~now)
            for seq in range(80):
                drv_id = random.choice(first_10_ids)
                platform = driver_platforms[drv_id]
                prefix = platform_prefixes[platform]
                amount = Decimal(str(round(random.uniform(1.5, 8.75), 3)))
                # Spread across hours 6:00 to 14:00 (morning shift)
                hour = 6 + int((seq / 80) * 8)  # 6 to ~13
                minute = random.randint(0, 59)
                captured_at = datetime(today.year, today.month, today.day, hour, minute, tzinfo=timezone.utc)

                order = CapturedOrder(
                    tenant_id=tenant_id,
                    driver_id=drv_id,
                    device_id=device_objs[first_10_ids.index(drv_id)].id,
                    platform=platform,
                    order_ref=f"{prefix}-{today_str}-{seq+1:03d}",
                    status="captured",
                    amount=amount,
                    captured_at=captured_at,
                    parsed_data={
                        "restaurant": random.choice([
                            "Al Bader Restaurant", "Mais Alghanim", "Freej Swalef",
                            "Burger Boutique", "Elevation Burger", "Pizza Hut",
                            "McDonald's", "Hardee's", "KFC", "Shawarma House",
                        ]),
                        "customer_area": random.choice([
                            "Salmiya", "Hawally", "Sharq", "Mirqab", "Kaifan",
                            "Rumaithiya", "Mishref", "Jabriya", "Surra", "Adailiya",
                        ]),
                    },
                )
                session.add(order)
                order_count += 1

            # Yesterday: ~70 orders spread across 6:00 to 22:00
            for seq in range(70):
                drv_id = random.choice(first_10_ids)
                platform = driver_platforms[drv_id]
                prefix = platform_prefixes[platform]
                amount = Decimal(str(round(random.uniform(1.5, 8.75), 3)))
                hour = 6 + int((seq / 70) * 16)  # 6 to ~21
                minute = random.randint(0, 59)
                captured_at = datetime(yesterday.year, yesterday.month, yesterday.day, hour, minute, tzinfo=timezone.utc)

                order = CapturedOrder(
                    tenant_id=tenant_id,
                    driver_id=drv_id,
                    device_id=device_objs[first_10_ids.index(drv_id)].id,
                    platform=platform,
                    order_ref=f"{prefix}-{yesterday_str}-{seq+1:03d}",
                    status="captured",
                    amount=amount,
                    captured_at=captured_at,
                    parsed_data={
                        "restaurant": random.choice([
                            "Al Bader Restaurant", "Mais Alghanim", "Freej Swalef",
                            "Burger Boutique", "Elevation Burger", "Pizza Hut",
                            "McDonald's", "Hardee's", "KFC", "Shawarma House",
                        ]),
                        "customer_area": random.choice([
                            "Salmiya", "Hawally", "Sharq", "Mirqab", "Kaifan",
                            "Rumaithiya", "Mishref", "Jabriya", "Surra", "Adailiya",
                        ]),
                    },
                )
                session.add(order)
                order_count += 1

            await session.flush()
            print(f"Created {order_count} captured orders (80 today + 70 yesterday)")

            # ── Cash Records (15) — collections and deposits ──
            # 10 collection records from yesterday (one per driver)
            cash_count = 0
            collection_amounts = {}
            for i, drv_id in enumerate(first_10_ids):
                amount = Decimal(str(round(random.uniform(15.0, 45.0), 3)))
                collection_amounts[drv_id] = amount
                cash = CashRecord(
                    tenant_id=tenant_id,
                    driver_id=drv_id,
                    date=yesterday,
                    record_type="collection",
                    amount=amount,
                    status="verified",
                    verified_by=admin.id,
                    reference_number=f"COL-{yesterday_str}-{i+1:03d}",
                    notes=f"Daily cash collection - {drivers_data[i]['name']}",
                )
                session.add(cash)
                cash_count += 1

            # 5 deposit records from today (drivers 0-4 depositing yesterday's collections)
            for i in range(5):
                drv_id = first_10_ids[i]
                deposit_amount = collection_amounts[drv_id]
                if i < 3:
                    # Verified deposits
                    cash = CashRecord(
                        tenant_id=tenant_id,
                        driver_id=drv_id,
                        date=today,
                        record_type="deposit",
                        amount=deposit_amount,
                        status="verified",
                        verified_by=admin.id,
                        deposit_location="Sidra Main Office",
                        reference_number=f"DEP-{today_str}-{i+1:03d}",
                    )
                else:
                    # Pending deposits
                    cash = CashRecord(
                        tenant_id=tenant_id,
                        driver_id=drv_id,
                        date=today,
                        record_type="deposit",
                        amount=deposit_amount,
                        status="pending",
                        deposit_location="Sidra Main Office",
                        reference_number=f"DEP-{today_str}-{i+1:03d}",
                    )
                session.add(cash)
                cash_count += 1

            await session.flush()
            print(f"Created {cash_count} cash records (10 collections + 5 deposits)")

            # ── Tickets (6) — mix of statuses and categories ──
            tickets_data = [
                # 2 open
                {
                    "title": "Motorcycle engine overheating",
                    "title_ar": "ارتفاع حرارة محرك الدراجة",
                    "description": "KW-1001 engine temperature warning light came on during afternoon shift. Needs inspection.",
                    "category": "vehicle_issue",
                    "priority": "high",
                    "status": "open",
                    "driver_id": first_10_ids[0],
                    "vehicle_id": vehicle_objs[0].id,
                    "created_by": admin.id,
                },
                {
                    "title": "Phone screen cracked",
                    "title_ar": "شاشة الهاتف مكسورة",
                    "description": "Device screen cracked after falling during delivery. Agent app still functional but touch is intermittent.",
                    "category": "device_issue",
                    "priority": "medium",
                    "status": "open",
                    "driver_id": first_10_ids[2],
                    "created_by": admin.id,
                },
                # 1 in_progress (accident)
                {
                    "title": "Minor traffic accident - Sharq area",
                    "title_ar": "حادث مروري بسيط - منطقة شرق",
                    "description": "Driver involved in minor fender bender at Sharq roundabout. No injuries, vehicle has scratches on left side.",
                    "category": "accident",
                    "priority": "urgent",
                    "status": "in_progress",
                    "driver_id": first_10_ids[4],
                    "vehicle_id": vehicle_objs[2].id,
                    "assigned_to": admin.id,
                    "created_by": admin.id,
                    "data": {"police_report_number": "KW-2024-TR-4521", "insurance_notified": True},
                },
                # 1 resolved (complaint)
                {
                    "title": "Customer complaint - late delivery",
                    "title_ar": "شكوى عميل - تأخر التوصيل",
                    "description": "Customer complained about 45 minute delay. Driver was stuck in traffic on 5th Ring Road.",
                    "category": "complaint",
                    "priority": "medium",
                    "status": "resolved",
                    "driver_id": first_10_ids[1],
                    "created_by": admin.id,
                    "resolved_at": now - timedelta(hours=3),
                },
                # 1 closed (leave_request)
                {
                    "title": "Annual leave request - 5 days",
                    "title_ar": "طلب إجازة سنوية - 5 أيام",
                    "description": "Requesting annual leave from March 1-5 for family visit.",
                    "category": "leave_request",
                    "priority": "low",
                    "status": "closed",
                    "driver_id": first_10_ids[6],
                    "created_by": admin.id,
                    "resolved_at": now - timedelta(days=2),
                },
                # 1 open/scheduled (vehicle_issue, maintenance scheduled)
                {
                    "title": "Scheduled oil change - KW-2001",
                    "title_ar": "تغيير زيت مجدول - KW-2001",
                    "description": "Toyota Yaris KW-2001 due for oil change at 25,000 km. Appointment booked at dealership.",
                    "category": "vehicle_issue",
                    "priority": "low",
                    "status": "open",
                    "vehicle_id": vehicle_objs[3].id,
                    "created_by": admin.id,
                    "data": {"scheduled_date": str(today + timedelta(days=3)), "service_type": "oil_change"},
                },
            ]

            for t_data in tickets_data:
                ticket = Ticket(tenant_id=tenant_id, **t_data)
                session.add(ticket)
            await session.flush()
            print(f"Created {len(tickets_data)} tickets (2 open, 1 in_progress, 1 resolved, 1 closed, 1 scheduled)")

    await engine.dispose()
    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
