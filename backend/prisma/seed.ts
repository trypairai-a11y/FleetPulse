import { PrismaClient, Platform, UserRole, DriverStatus, VehicleType, VehicleStatus, ShiftStatus, AttendanceStatus, OrderSource, CashStatus, DepositMethod, DeviceStatus, AlertSeverity, AlertStatus, ScoreTrend, TicketCategory, TicketPriority, TicketStatus, SubmitterType, LeaveType, LeaveStatus, RecruitmentStage, LedgerStatus, InspectionStatus, MaintenanceCategory, MaintenanceStatus, TalabatSessionStatus, ComplianceEventType } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=5' } },
});

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function decimal(min: number, max: number, places = 3) { return parseFloat((Math.random() * (max - min) + min).toFixed(places)); }

const SOUTH_ASIAN_NAMES = [
  "Anil Kumar", "Rajesh Sharma", "Mohammed Ali", "Ravi Singh", "Suresh Patel",
  "Deepak Gupta", "Arjun Das", "Vikram Reddy", "Sanjay Mishra", "Ramesh Yadav",
  "Abdul Rahman", "Farhan Ahmed", "Imran Khan", "Hassan Malik", "Zeeshan Shaker",
  "Bilal Hussain", "Usman Ghani", "Tariq Mehmood", "Shahid Afridi", "Nasir Javed",
  "Kamal Hasan", "Rohit Verma", "Amit Chauhan", "Pradeep Nair", "Ganesh Iyer",
  "Sunil Joshi", "Manoj Tiwari", "Ashok Pillai", "Dinesh Menon", "Prakash Rao",
  "Faisal Ansari", "Irfan Siddiqui", "Junaid Akhtar", "Kashif Raza", "Liaqat Hayat",
  "Mahesh Babu", "Naresh Kumar", "Om Prakash", "Pankaj Dubey", "Qasim Rauf",
  "Raju Thomas", "Salman Mirza", "Tanveer Aslam", "Umair Butt", "Vijay Shankar",
  "Waseem Abbas", "Yousuf Kareem", "Zaheer Iqbal", "Akhil Mathew", "Brijesh Pandey",
  "Chandan Roy", "Dilip Sarkar", "Ehsan Elahi", "Firoz Shah", "Gopal Krishna",
  "Hari Prasad", "Jagdish Chand", "Kishore Lal", "Lakshman Swamy", "Mukesh Ambani",
  "Nitin Gadkari", "Onkar Singh", "Pramod Sawant", "Raghav Menon", "Satish Kaushik",
  "Tarun Bajaj", "Uttam Kumar", "Venkat Raman", "Waqar Younis", "Yashpal Arora",
  "Adil Rashid", "Babar Azam", "Chirag Patel", "Danish Kaneria", "Ejaz Chaudhry",
  "Fahad Mustafa", "Ghulam Abbas", "Hamza Malik", "Ismail Khan", "Javed Miandad",
  "Kamran Akmal", "Latif Dogar", "Moeen Ali", "Nabeel Akhtar", "Omar Farooq",
  "Pervez Alam", "Qadir Baloch", "Rizwan Ahmed", "Saeed Anwar", "Tahir Nawaz",
  "Umar Gul", "Wahab Riaz", "Yasir Shah", "Zulfiqar Ali", "Asad Shafiq",
];

const KUWAIT_COORDS = [
  { lat: 29.3759, lng: 47.9774 }, // Kuwait City
  { lat: 29.3375, lng: 48.0243 }, // Hawally
  { lat: 29.3340, lng: 48.0760 }, // Salmiya
  { lat: 29.3180, lng: 48.0480 }, // Jabriya
  { lat: 29.2930, lng: 48.0670 }, // Rumaithiya
  { lat: 29.2700, lng: 47.9800 }, // Sabah Al Salem
  { lat: 29.3400, lng: 47.9200 }, // Jahra (approx)
  { lat: 29.2300, lng: 47.9700 }, // Farwaniya
];

const PHONE_MODELS = ["Samsung Galaxy A14", "Samsung Galaxy A15", "Samsung Galaxy A25", "Xiaomi Redmi 12", "Xiaomi Redmi 13"];

async function main() {
  console.log("Seeding Darb database...");

  // Clean existing data
  // Clean existing data - safe to skip on fresh DB
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "TalabatDelivery", "AmericanaDailyOrders", "KeetaDailyMetrics", "TalabatComplianceEvent", "TalabatSession", "AuditLog", "AiDigest", "Alert", "AiScore", "DeviceCommand", "AppUsageLog", "LocationLog", "CapturedOrder", "Device", "VehicleInspection", "MaintenanceRecord", "PendingDuesLedger", "CashRecord", "CashTransaction", "OrderLog", "AttendanceRecord", "Shift", "DriverInventory", "LeaveRequest", "Ticket", "RecruitmentPipeline", "KpiRecord", "KpiDefinition", "PlatformSettings", "CompanyInventory", "Notification", "NotificationRule", "Vehicle", "Driver", "User", "Company", "Tenant" CASCADE`);
  } catch (e: any) { console.log("Truncate issue:", e.message?.slice(0, 200)); }

  // 1. Tenant
  const tenant = await prisma.tenant.create({
    data: { name: "Osama Fleet Management", subscriptionPlan: "ENTERPRISE" },
  });
  const tid = tenant.id;

  // 2. Companies
  const sidra = await prisma.company.create({ data: { tenantId: tid, name: "Sidra", platform: "KEETA", licenseCount: 4 } });
  const wahoo = await prisma.company.create({ data: { tenantId: tid, name: "Wahoo International", platform: "TALABAT" } });
  const alhazim = await prisma.company.create({ data: { tenantId: tid, name: "Alhazim", platform: "TALABAT" } });
  const alHazm = await prisma.company.create({ data: { tenantId: tid, name: "Al Hazm", platform: "DELIVEROO" } });
  const alHazmExp = await prisma.company.create({ data: { tenantId: tid, name: "Al Hazm Express", platform: "AMERICANA" } });

  // 3. Users
  const pw = await bcrypt.hash("demo123", 12);
  const users = await Promise.all([
    prisma.user.create({ data: { tenantId: tid, email: "osama@fleet.kw", name: "Osama", role: "ADMIN", passwordHash: pw } }),
    prisma.user.create({ data: { tenantId: tid, email: "ahmed@fleet.kw", name: "Ahmed Al-Sabah", role: "OPS_MANAGER", passwordHash: pw } }),
    prisma.user.create({ data: { tenantId: tid, email: "khalid@fleet.kw", name: "Khalid Al-Rashid", role: "SUPERVISOR", passwordHash: pw } }),
    prisma.user.create({ data: { tenantId: tid, email: "mohammed@fleet.kw", name: "Mohammed Al-Harbi", role: "SUPERVISOR", passwordHash: pw } }),
    prisma.user.create({ data: { tenantId: tid, email: "fatima@fleet.kw", name: "Fatima Al-Mutairi", role: "ACCOUNTANT", passwordHash: pw } }),
  ]);

  // 4. Drivers (80 total)
  const keetaZones = ["Hawally", "Salmiya", "Ardiya", "Jahra", "Khiran", "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf"];
  const talabatZones = ["Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem"];
  const allDrivers: any[] = [];
  let nameIdx = 0;

  // Keeta/Sidra - 35 drivers
  for (let i = 0; i < 35; i++) {
    const vt: VehicleType = Math.random() < 0.7 ? "MOTORCYCLE" : "CAR";
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: sidra.id, name: SOUTH_ASIAN_NAMES[nameIdx],
        photoUrl: `https://i.pravatar.cc/150?u=driver${nameIdx++}`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "KEETA",
        platformDriverId: `KC${rand(100000, 999999)}`, vehicleType: vt,
        zone: pick(keetaZones), status: "ACTIVE",
        hireDate: new Date(2025, rand(0, 11), rand(1, 28)),
        supervisorId: users[2].id,
      },
    });
    allDrivers.push(d);
  }

  // Talabat/Wahoo - 25 drivers
  for (let i = 0; i < 25; i++) {
    const name = SOUTH_ASIAN_NAMES[nameIdx];
    const photoIdx = nameIdx++;
    const batch = `${rand(1, 4)}`;
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: wahoo.id,
        name: `${name.toUpperCase()} ${batch} - WAHI`,
        photoUrl: `https://i.pravatar.cc/150?u=driver${photoIdx}`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "TALABAT",
        platformDriverId: `TB${rand(100000, 999999)}`, vehicleType: Math.random() < 0.7 ? "MOTORCYCLE" : "CAR",
        zone: pick(talabatZones), batchNumber: batch, status: "ACTIVE",
        hireDate: new Date(2025, rand(0, 11), rand(1, 28)),
        supervisorId: users[3].id,
      },
    });
    allDrivers.push(d);
  }

  // Talabat/Alhazim - 15 drivers
  for (let i = 0; i < 15; i++) {
    const name = SOUTH_ASIAN_NAMES[nameIdx];
    const photoIdx = nameIdx++;
    const batch = `${rand(1, 4)}`;
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: alhazim.id,
        name: `${name.toUpperCase()} ${batch} - ALHZ`,
        photoUrl: `https://i.pravatar.cc/150?u=driver${photoIdx}`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "TALABAT",
        platformDriverId: `TB${rand(100000, 999999)}`, vehicleType: Math.random() < 0.7 ? "MOTORCYCLE" : "CAR",
        zone: pick(talabatZones), batchNumber: batch, status: "ACTIVE",
        hireDate: new Date(2025, rand(0, 11), rand(1, 28)),
        supervisorId: users[3].id,
      },
    });
    allDrivers.push(d);
  }

  // Deliveroo/Al Hazm - 12 drivers
  for (let i = 0; i < 12; i++) {
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: alHazm.id, name: SOUTH_ASIAN_NAMES[nameIdx],
        photoUrl: `https://i.pravatar.cc/150?u=driver${nameIdx++}`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "DELIVEROO",
        platformDriverId: `#${rand(100000, 999999)}`, vehicleType: "MOTORCYCLE",
        zone: "Hawally", status: "ACTIVE",
        hireDate: new Date(2025, rand(0, 11), rand(1, 28)),
      },
    });
    allDrivers.push(d);
  }

  // Americana/Al Hazm Express - 8 drivers
  const stores = ["KFC Audiliya", "KFC Salwa", "Hardees Salmiya"];
  for (let i = 0; i < 8; i++) {
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: alHazmExp.id, name: SOUTH_ASIAN_NAMES[nameIdx],
        photoUrl: `https://i.pravatar.cc/150?u=driver${nameIdx++}`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "AMERICANA",
        platformDriverId: `${rand(60000, 69999)}`, vehicleType: Math.random() < 0.5 ? "MOTORCYCLE" : "CAR",
        zone: pick(stores), status: "ACTIVE",
        hireDate: new Date(2025, rand(0, 11), rand(1, 28)),
      },
    });
    allDrivers.push(d);
  }

  console.log(`Created ${allDrivers.length} drivers`);

  // 5. Vehicles (60)
  const vehicleData: any[] = [];
  const companies = [sidra, wahoo, alhazim, alHazm, alHazmExp];
  for (let i = 0; i < 60; i++) {
    const comp = companies[Math.min(Math.floor(i / 18), 3)];
    const vt: VehicleType = i < 42 ? "MOTORCYCLE" : "CAR";
    const driver = i < allDrivers.length ? allDrivers[i] : null;
    const colors = vt === "MOTORCYCLE"
      ? ["Black", "Red", "White", "Blue", "Silver"]
      : ["White", "Silver", "Grey", "Black", "Blue", "Red"];
    vehicleData.push({
      tenantId: tid, companyId: comp.id,
      plateNumber: `KW-${rand(10000, 99999)}`,
      vehicleType: vt,
      make: vt === "MOTORCYCLE" ? pick(["Honda", "Yamaha", "Suzuki"]) : pick(["Toyota", "Nissan", "Hyundai"]),
      model: vt === "MOTORCYCLE" ? pick(["PCX 150", "NMAX", "Gixxer"]) : pick(["Yaris", "Sunny", "Accent"]),
      year: rand(2021, 2025), mileage: rand(5000, 50000),
      color: pick(colors),
      chassisNumber: `${pick(["JH", "JM", "MR", "KN", "5N"])}${rand(100000, 999999)}${rand(100000, 999999)}`,
      status: i < 58 ? "ACTIVE" as VehicleStatus : "MAINTENANCE" as VehicleStatus,
      assignedDriverId: driver?.id || null,
      insuranceExpiry: new Date(2026, rand(3, 9), rand(1, 28)),
      registrationExpiry: new Date(2026, rand(3, 9), rand(1, 28)),
    });
  }
  for (const v of vehicleData) {
    try { await prisma.vehicle.create({ data: v }); } catch { /* skip duplicate plate */ }
  }

  // 6. Devices (80 phones)
  for (let i = 0; i < allDrivers.length; i++) {
    const driver = allDrivers[i];
    const isOnline = Math.random() < 0.9;
    const coord = pick(KUWAIT_COORDS);
    await prisma.device.create({
      data: {
        tenantId: tid, driverId: driver.id,
        imei: `${rand(100000000000000, 999999999999999)}`,
        model: pick(PHONE_MODELS),
        osVersion: pick(["Android 13", "Android 14"]),
        agentVersion: Math.random() < 0.85 ? "1.0.0" : "0.9.8",
        lastSeen: isOnline ? new Date() : new Date(Date.now() - rand(1, 24) * 3600000),
        batteryLevel: rand(20, 95),
        isOnline,
        status: "ACTIVE",
        lastLatitude: coord.lat + decimal(-0.02, 0.02),
        lastLongitude: coord.lng + decimal(-0.02, 0.02),
      },
    });
  }

  // 7. Shifts, Attendance, Orders (30 days past + 3 future)
  const today = new Date();
  const nowHour = today.getHours();
  const keetaDrivers = allDrivers.filter(d => d.platform === "KEETA");
  const talabatDrivers = allDrivers.filter(d => d.platform === "TALABAT");
  const deliverooDrivers = allDrivers.filter(d => d.platform === "DELIVEROO");
  const americanaDrivers = allDrivers.filter(d => d.platform === "AMERICANA");

  for (let dayOffset = 29; dayOffset >= -3; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);
    const isToday = dayOffset === 0;
    const isFuture = dayOffset < 0;

    // Keeta shifts (4-hour blocks) - skip future days
    if (!isFuture)
    for (const driver of keetaDrivers) {
      const numShifts = rand(1, 2);
      for (let s = 0; s < numShifts; s++) {
        const blocks = [[4, 8], [8, 12], [12, 15], [15, 19]];
        const block = blocks[rand(0, 3)];
        const start = new Date(date); start.setHours(block[0]);
        const end = new Date(date); end.setHours(block[1]);
        const missed = Math.random() < 0.05;
        const isValid = !missed && Math.random() < 0.85;
        const lateMin = !missed && Math.random() < 0.1 ? rand(5, 45) : 0;
        const actualStart = missed ? null : new Date(start.getTime() + lateMin * 60000);
        const actualEnd = missed ? null : new Date(end.getTime() + rand(-15, 30) * 60000);

        const shift = await prisma.shift.create({
          data: {
            tenantId: tid, driverId: driver.id, date, platform: "KEETA",
            zone: driver.zone, scheduledStart: start, scheduledEnd: end,
            actualStart, actualEnd,
            status: missed ? "MISSED" : "COMPLETED",
            isValid,
            plannedHoursMinutes: (block[1] - block[0]) * 60,
            actualHoursMinutes: actualEnd ? Math.round((actualEnd.getTime() - actualStart!.getTime()) / 60000) : null,
          },
        });

        // Attendance - only for first shift of the day (unique constraint on tenantId+driverId+date)
        if (s === 0) {
          const attStatus: AttendanceStatus = missed ? "ABSENT" : lateMin > 0 ? "LATE" : "PRESENT";
          await prisma.attendanceRecord.create({
            data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: attStatus, lateMinutes: lateMin, source: "system" },
          });
        }

        // Orders (Keeta)
        if (!missed) {
          await prisma.orderLog.create({
            data: {
              tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
              platform: "KEETA", orderCount: rand(12, 25),
              distanceKm: decimal(80, 150), source: "MANUAL",
            },
          });
        }
      }
    }

    // Talabat shifts
    for (let driverIdx = 0; driverIdx < talabatDrivers.length; driverIdx++) {
      const driver = talabatDrivers[driverIdx];

      // Today: ~3 drivers get no shift (NOT_BOOKED) - deterministic via index
      if (isToday && driverIdx % 7 === 0) continue;
      // Future: all get BOOKED shifts
      // Past: existing COMPLETED/MISSED logic

      const startHour = rand(8, 16);
      const duration = rand(8, 13);
      const endHour = startHour + duration;
      const start = new Date(date); start.setHours(startHour);
      const end = new Date(date); end.setHours(endHour);

      // Determine status based on day type and time
      let shiftStatus: ShiftStatus;
      let sessStatus: TalabatSessionStatus;
      let missed = false;
      let lateMin = 0;

      if (isFuture) {
        shiftStatus = "BOOKED";
        sessStatus = "PLANNED";
      } else if (isToday) {
        if (endHour <= nowHour) {
          // Shift already ended
          if (Math.random() < 0.08) {
            missed = true; shiftStatus = "MISSED"; sessStatus = "NO_SHOW";
          } else {
            shiftStatus = "COMPLETED"; sessStatus = "COMPLETED";
            lateMin = Math.random() < 0.15 ? rand(3, 25) : 0;
          }
        } else if (startHour <= nowHour) {
          // Shift in progress
          shiftStatus = "IN_PROGRESS"; sessStatus = "ACTIVE";
          lateMin = Math.random() < 0.1 ? rand(3, 15) : 0;
        } else {
          // Shift hasn't started yet
          shiftStatus = "BOOKED"; sessStatus = "PLANNED";
        }
      } else {
        // Past days - existing logic
        missed = Math.random() < 0.05;
        lateMin = !missed && Math.random() < 0.1 ? rand(5, 30) : 0;
        shiftStatus = missed ? "MISSED" : "COMPLETED";
        sessStatus = missed ? "NO_SHOW" : "COMPLETED";
      }

      const isCompleted = shiftStatus === "COMPLETED";
      const isInProgress = shiftStatus === "IN_PROGRESS";
      const isBooked = shiftStatus === "BOOKED";
      const hasStarted = isCompleted || isInProgress;

      const actualStartTime = hasStarted ? new Date(start.getTime() + lateMin * 60000) : null;
      const actualEndTime = isCompleted ? new Date(end.getTime() + rand(-30, 30) * 60000) : null;
      const actualMins = actualStartTime && actualEndTime ? Math.round((actualEndTime.getTime() - actualStartTime.getTime()) / 60000) : null;

      const shift = await prisma.shift.create({
        data: {
          tenantId: tid, driverId: driver.id, date, platform: "TALABAT",
          zone: driver.zone, scheduledStart: start, scheduledEnd: end,
          actualStart: actualStartTime,
          actualEnd: actualEndTime,
          status: shiftStatus,
          plannedHoursMinutes: duration * 60,
          actualHoursMinutes: actualMins,
        },
      });

      // Attendance - only if shift has started or was missed
      if (hasStarted || missed) {
        const attStatus: AttendanceStatus = missed ? "ABSENT" : lateMin > 0 ? "LATE" : "PRESENT";
        await prisma.attendanceRecord.create({
          data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: attStatus, lateMinutes: lateMin, source: "system" },
        });
      }

      // Orders & cash - only for completed or in-progress shifts
      if (isCompleted || isInProgress) {
        const numOrders = isInProgress
          ? Math.max(1, Math.round(rand(15, 25) * Math.max(0.1, (nowHour - startHour) / duration)))
          : rand(15, 25);
        const shiftStartHour = startHour;
        let totalCash = 0;
        const orderBatch: any[] = [];

        for (let oi = 0; oi < numOrders; oi++) {
          const isCash = Math.random() < 0.4;
          const orderCash = isCash ? decimal(0.5, 5) : 0;
          totalCash += orderCash;
          const finishHour = shiftStartHour + Math.floor((oi / numOrders) * (isInProgress ? (nowHour - startHour) : duration));
          const finishMin = rand(0, 59);
          const finishTime = new Date(date);
          finishTime.setHours(finishHour, finishMin, 0, 0);

          orderBatch.push({
            tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
            platform: "TALABAT" as Platform, orderCount: 1,
            orderNumber: `${3538000000 + rand(0, 999999)}`,
            paymentSource: isCash ? "CASH" : "KNET",
            arrivalTime: finishTime,
            cashCollected: isCash ? orderCash : null,
            distanceKm: decimal(1, 8),
            tips: Math.random() < 0.15 ? decimal(0.1, 1) : null,
            source: "WHATSAPP" as OrderSource,
          });
        }
        await prisma.orderLog.createMany({ data: orderBatch });

        const cash = totalCash || decimal(30, 60);

        // Cash record
        if (isCompleted) {
          const deposited = Math.random() < 0.8;
          await prisma.cashRecord.create({
            data: {
              tenantId: tid, driverId: driver.id, date,
              salesAmount: cash, collectionAmount: deposited ? cash : 0,
              depositMethod: deposited ? pick(["CASH", "BANK_TRANSFER", "AL_MUZAINI"]) as DepositMethod : null,
              pendingDues: deposited ? 0 : cash,
              status: deposited ? "SETTLED" : "PENDING",
            },
          });
        } else {
          // In progress - pending cash
          await prisma.cashRecord.create({
            data: {
              tenantId: tid, driverId: driver.id, date,
              salesAmount: cash, collectionAmount: 0,
              pendingDues: cash, status: "PENDING",
            },
          });
        }
      }

      // TalabatSession(s)
      const numSessions = isBooked || isFuture ? 1 : Math.random() < 0.3 ? 2 : 1;
      const vt = driver.vehicleType as VehicleType;
      const sessionZone = driver.zone || "Sabah";
      const code = `${sessionZone}_${vt.toLowerCase()}`;

      for (let si = 0; si < numSessions; si++) {
        const sessStart = new Date(date);
        const sessEnd = new Date(date);
        if (numSessions === 1) {
          sessStart.setHours(startHour);
          sessEnd.setHours(endHour);
        } else {
          sessStart.setHours(si === 0 ? startHour : startHour + Math.ceil(duration / 2) + 1);
          sessEnd.setHours(si === 0 ? startHour + Math.ceil(duration / 2) : endHour);
        }
        const sessPlannedHrs = (sessEnd.getTime() - sessStart.getTime()) / 3600000;
        const faceOk = isBooked ? false : Math.random() < 0.9;
        const equipOk = isBooked ? false : Math.random() < 0.95;
        const gps = isBooked ? null : rand(70, 100);
        const approvedHrs = hasStarted ? sessPlannedHrs - decimal(0, 0.5) : null;
        const actualHrs = isCompleted ? sessPlannedHrs + decimal(-1, 0.5) : null;
        const sessDeliveries = isCompleted ? rand(6, 14) : isInProgress ? Math.max(1, rand(2, 8)) : 0;
        const sessCash = (isCompleted || isInProgress) ? decimal(15, 35) : 0;
        const sessTips = (isCompleted || isInProgress) ? decimal(0, 1.5) : 0;
        const sessDist = (isCompleted || isInProgress) ? decimal(30, 80) : null;

        const session = await prisma.talabatSession.create({
          data: {
            tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
            zone: sessionZone, vehicleType: vt, sessionCode: code,
            plannedStart: sessStart, plannedEnd: sessEnd,
            approvedStart: hasStarted ? new Date(sessStart.getTime() + rand(0, 10) * 60000) : null,
            approvedEnd: isCompleted ? new Date(sessEnd.getTime() + rand(-15, 5) * 60000) : null,
            actualStart: hasStarted ? new Date(sessStart.getTime() + lateMin * 60000) : null,
            actualEnd: isCompleted ? new Date(sessEnd.getTime() + rand(-30, 15) * 60000) : null,
            plannedHours: sessPlannedHrs,
            approvedHours: approvedHrs,
            actualHours: actualHrs,
            deliveries: sessDeliveries,
            cashCollected: sessCash,
            tips: sessTips,
            distanceKm: sessDist,
            status: sessStatus,
            faceVerified: isBooked ? false : faceOk,
            equipmentVerified: isBooked ? false : equipOk,
            gpsCompliance: gps,
          },
        });

        // Individual deliveries - only for completed/in-progress
        if ((isCompleted || isInProgress) && sessDeliveries > 0) {
          const orderTypes = ["food", "food", "food", "grocery", "express"];
          const baseOrderId = 3530000000 + rand(0, 9999999);
          const deliveryBatch: any[] = [];
          for (let di = 0; di < sessDeliveries; di++) {
            const deliveryOrderId = String(baseOrderId + di);
            const shortCode = `#${rand(1000, 9999)}`;
            const minutesIntoSession = Math.round((di / sessDeliveries) * sessPlannedHrs * 60);
            const finishTime = new Date(sessStart.getTime() + (minutesIntoSession + rand(10, 40)) * 60000);
            deliveryBatch.push({
              tenantId: tid,
              driverId: driver.id,
              sessionId: session.id,
              date,
              platformOrderId: deliveryOrderId,
              shortCode,
              finishedAt: finishTime,
              orderType: pick(orderTypes),
              amount: decimal(0.5, 3.0),
              tip: Math.random() < 0.3 ? decimal(0.05, 0.5) : 0,
              distanceKm: decimal(1.5, 8.0),
              status: Math.random() < 0.97 ? "COMPLETED" : "CANCELLED",
            });
          }
          await prisma.talabatDelivery.createMany({ data: deliveryBatch });
        }

        // Compliance events - only for started/missed sessions
        if (!isBooked && !faceOk) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "SELFIE_FAIL",
              description: `Selfie verification failed - ${pick(["Helmet covering face", "Mask detected", "Sunglasses on", "Image too dark"])}`,
              metadata: { reason: pick(["HELMET", "MASK", "SUNGLASSES", "LOW_QUALITY"]) },
            },
          });
        }
        if (!isBooked && !equipOk) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "EQUIPMENT_MISSING",
              description: `Equipment photo check failed - ${pick(["Delivery bag not visible", "Phone holder missing", "Vehicle photo unclear"])}`,
            },
          });
        }
        if (!isBooked && gps && gps < 80 && Math.random() < 0.4) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "GPS_OFF",
              description: `GPS turned off for ${rand(5, 45)} minutes during shift`,
              metadata: { offDurationMinutes: rand(5, 45) },
            },
          });
        }
        if (missed) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "SHIFT_NOT_BOOKED",
              description: "Driver did not show up for scheduled session",
            },
          });
        }
        // Out of zone ~15% of completed/active sessions
        if ((isCompleted || isInProgress) && Math.random() < 0.15) {
          const assignedZone = pick(["AHMADI", "HAWALLY", "SALMIYA", "FARWANIYA"]);
          const detectedZone = pick(["JAHRA", "MANGAF", "FINTAS", "KHAITAN"].filter(z => z !== assignedZone));
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "OUT_OF_ZONE",
              description: `Assigned: ${assignedZone} → Detected: ${detectedZone}`,
              metadata: { assignedZone, detectedZone },
            },
          });
        }
        // Late clock in ~10% of started sessions
        if (!isBooked && !missed && Math.random() < 0.1) {
          const lateMinutes = rand(2, 25);
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "LATE_CLOCK_IN",
              description: `Driver clocked in ${lateMinutes} minutes late`,
              metadata: { lateMinutes },
            },
          });
        }
        // Cash threshold exceeded ~8% of completed sessions
        if (isCompleted && (Number(session.cashCollected) > 100 || Math.random() < 0.08)) {
          const cashAmt = Number(session.cashCollected) > 100 ? Number(session.cashCollected) : rand(101, 250);
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "CASH_THRESHOLD_EXCEEDED",
              description: `Cash collected reached KD ${cashAmt.toFixed(3)} - exceeds 100 KD threshold`,
              metadata: { cashCollected: cashAmt, threshold: 100 },
            },
          });
        }
      }
    }

    // Deliveroo shifts - skip future days
    if (!isFuture)
    for (const driver of deliverooDrivers) {
      const start = new Date(date); start.setHours(rand(6, 10));
      const end = new Date(date); end.setHours(start.getHours() + rand(10, 14));
      const missed = Math.random() < 0.05;

      const shift = await prisma.shift.create({
        data: {
          tenantId: tid, driverId: driver.id, date, platform: "DELIVEROO",
          zone: "Hawally", scheduledStart: start, scheduledEnd: end,
          actualStart: missed ? null : start,
          actualEnd: missed ? null : end,
          status: missed ? "MISSED" : "COMPLETED",
        },
      });

      await prisma.attendanceRecord.create({
        data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: missed ? "ABSENT" : "PRESENT", source: "system" },
      });

      if (!missed) {
        const cash = decimal(5, 20);
        await prisma.orderLog.create({
          data: {
            tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
            platform: "DELIVEROO", orderCount: rand(15, 25),
            cashCollected: cash, tips: decimal(0, 1), source: "MANUAL",
          },
        });
      }
    }

    // Americana shifts - skip future days
    if (!isFuture)
    for (const driver of americanaDrivers) {
      if (Math.random() < 0.14) continue; // ~1 day off per week
      const start = new Date(date); start.setHours(10);
      const end = new Date(date); end.setHours(22);

      const shift = await prisma.shift.create({
        data: {
          tenantId: tid, driverId: driver.id, date, platform: "AMERICANA",
          zone: driver.zone, scheduledStart: start, scheduledEnd: end,
          actualStart: start, actualEnd: end, status: "COMPLETED",
        },
      });

      await prisma.attendanceRecord.create({
        data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: "PRESENT", source: "system" },
      });

      await prisma.orderLog.create({
        data: {
          tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
          platform: "AMERICANA", orderCount: rand(15, 35),
          totalAmount: decimal(50, 120), source: "MANUAL",
        },
      });
    }
  }

  console.log("Created 33 days of shifts, attendance, orders (30 past + today + 3 future)");

  // 7b. Document expiry data for Talabat drivers
  const DOC_EXPIRY_FIELDS = [
    "healthCertExpiry", "workPermitExpiry", "foodHandlingCertExpiry",
    "vehicleRegExpiry", "vehicleInsuranceExpiry", "drivingLicenseExpiry", "civilIdExpiry",
  ] as const;
  const DOC_STATUS_MAP = [
    "healthCertStatus", "workPermitStatus", "foodHandlingCertStatus",
    "vehicleRegStatus", "vehicleInsuranceStatus", "drivingLicenseStatus", "civilIdStatus",
  ] as const;

  for (const driver of talabatDrivers) {
    const docUpdate: any = {};
    for (let di = 0; di < DOC_EXPIRY_FIELDS.length; di++) {
      const roll = Math.random();
      if (roll < 0.55) {
        const expiry = new Date(today);
        expiry.setMonth(expiry.getMonth() + rand(1, 8));
        docUpdate[DOC_EXPIRY_FIELDS[di]] = expiry;
        docUpdate[DOC_STATUS_MAP[di]] = "VALID";
      } else if (roll < 0.75) {
        const expiry = new Date(today);
        expiry.setDate(expiry.getDate() + rand(1, 30));
        docUpdate[DOC_EXPIRY_FIELDS[di]] = expiry;
        docUpdate[DOC_STATUS_MAP[di]] = "EXPIRING";
      } else if (roll < 0.88) {
        const expiry = new Date(today);
        expiry.setDate(expiry.getDate() - rand(1, 60));
        docUpdate[DOC_EXPIRY_FIELDS[di]] = expiry;
        docUpdate[DOC_STATUS_MAP[di]] = "EXPIRED";
      } else {
        docUpdate[DOC_STATUS_MAP[di]] = "MISSING";
      }
    }
    await prisma.driver.update({ where: { id: driver.id }, data: docUpdate });
  }
  console.log("Created document expiry data for Talabat drivers");

  // 8. Pending Dues Ledger (March 2026 for Talabat)
  for (const driver of talabatDrivers) {
    const dailySales: Record<string, number> = {};
    const dailyCollections: Record<string, number> = {};
    let totalSales = 0, totalCollections = 0;
    for (let d = 1; d <= 22; d++) {
      const key = String(d).padStart(2, "0");
      const sale = decimal(25, 60);
      const collected = Math.random() < 0.8 ? sale : 0;
      dailySales[key] = sale;
      dailyCollections[key] = collected;
      totalSales += sale;
      totalCollections += collected;
    }
    const opening = decimal(0, 30);
    await prisma.pendingDuesLedger.create({
      data: {
        tenantId: tid, driverId: driver.id,
        month: new Date(2026, 2, 1),
        openingBalance: opening, totalSales, totalCollection: totalCollections,
        cashDeposits: totalCollections * 0.6, bankTransfers: totalCollections * 0.3,
        incentives: decimal(5, 20), adjustments: decimal(-10, 10),
        closingBalance: opening + totalSales - totalCollections,
        dailySales, dailyCollections, status: "OPEN",
      },
    });
  }

  // 8b. Pending Dues Ledger (April 2026 - current month for Talabat)
  for (const driver of talabatDrivers) {
    const dailySales2: Record<string, number> = {};
    const dailyCollections2: Record<string, number> = {};
    let totalSales2 = 0, totalCollections2 = 0;
    const currentDay = Math.min(today.getDate(), 30);
    for (let d = 1; d <= currentDay; d++) {
      const key = String(d).padStart(2, "0");
      const sale = decimal(25, 65);
      const collected = Math.random() < 0.75 ? sale : Math.random() < 0.4 ? decimal(10, sale) : 0;
      dailySales2[key] = sale;
      dailyCollections2[key] = collected;
      totalSales2 += sale;
      totalCollections2 += collected;
    }
    const opening2 = decimal(5, 40);
    await prisma.pendingDuesLedger.create({
      data: {
        tenantId: tid, driverId: driver.id,
        month: new Date(2026, 3, 1), // April 2026
        openingBalance: opening2, totalSales: totalSales2, totalCollection: totalCollections2,
        cashDeposits: totalCollections2 * 0.55, bankTransfers: totalCollections2 * 0.35,
        incentives: decimal(3, 15), adjustments: decimal(-8, 8),
        closingBalance: opening2 + totalSales2 - totalCollections2,
        dailySales: dailySales2, dailyCollections: dailyCollections2, status: "OPEN",
      },
    });
  }
  console.log("Created April 2026 pending dues ledger");

  // 9. AI Scores (14 days)
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    for (const driver of allDrivers) {
      const att = rand(50, 100), del = rand(40, 100), fin = rand(50, 100), eq = rand(60, 100), plat = rand(50, 100);
      const composite = Math.round(att * 0.25 + del * 0.30 + fin * 0.20 + eq * 0.10 + plat * 0.15);
      await prisma.aiScore.create({
        data: {
          tenantId: tid, driverId: driver.id, date,
          compositeScore: composite, attendanceScore: att, deliveryScore: del,
          financialScore: fin, equipmentScore: eq, platformScore: plat,
          trend: Math.random() < 0.6 ? "STABLE" : Math.random() < 0.625 ? "UP" : "DOWN",
        },
      });
    }
  }

  // 10. Alerts (40)
  const alertTypes = [
    { type: "shift_not_booked", severity: "HIGH" as AlertSeverity, title: "Shift Not Booked" },
    { type: "gps_off", severity: "MEDIUM" as AlertSeverity, title: "GPS Turned Off" },
    { type: "cash_overdue", severity: "HIGH" as AlertSeverity, title: "Cash Deposit Overdue" },
    { type: "low_performance", severity: "MEDIUM" as AlertSeverity, title: "Low Performance Score" },
    { type: "inspection_due", severity: "LOW" as AlertSeverity, title: "Vehicle Inspection Due" },
    { type: "face_verification_failed", severity: "MEDIUM" as AlertSeverity, title: "Face Verification Failed" },
    { type: "agent_offline", severity: "HIGH" as AlertSeverity, title: "Agent Offline" },
    { type: "maintenance_needed", severity: "CRITICAL" as AlertSeverity, title: "Urgent Maintenance Required" },
  ];
  for (let i = 0; i < 40; i++) {
    const alertType = pick(alertTypes);
    const driver = pick(allDrivers);
    const daysAgo = rand(0, 6);
    await prisma.alert.create({
      data: {
        tenantId: tid, type: alertType.type, severity: alertType.severity,
        title: alertType.title,
        message: `${alertType.title} for driver ${driver.name}`,
        driverId: driver.id,
        status: Math.random() < 0.6 ? "ACTIVE" : Math.random() < 0.75 ? "ACKNOWLEDGED" : "RESOLVED",
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
  }

  // 11. Recruitment Pipeline (8 candidates)
  const recruitStages: RecruitmentStage[] = [
    "AGENCY_REFERRAL", "CV_DOCS", "VISA_PROCESSING", "FLIGHT_ARRANGEMENT",
    "MEDICAL_EXAM", "PLATFORM_TRAINING", "ROAD_SAFETY_TRAINING", "COMPLETED",
  ];
  const recruitNames = ["Rajan Patel", "Ajay Thakur", "Faizan Shah", "Bilal Ahmed", "Sohail Rana", "Nawaz Sharif", "Tahir Mehmood", "Kamran Akmal"];
  for (let i = 0; i < 8; i++) {
    await prisma.recruitmentPipeline.create({
      data: {
        tenantId: tid, candidateName: recruitNames[i],
        phone: `+965${rand(50000000, 99999999)}`, stage: recruitStages[i],
        agency: i < 3 ? pick(["Gulf Manpower", "Al Sayer Recruitment", "KGL Logistics"]) : null,
        expectedDate: new Date(2026, rand(3, 6), rand(1, 28)),
        assignedCompanyId: pick([sidra.id, wahoo.id, alHazm.id]),
      },
    });
  }

  // 12. Leave Requests (15)
  const leaveStatuses: { status: LeaveStatus; count: number }[] = [
    { status: "APPROVED", count: 5 }, { status: "PENDING", count: 4 },
    { status: "REJECTED", count: 3 }, { status: "APPROVED", count: 3 },
  ];
  for (const { status, count } of leaveStatuses) {
    for (let i = 0; i < count; i++) {
      const driver = pick(allDrivers);
      const startDate = new Date(2026, 2, rand(1, 28));
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + rand(1, 5));
      await prisma.leaveRequest.create({
        data: {
          tenantId: tid, driverId: driver.id,
          type: pick(["SICK", "VACATION", "EMERGENCY", "PERSONAL"]) as LeaveType,
          startDate, endDate, reason: pick(["Medical appointment", "Family emergency", "Personal matters", "Annual leave", "Feeling unwell"]),
          status,
          reviewedById: status !== "PENDING" ? users[1].id : null,
          reviewedAt: status !== "PENDING" ? new Date() : null,
          reviewNotes: status === "REJECTED" ? "Insufficient notice period" : null,
        },
      });
    }
  }

  // 13. Tickets (25)
  const ticketTitles = [
    "Motorcycle brake issue", "Request for new delivery bag", "GPS not working on device",
    "AC not working in car", "Helmet replacement needed", "Phone screen cracked",
    "Request time off for Eid", "Fuel card not working", "Complaint about zone assignment",
    "Vehicle tire puncture", "Cooling vest request", "App crashing frequently",
    "Petrol card balance low", "SIM card not working", "Request transfer to Salmiya zone",
    "Vehicle registration expired", "Insurance renewal needed", "Battery draining fast",
    "Request for safety kit", "Shift schedule conflict", "Missing salary deduction",
    "Vehicle inspection failed", "New phone request", "Route optimization suggestion", "Night shift lighting issue",
  ];
  for (let i = 0; i < 25; i++) {
    const driver = pick(allDrivers);
    const category = pick(["VEHICLE_REPAIR", "EQUIPMENT_REQUEST", "LEAVE_REQUEST", "COMPLAINT", "OTHER"]) as TicketCategory;
    const priority = pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"]) as TicketPriority;
    const slaHours: Record<string, number> = { URGENT: 4, HIGH: 12, MEDIUM: 48, LOW: 168 };
    const createdAt = new Date(Date.now() - rand(0, 13) * 86400000);
    const slaDeadline = new Date(createdAt.getTime() + slaHours[priority] * 3600000);
    const statuses: TicketStatus[] = ["OPEN", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    await prisma.ticket.create({
      data: {
        tenantId: tid, ticketNumber: `TK-${String(i + 1).padStart(4, "0")}`,
        category, priority, title: ticketTitles[i],
        description: `${ticketTitles[i]} - reported by driver ${driver.name}`,
        submitterType: "DRIVER", submitterDriverId: driver.id, driverId: driver.id,
        status: pick(statuses),
        assignedToId: Math.random() < 0.7 ? pick(users.slice(1, 4)).id : null,
        slaDeadline, platform: driver.platform as Platform, createdAt,
      },
    });
  }

  // 14. AI Digests (3 days)
  for (let d = 2; d >= 0; d--) {
    const date = new Date(today); date.setDate(date.getDate() - d);
    await prisma.aiDigest.create({
      data: {
        tenantId: tid, date,
        content: {
          summary: `Fleet operated at ${rand(85, 95)}% capacity. ${rand(70, 78)} drivers active across all platforms.`,
          alerts: [
            `${rand(2, 5)} drivers have pending cash deposits exceeding KD 50`,
            `${rand(1, 3)} vehicles due for inspection this week`,
            `${rand(2, 4)} devices showing outdated agent version`,
          ],
          recommendations: [
            "Follow up with Talabat drivers on pending cash deposits",
            "Schedule vehicle inspections for flagged motorcycles",
            "Push agent update to outdated devices",
          ],
        },
        generatedAt: new Date(date.getTime() + 7 * 3600000),
      },
    });
  }

  // 14b. KeetaDailyMetrics - 30 days for each Keeta driver
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);
    for (const driver of keetaDrivers) {
      const onShift = Math.random() < 0.92;
      const validDay = onShift && Math.random() < 0.85;
      const onlineMin = onShift ? rand(180, 480) : 0;
      const delivered = onShift ? rand(8, 25) : 0;
      const accepted = delivered + rand(0, 3);
      const onTime = delivered > 0 ? decimal(0.7, 1.0, 4) : null;
      await prisma.keetaDailyMetrics.create({
        data: {
          tenantId: tid, driverId: driver.id, date,
          courierPlatformId: driver.platformDriverId,
          supervisorName: "Sidra Operations",
          vehicleType: driver.vehicleType === "MOTORCYCLE" ? "Motorcycle" : "Private Car",
          onShift, validDay,
          onlineTime: onlineMin,
          validOnlineTime: onShift ? Math.max(0, onlineMin - rand(0, 20)) : 0,
          peakOnlineMinutes: onShift ? rand(60, 180) : 0,
          acceptedTasks: accepted,
          restaurantArrivals: onShift ? Math.min(accepted, accepted - rand(0, 2)) : 0,
          deliveredTasks: delivered,
          largeOrdersCompleted: onShift ? rand(0, 3) : 0,
          cancelledTasks: onShift ? rand(0, 2) : 0,
          rejectedTasks: onShift ? rand(0, 3) : 0,
          rejectedByCourier: onShift ? rand(0, 1) : 0,
          rejectedAuto: onShift ? rand(0, 2) : 0,
          cancellationRate: onShift ? decimal(0, 0.1, 4) : null,
          completionRate: delivered > 0 ? decimal(0.85, 1.0, 4) : null,
          onTimeRate: onTime,
          largeOrderOnTimeRate: delivered > 0 ? decimal(0.6, 1.0, 4) : null,
          avgDeliveryMinutes: delivered > 0 ? decimal(20, 45, 2) : null,
          over55minProportion: delivered > 0 ? decimal(0, 0.15, 4) : null,
          overdueOrders: onShift ? rand(0, 2) : 0,
          severelyOverdue: onShift ? rand(0, 1) : 0,
          source: "EXCEL_IMPORT",
        },
      });
    }
  }
  console.log("Created Keeta daily metrics (30 days x 35 drivers)");

  // 14c. AmericanaDailyOrders - current month for each Americana driver
  const amStores = ["KFC Audiliya", "KFC Salwa", "Hardees Salmiya"];
  for (const driver of americanaDrivers) {
    const dailyOrders: Record<string, number> = {};
    let total = 0;
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= Math.min(today.getDate(), daysInMonth); d++) {
      const key = String(d).padStart(2, "0");
      const isOff = Math.random() < 0.14;
      const orders = isOff ? 0 : rand(12, 35);
      dailyOrders[key] = orders;
      total += orders;
    }
    await prisma.americanaDailyOrders.create({
      data: {
        tenantId: tid, driverId: driver.id,
        month: new Date(today.getFullYear(), today.getMonth(), 1),
        chain: "12",
        empId: driver.platformDriverId,
        storeName: driver.zone || pick(amStores),
        costCenter: String(rand(12700, 12800)),
        company: "Al Hazm Express",
        position: driver.vehicleType === "CAR" ? "Car" : "Bike",
        dailyOrders,
        totalOrders: total,
        source: "EXCEL_IMPORT",
      },
    });
  }
  console.log("Created Americana daily orders");

  // 15. Driver Inventory - equip every driver with realistic items
  const inventoryItems: { type: any; hasQty: boolean }[] = [
    { type: "HELMET", hasQty: false },
    { type: "TSHIRT", hasQty: true },
    { type: "PANTS", hasQty: true },
    { type: "COOLING_VEST", hasQty: false },
    { type: "SAFETY_VEST", hasQty: false },
    { type: "BIG_BAG", hasQty: false },
    { type: "SMALL_BAG", hasQty: false },
    { type: "GLOVES", hasQty: true },
    { type: "CAP", hasQty: false },
    { type: "MOBILE_PHONE", hasQty: false },
    { type: "SIM_CARD", hasQty: false },
    { type: "PETROL_CARD", hasQty: false },
    { type: "WATER_BOTTLE", hasQty: true },
    { type: "SAFETY_KIT", hasQty: false },
  ];
  for (const driver of allDrivers) {
    const itemCount = rand(6, 12); // each driver gets 6-12 items
    const shuffled = [...inventoryItems].sort(() => Math.random() - 0.5).slice(0, itemCount);
    for (const item of shuffled) {
      const issued = Math.random() < 0.9;
      await prisma.driverInventory.create({
        data: {
          driverId: driver.id,
          itemType: item.type,
          issued,
          quantity: item.hasQty ? rand(1, 3) : 1,
          issuedDate: issued ? new Date(2025, rand(6, 11), rand(1, 28)) : null,
        },
      });
    }
  }
  console.log("Created driver inventory");

  // 16. Vehicle Inspections - last 2 inspections per vehicle
  const vehicleList = await prisma.vehicle.findMany({ where: { tenantId: tid }, select: { id: true, assignedDriverId: true } });
  for (const v of vehicleList) {
    for (let i = 0; i < 2; i++) {
      const daysAgo = i === 0 ? rand(1, 14) : rand(15, 45);
      const passed = Math.random() < 0.8;
      await prisma.vehicleInspection.create({
        data: {
          tenantId: tid, vehicleId: v.id,
          driverId: v.assignedDriverId || allDrivers[0].id,
          date: new Date(Date.now() - daysAgo * 86400000),
          status: passed ? "PASS" : "FAIL",
          notes: passed ? "All checks passed" : pick(["Brake pads worn", "Tire tread low", "Missing side mirror", "Light not working", "Chain loose"]),
          deductionApplied: !passed && Math.random() < 0.5,
          photos: { front: `/uploads/inspection_${v.id}_front.jpg`, back: `/uploads/inspection_${v.id}_back.jpg` },
        },
      });
    }
  }
  console.log("Created vehicle inspections");

  // 17. Maintenance Records - 20 records
  const maintenanceTypes = [
    "Oil Change", "Brake Pad Replacement", "Tire Replacement", "Chain & Sprocket",
    "Battery Replacement", "Engine Tune-up", "Clutch Repair", "Light Replacement",
    "Mirror Replacement", "Seat Repair", "Fuel Filter", "Air Filter",
  ];
  const maintenanceVendors = ["Al Sayer Workshop", "Kuwait Motorcare", "Fastlane Garage", "Quick Fix Auto", "Champion Motors"];
  for (let i = 0; i < 20; i++) {
    const v = pick(vehicleList);
    const daysAgo = rand(0, 30);
    const status: MaintenanceStatus = pick(["REQUESTED", "APPROVED", "IN_PROGRESS", "COMPLETED", "COMPLETED", "COMPLETED"]);
    await prisma.maintenanceRecord.create({
      data: {
        tenantId: tid, vehicleId: v.id,
        driverId: v.assignedDriverId || null,
        category: pick(["SCHEDULED", "UNSCHEDULED", "EMERGENCY"]) as MaintenanceCategory,
        type: pick(maintenanceTypes),
        cost: decimal(15, 120),
        vendor: pick(maintenanceVendors),
        status,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
  }
  console.log("Created maintenance records");

  // 18. Make some drivers inactive/suspended for realism
  const driversToSuspend = talabatDrivers.slice(0, 2);
  const driversToInactivate = keetaDrivers.slice(0, 3);
  const driversToLeave = talabatDrivers.slice(2, 4);
  const driversToTermination = talabatDrivers.slice(4, 6);
  for (const d of driversToSuspend) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "SUSPENDED" } });
  }
  for (const d of driversToInactivate) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "INACTIVE" } });
  }
  for (const d of driversToLeave) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "LEAVE" } });
  }
  for (const d of driversToTermination) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "TERMINATION" } });
  }
  console.log("Updated some driver statuses");

  // 19. More recruitment candidates to fill the pipeline
  const moreRecruitNames = [
    "Asif Iqbal", "Bashir Ahmad", "Daniyal Hussain", "Ehsanullah Khan",
    "Farooq Aziz", "Ghulam Mustafa", "Habibur Rahman", "Ibrahim Yousuf",
    "Junaid Saeed", "Khaleel Shaukat", "Liaquat Ali", "Mushtaq Ahmed",
  ];
  const allStages: RecruitmentStage[] = [
    "AGENCY_REFERRAL", "AGENCY_REFERRAL", "CV_DOCS", "CV_DOCS",
    "INTERVIEW", "VISA_PROCESSING", "FLIGHT_ARRANGEMENT", "ARRIVAL",
    "MEDICAL_EXAM", "BANK_CARD", "CIVIL_ID", "LICENSE_TEST",
  ];
  for (let i = 0; i < 12; i++) {
    await prisma.recruitmentPipeline.create({
      data: {
        tenantId: tid, candidateName: moreRecruitNames[i],
        phone: `+965${rand(50000000, 99999999)}`, stage: allStages[i],
        agency: pick(["Gulf Manpower", "Al Sayer Recruitment", "KGL Logistics", "Hala Recruitment", "Wafra Manpower"]),
        expectedDate: new Date(2026, rand(3, 7), rand(1, 28)),
        assignedCompanyId: pick([sidra.id, wahoo.id, alHazm.id, alHazmExp.id]),
        notes: pick(["Fast-track candidate", "Experienced rider - 3 years", "Referred by existing driver", "Agency premium candidate", null]),
      },
    });
  }
  console.log("Created more recruitment candidates");

  // 20. More tickets to fill the system
  const moreTicketTitles = [
    "Water bottle holder broken", "Phone charger not working", "Uniform too small - need replacement",
    "Request zone change to Salmiya", "Petrol card declined at station", "SIM card data limit reached",
    "App shows wrong shift schedule", "Cannot clock in - selfie rejected", "Delivery bag zipper stuck",
    "Lost ID badge - need replacement", "Vehicle odometer not working", "Accident report - minor fender bender",
    "Request early leave for medical", "Phone overheating during shift", "Request motorcycle upgrade to car",
  ];
  for (let i = 0; i < 15; i++) {
    const driver = pick(allDrivers);
    const category = pick(["VEHICLE_REPAIR", "EQUIPMENT_REQUEST", "LEAVE_REQUEST", "COMPLAINT", "OTHER"]) as TicketCategory;
    const priority = pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"]) as TicketPriority;
    const slaHours2: Record<string, number> = { URGENT: 4, HIGH: 12, MEDIUM: 48, LOW: 168 };
    const createdAt2 = new Date(Date.now() - rand(0, 7) * 86400000);
    const slaDeadline2 = new Date(createdAt2.getTime() + slaHours2[priority] * 3600000);
    await prisma.ticket.create({
      data: {
        tenantId: tid, ticketNumber: `TK-${String(26 + i).padStart(4, "0")}`,
        category, priority, title: moreTicketTitles[i],
        description: `${moreTicketTitles[i]} - reported by driver ${driver.name}`,
        submitterType: "DRIVER", submitterDriverId: driver.id, driverId: driver.id,
        status: pick(["OPEN", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]) as TicketStatus,
        assignedToId: Math.random() < 0.7 ? pick(users.slice(1, 4)).id : null,
        slaDeadline: slaDeadline2, platform: driver.platform as Platform, createdAt: createdAt2,
      },
    });
  }
  console.log("Created more tickets");

  // 21. More AI Digests with richer content (7 days)
  for (let d = 6; d >= 3; d--) {
    const date2 = new Date(today); date2.setDate(date2.getDate() - d);
    try {
      await prisma.aiDigest.create({
        data: {
          tenantId: tid, date: date2,
          content: {
            summary: `Fleet operated at ${rand(82, 96)}% capacity with ${rand(68, 78)} active drivers. Talabat delivered ${rand(400, 550)} orders, Keeta ${rand(350, 500)}, Americana ${rand(100, 200)}. Total cash collected: KD ${decimal(2000, 4000, 0)}.`,
            alerts: [
              `${rand(2, 6)} Talabat drivers have pending cash > KD 50 - oldest overdue ${rand(2, 5)} days`,
              `${rand(1, 4)} vehicles failed inspection this week - brake and tire issues`,
              `${rand(2, 5)} devices running agent version 0.9.8 - push update needed`,
              `${rand(1, 3)} drivers missed Tuesday shift booking window`,
              `${rand(0, 2)} drivers flagged for GPS zone mismatch during shift`,
            ],
            recommendations: [
              "Prioritize cash collection from drivers with >KD 50 pending dues",
              "Schedule tire replacement for motorcycles KW-" + rand(10000, 99999),
              "Consider moving underperforming Talabat drivers to Keeta shifts",
              "Review zone assignments for flagged drivers",
            ],
          },
          generatedAt: new Date(date2.getTime() + 7 * 3600000),
        },
      });
    } catch { /* skip duplicates */ }
  }
  console.log("Created more AI digests");

  // ─── Notification Rules (violation type → role mapping) ───
  const notificationRules = [
    // CRITICAL violations → ADMIN + OPS_MANAGER
    { eventType: "CASH_THRESHOLD_EXCEEDED", role: UserRole.ADMIN },
    { eventType: "CASH_THRESHOLD_EXCEEDED", role: UserRole.OPS_MANAGER },
    { eventType: "CASH_THRESHOLD_EXCEEDED", role: UserRole.ACCOUNTANT },
    // HIGH violations → ADMIN + OPS_MANAGER + SUPERVISOR
    { eventType: "GPS_OFF", role: UserRole.ADMIN },
    { eventType: "GPS_OFF", role: UserRole.OPS_MANAGER },
    { eventType: "GPS_OFF", role: UserRole.SUPERVISOR },
    { eventType: "OUT_OF_ZONE", role: UserRole.ADMIN },
    { eventType: "OUT_OF_ZONE", role: UserRole.OPS_MANAGER },
    { eventType: "OUT_OF_ZONE", role: UserRole.SUPERVISOR },
    { eventType: "ZONE_MISMATCH", role: UserRole.ADMIN },
    { eventType: "ZONE_MISMATCH", role: UserRole.OPS_MANAGER },
    { eventType: "SELFIE_FAIL", role: UserRole.ADMIN },
    { eventType: "SELFIE_FAIL", role: UserRole.OPS_MANAGER },
    { eventType: "SELFIE_FAIL", role: UserRole.SUPERVISOR },
    { eventType: "SHIFT_NOT_BOOKED", role: UserRole.ADMIN },
    { eventType: "SHIFT_NOT_BOOKED", role: UserRole.OPS_MANAGER },
    { eventType: "SHIFT_NOT_BOOKED", role: UserRole.SUPERVISOR },
    // MEDIUM violations → OPS_MANAGER + SUPERVISOR
    { eventType: "LATE_CLOCK_IN", role: UserRole.OPS_MANAGER },
    { eventType: "LATE_CLOCK_IN", role: UserRole.SUPERVISOR },
    { eventType: "EARLY_CLOCK_OUT", role: UserRole.OPS_MANAGER },
    { eventType: "EARLY_CLOCK_OUT", role: UserRole.SUPERVISOR },
    { eventType: "EQUIPMENT_MISSING", role: UserRole.OPS_MANAGER },
    { eventType: "EQUIPMENT_MISSING", role: UserRole.SUPERVISOR },
    { eventType: "ORDER_CLICK_THROUGH", role: UserRole.OPS_MANAGER },
    { eventType: "ORDER_CLICK_THROUGH", role: UserRole.SUPERVISOR },
    // Alert-based events → ADMIN + relevant roles
    { eventType: "cash_overdue", role: UserRole.ADMIN },
    { eventType: "cash_overdue", role: UserRole.ACCOUNTANT },
    { eventType: "cash_overdue", role: UserRole.OPS_MANAGER },
    { eventType: "shift_not_booked", role: UserRole.ADMIN },
    { eventType: "shift_not_booked", role: UserRole.OPS_MANAGER },
  ];

  for (const rule of notificationRules) {
    await prisma.notificationRule.upsert({
      where: {
        tenantId_eventType_role: {
          tenantId: tenant.id,
          eventType: rule.eventType,
          role: rule.role,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        eventType: rule.eventType,
        role: rule.role,
        enabled: true,
      },
    });
  }
  console.log(`Created ${notificationRules.length} notification rules`);

  // ─── 22. KPI Definitions ──────────────────────────────────────────────────────
  const kpiDefs = [
    { name: "On-Time Attendance", description: "Percentage of shifts where driver clocked in on time", category: "ATTENDANCE" as const, unit: "PERCENTAGE" as const, platform: null, target: 95, sortOrder: 1 },
    { name: "Daily Orders", description: "Number of orders completed per day", category: "ORDERS" as const, unit: "COUNT" as const, platform: null, target: 15, sortOrder: 2 },
    { name: "Delivery Efficiency", description: "Average delivery time in minutes", category: "DELIVERY_EFFICIENCY" as const, unit: "MINUTES" as const, platform: null, target: 30, sortOrder: 3 },
    { name: "GPS Compliance", description: "Percentage of time GPS was active during shift", category: "COMPLIANCE" as const, unit: "PERCENTAGE" as const, platform: "TALABAT" as const, target: 98, sortOrder: 10 },
    { name: "Face Verification Rate", description: "Percentage of sessions with successful face verification", category: "COMPLIANCE" as const, unit: "PERCENTAGE" as const, platform: "TALABAT" as const, target: 100, sortOrder: 11 },
    { name: "Cash Collection Rate", description: "Percentage of cash collected vs sales amount", category: "FINANCIAL" as const, unit: "PERCENTAGE" as const, platform: "TALABAT" as const, target: 100, sortOrder: 12 },
    { name: "Zone Compliance", description: "Percentage of deliveries within assigned zone", category: "COMPLIANCE" as const, unit: "PERCENTAGE" as const, platform: "TALABAT" as const, target: 95, sortOrder: 13 },
    { name: "Completion Rate", description: "Percentage of accepted tasks completed", category: "ORDERS" as const, unit: "PERCENTAGE" as const, platform: "KEETA" as const, target: 95, sortOrder: 20 },
    { name: "On-Time Delivery Rate", description: "Percentage of deliveries on time", category: "DELIVERY_EFFICIENCY" as const, unit: "PERCENTAGE" as const, platform: "KEETA" as const, target: 90, sortOrder: 21 },
    { name: "Online Hours", description: "Hours online per day", category: "ATTENDANCE" as const, unit: "HOURS" as const, platform: "KEETA" as const, target: 8, sortOrder: 22 },
    { name: "Rejection Rate", description: "Percentage of tasks rejected (lower is better)", category: "ORDERS" as const, unit: "PERCENTAGE" as const, platform: "KEETA" as const, target: 5, sortOrder: 23 },
    { name: "Order Accuracy", description: "Percentage of orders delivered without issues", category: "ORDERS" as const, unit: "PERCENTAGE" as const, platform: "DELIVEROO" as const, target: 98, sortOrder: 30 },
    { name: "Orders Per Shift", description: "Average orders per shift", category: "ORDERS" as const, unit: "COUNT" as const, platform: "AMERICANA" as const, target: 20, sortOrder: 40 },
  ];

  const createdDefs: any[] = [];
  for (const def of kpiDefs) {
    const created = await prisma.kpiDefinition.create({
      data: { ...def, tenantId: tid, target: def.target },
    });
    createdDefs.push(created);
  }
  console.log(`Created ${createdDefs.length} KPI definitions`);

  // ─── 23. KPI Records (7 days for all drivers) ────────────────────────────────
  let kpiRecordCount = 0;
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    for (const driver of allDrivers) {
      for (const def of createdDefs) {
        // Skip platform-specific KPIs for wrong platform
        if (def.platform && def.platform !== driver.platform) continue;

        let value: number;
        const target = Number(def.target);

        switch (def.name) {
          case "On-Time Attendance":
            value = Math.random() < 0.85 ? 100 : rand(60, 95);
            break;
          case "Daily Orders":
            value = driver.platform === "AMERICANA" ? rand(12, 35) : driver.platform === "KEETA" ? rand(10, 25) : rand(14, 28);
            break;
          case "Delivery Efficiency":
            value = decimal(18, 42, 1);
            break;
          case "GPS Compliance":
            value = decimal(85, 100, 1);
            break;
          case "Face Verification Rate":
            value = Math.random() < 0.9 ? 100 : rand(0, 100);
            break;
          case "Cash Collection Rate":
            value = decimal(80, 100, 1);
            break;
          case "Zone Compliance":
            value = decimal(82, 100, 1);
            break;
          case "Completion Rate":
            value = decimal(85, 100, 2);
            break;
          case "On-Time Delivery Rate":
            value = decimal(75, 98, 1);
            break;
          case "Online Hours":
            value = decimal(4, 10, 1);
            break;
          case "Rejection Rate":
            value = decimal(0, 12, 1);
            break;
          case "Order Accuracy":
            value = decimal(92, 100, 1);
            break;
          case "Orders Per Shift":
            value = rand(12, 35);
            break;
          default:
            continue;
        }

        const isLowerBetter = def.name === "Delivery Efficiency" || def.name === "Rejection Rate";
        const rawScore = isLowerBetter
          ? (target / Math.max(value, 0.5)) * 100
          : (value / target) * 100;
        const score = Math.min(999.99, Math.round(rawScore * 100) / 100);

        try {
          await prisma.kpiRecord.upsert({
            where: { tenantId_driverId_kpiDefinitionId_date: { tenantId: tid, driverId: driver.id, kpiDefinitionId: def.id, date } },
            create: { tenantId: tid, driverId: driver.id, kpiDefinitionId: def.id, date, value, target, score, source: "COMPUTED" },
            update: {},
          });
          kpiRecordCount++;
        } catch (e: any) {
          if (kpiRecordCount === 0) console.error(`KPI record error: tid=${tid}, driverId=${driver.id}, defId=${def.id}`, e.message);
        }
      }
    }
  }
  console.log(`Created ${kpiRecordCount} KPI records`);

  // ─── 24. Company Inventory ────────────────────────────────────────────────────
  const inventoryItemTypes = [
    "HELMET", "TSHIRT", "PANTS", "COOLING_VEST", "SAFETY_VEST",
    "BIG_BAG", "SMALL_BAG", "GLOVES", "CAP", "MOBILE_PHONE",
    "SIM_CARD", "PETROL_CARD", "WATER_BOTTLE", "SAFETY_KIT",
  ];
  for (const comp of companies) {
    const driverCount = allDrivers.filter(d => d.companyId === comp.id).length;
    for (const itemType of inventoryItemTypes) {
      const total = driverCount + rand(2, 8);
      const issued = Math.min(driverCount - rand(0, 3), total);
      await prisma.companyInventory.upsert({
        where: { companyId_itemType: { companyId: comp.id, itemType: itemType as any } },
        create: {
          tenantId: tid, companyId: comp.id, itemType: itemType as any,
          total, issued: Math.max(0, issued), available: total - Math.max(0, issued),
          minStock: Math.max(2, Math.floor(driverCount * 0.2)),
        },
        update: {},
      });
    }
  }
  console.log("Created company inventory");

  // ─── 25. Platform Settings (persisted records) ────────────────────────────────
  const platformConfigs: { platform: any; targets: any; kpis: any; shiftRules: any; zones: any }[] = [
    {
      platform: "TALABAT",
      targets: {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 18, unit: "orders", description: "Target number of orders per shift" },
        subTargets: [
          { name: "Batch Number", key: "batchNumber", value: 1, unit: "batch", description: "Target batch number (1 = best, 7 = worst)" },
          { name: "Daily Hours", key: "dailyHours", value: 12, unit: "hours", description: "Expected hours per shift" },
          { name: "UTR", key: "utr", value: 100, unit: "%", description: "Utilization rate target" },
        ],
      },
      kpis: {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Below Average", minPercent: 30, maxPercent: 49, color: "#f97316" },
          { label: "Failed", minPercent: 0, maxPercent: 29, color: "#ef4444" },
        ],
        weights: { ordersPerDay: 40, batchNumber: 30, attendance: 20, compliance: 10 },
        thresholds: { ordersExcellent: 18, ordersGood: 12, ordersMinimum: 8, batchBest: 1, batchWorst: 7 },
      },
      shiftRules: { defaultHoursPerShift: 12, maxLateMinutes: 1, earlyClockOutMinutes: 15, maxCashHoldKD: 50 },
      zones: ["Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem"],
    },
    {
      platform: "KEETA",
      targets: {
        mainTarget: { name: "Daily Hours", key: "dailyHours", value: 10, unit: "hours", description: "Target online hours per day" },
        subTargets: [
          { name: "On-time Login", key: "onTimeLogin", value: 100, unit: "%", description: "Login at scheduled time" },
          { name: "Number of Orders", key: "ordersPerDay", value: 15, unit: "orders", description: "Target deliveries per day" },
          { name: "Delivery On Time", key: "deliveryOnTime", value: 95, unit: "%", description: "On-time delivery rate" },
          { name: "Completion Rate", key: "completionRate", value: 98, unit: "%", description: "Order completion rate" },
        ],
      },
      kpis: {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Below Average", minPercent: 30, maxPercent: 49, color: "#f97316" },
          { label: "Failed", minPercent: 0, maxPercent: 29, color: "#ef4444" },
        ],
        weights: { dailyHours: 30, onTimeLogin: 25, ordersPerDay: 20, deliveryOnTime: 15, completionRate: 10 },
      },
      shiftRules: { defaultHoursPerShift: 10, maxLateMinutes: 1, earlyClockOutMinutes: 15, maxCashHoldKD: 50 },
      zones: ["Hawally", "Salmiya", "Ardiya", "Jahra", "Khiran", "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf"],
    },
    {
      platform: "DELIVEROO",
      targets: {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 15, unit: "orders", description: "Target orders per day" },
        subTargets: [
          { name: "Daily Hours", key: "dailyHours", value: 10, unit: "hours", description: "Target online hours" },
        ],
      },
      kpis: {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Failed", minPercent: 0, maxPercent: 49, color: "#ef4444" },
        ],
        weights: { ordersPerDay: 50, attendance: 30, compliance: 20 },
      },
      shiftRules: { defaultHoursPerShift: 10, maxLateMinutes: 1, earlyClockOutMinutes: 15, maxCashHoldKD: 50 },
      zones: ["Hawally"],
    },
    {
      platform: "AMERICANA",
      targets: {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 20, unit: "orders", description: "Target orders per day" },
        subTargets: [
          { name: "Arrive on Time", key: "arriveOnTime", value: 100, unit: "%", description: "Arrive to store on time" },
        ],
      },
      kpis: {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Failed", minPercent: 0, maxPercent: 49, color: "#ef4444" },
        ],
        weights: { ordersPerDay: 50, attendance: 30, compliance: 20 },
      },
      shiftRules: { defaultHoursPerShift: 12, maxLateMinutes: 1, earlyClockOutMinutes: 15, maxCashHoldKD: 50 },
      zones: ["KFC Audiliya", "KFC Salwa", "Hardees Salmiya"],
    },
  ];

  for (const cfg of platformConfigs) {
    await prisma.platformSettings.upsert({
      where: { tenantId_platform: { tenantId: tid, platform: cfg.platform } },
      create: { tenantId: tid, platform: cfg.platform, targets: cfg.targets, kpis: cfg.kpis, shiftRules: cfg.shiftRules, zones: cfg.zones },
      update: {},
    });
  }
  console.log("Created platform settings");

  // ─── 26. Notifications (for admin and ops users) ──────────────────────────────
  const notifTemplates = [
    { title: "Cash Threshold Exceeded", type: "CASH_THRESHOLD_EXCEEDED", severity: "HIGH", message: (d: string) => `Driver ${d} exceeded KD 100 cash threshold` },
    { title: "GPS Off Detected", type: "GPS_OFF", severity: "MEDIUM", message: (d: string) => `GPS turned off for driver ${d} during shift` },
    { title: "Selfie Verification Failed", type: "SELFIE_FAIL", severity: "MEDIUM", message: (d: string) => `Driver ${d} failed selfie verification` },
    { title: "Shift Not Booked", type: "SHIFT_NOT_BOOKED", severity: "HIGH", message: (d: string) => `Driver ${d} has no shift booked for tomorrow` },
    { title: "Out of Zone", type: "OUT_OF_ZONE", severity: "MEDIUM", message: (d: string) => `Driver ${d} detected outside assigned zone` },
    { title: "Late Clock-In", type: "LATE_CLOCK_IN", severity: "LOW", message: (d: string) => `Driver ${d} clocked in ${rand(2, 15)} minutes late` },
    { title: "Equipment Missing", type: "EQUIPMENT_MISSING", severity: "MEDIUM", message: (d: string) => `Driver ${d} missing required equipment` },
    { title: "Cash Deposit Overdue", type: "cash_overdue", severity: "HIGH", message: (d: string) => `Cash deposit for driver ${d} overdue by ${rand(1, 3)} days` },
  ];

  const notifUsers = [users[0], users[1], users[2]]; // admin, ops_manager, supervisor
  for (const user of notifUsers) {
    const count = user.role === "ADMIN" ? 15 : user.role === "OPS_MANAGER" ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const tmpl = pick(notifTemplates);
      const driver = pick(allDrivers);
      const hoursAgo = rand(0, 72);
      await prisma.notification.create({
        data: {
          tenantId: tid, userId: user.id,
          title: tmpl.title, message: tmpl.message(driver.name),
          type: tmpl.type, severity: tmpl.severity,
          sourceId: driver.id,
          read: hoursAgo > 24 ? Math.random() < 0.7 : Math.random() < 0.2,
          readAt: hoursAgo > 48 ? new Date(Date.now() - (hoursAgo - rand(1, 12)) * 3600000) : null,
          createdAt: new Date(Date.now() - hoursAgo * 3600000),
        },
      });
    }
  }
  console.log("Created notifications");

  // ─── 27. Cash Transactions (individual transactions for last 7 days) ──────────
  let cashTxCount = 0;
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    for (const driver of talabatDrivers.slice(0, 15)) {
      const numOrders = rand(8, 18);
      let runningBalance = decimal(5, 30);
      const txBatch: any[] = [];

      for (let oi = 0; oi < numOrders; oi++) {
        const isCash = Math.random() < 0.4;
        if (isCash) {
          const amount = decimal(0.5, 4.5);
          runningBalance += amount;
          txBatch.push({
            tenantId: tid, driverId: driver.id,
            date, type: "COLLECTION" as const,
            amount, orderNumber: `${3538000000 + rand(0, 999999)}`,
            description: "Cash order collection",
            runningBalance: Math.round(runningBalance * 1000) / 1000,
          });
        }
      }
      // Cash deposit
      if (Math.random() < 0.7 && runningBalance > 10) {
        const depositAmt = Math.round(runningBalance * decimal(0.6, 1.0) * 1000) / 1000;
        runningBalance -= depositAmt;
        txBatch.push({
          tenantId: tid, driverId: driver.id,
          date, type: "CASH_OUT" as const,
          amount: depositAmt, description: pick(["Cash deposit at office", "Bank transfer", "Al Muzaini deposit"]),
          runningBalance: Math.round(runningBalance * 1000) / 1000,
        });
      }
      if (txBatch.length > 0) {
        await prisma.cashTransaction.createMany({ data: txBatch });
        cashTxCount += txBatch.length;
      }
    }
  }
  console.log(`Created ${cashTxCount} cash transactions`);

  // ─── 28. Location Logs (for map trails - last 2 hours for online drivers) ─────
  const onlineDrivers = allDrivers.slice(0, 20);
  let locCount = 0;
  for (const driver of onlineDrivers) {
    const base = pick(KUWAIT_COORDS);
    for (let minAgo = 120; minAgo >= 0; minAgo -= rand(3, 8)) {
      const device = await prisma.device.findFirst({ where: { driverId: driver.id } });
      if (!device) continue;
      await prisma.locationLog.create({
        data: {
          deviceId: device.id, driverId: driver.id,
          latitude: base.lat + decimal(-0.01, 0.01) + (minAgo * 0.00001),
          longitude: base.lng + decimal(-0.01, 0.01) + (minAgo * 0.00001),
          accuracy: decimal(3, 15, 1),
          speed: decimal(0, 45, 1),
          capturedAt: new Date(Date.now() - minAgo * 60000),
        },
      });
      locCount++;
    }
  }
  console.log(`Created ${locCount} location logs`);

  console.log("\nSeed complete!");
  console.log("Login: osama@fleet.kw / demo123");
  console.log(`Total: ${allDrivers.length} drivers, 30 days of data`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
