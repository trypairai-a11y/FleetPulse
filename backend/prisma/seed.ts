import { PrismaClient, Platform, UserRole, DriverStatus, VehicleType, VehicleStatus, ShiftStatus, AttendanceStatus, OrderSource, CashStatus, DepositMethod, DeviceStatus, AlertSeverity, AlertStatus, ScoreTrend, TicketCategory, TicketPriority, TicketStatus, SubmitterType, LeaveType, LeaveStatus, RecruitmentStage, LedgerStatus, InspectionStatus, MaintenanceCategory, MaintenanceStatus, TalabatSessionStatus, ComplianceEventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AmericanaDailyOrders", "KeetaDailyMetrics", "TalabatComplianceEvent", "TalabatSession", "AuditLog", "AiDigest", "Alert", "AiScore", "DeviceCommand", "AppUsageLog", "LocationLog", "CapturedOrder", "Device", "VehicleInspection", "MaintenanceRecord", "PendingDuesLedger", "CashRecord", "OrderLog", "AttendanceRecord", "Shift", "DriverInventory", "LeaveRequest", "Ticket", "RecruitmentPipeline", "Vehicle", "Driver", "User", "Company", "Tenant" CASCADE`);

  // 1. Tenant
  const tenant = await prisma.tenant.create({
    data: { name: "Osama Fleet Management", subscriptionPlan: "ENTERPRISE" },
  });
  const tid = tenant.id;

  // 2. Companies
  const sidra = await prisma.company.create({ data: { tenantId: tid, name: "Sidra", platform: "KEETA", licenseCount: 4 } });
  const wahoo = await prisma.company.create({ data: { tenantId: tid, name: "Wahoo International", platform: "TALABAT" } });
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
        tenantId: tid, companyId: sidra.id, name: SOUTH_ASIAN_NAMES[nameIdx++],
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
    const name = SOUTH_ASIAN_NAMES[nameIdx++];
    const batch = `${rand(1, 4)}${pick(["A", "B"])}`;
    const d = await prisma.driver.create({
      data: {
        tenantId: tid, companyId: wahoo.id,
        name: `${name.toUpperCase()} ${batch} - WAHI`,
        phone: `+965${rand(50000000, 99999999)}`, platform: "TALABAT",
        platformDriverId: `TB${rand(100000, 999999)}`, utr: `UTR${rand(100000, 999999)}`, vehicleType: Math.random() < 0.7 ? "MOTORCYCLE" : "CAR",
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
        tenantId: tid, companyId: alHazm.id, name: SOUTH_ASIAN_NAMES[nameIdx++],
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
        tenantId: tid, companyId: alHazmExp.id, name: SOUTH_ASIAN_NAMES[nameIdx++],
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
  const companies = [sidra, wahoo, alHazm, alHazmExp];
  for (let i = 0; i < 60; i++) {
    const comp = companies[Math.min(Math.floor(i / 18), 3)];
    const vt: VehicleType = i < 42 ? "MOTORCYCLE" : "CAR";
    const driver = i < allDrivers.length ? allDrivers[i] : null;
    vehicleData.push({
      tenantId: tid, companyId: comp.id,
      plateNumber: `KW-${rand(10000, 99999)}`,
      vehicleType: vt,
      make: vt === "MOTORCYCLE" ? pick(["Honda", "Yamaha", "Suzuki"]) : pick(["Toyota", "Nissan", "Hyundai"]),
      model: vt === "MOTORCYCLE" ? pick(["PCX 150", "NMAX", "Gixxer"]) : pick(["Yaris", "Sunny", "Accent"]),
      year: rand(2021, 2025), mileage: rand(5000, 50000),
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

  // 7. Shifts, Attendance, Orders (30 days)
  const today = new Date();
  const keetaDrivers = allDrivers.filter(d => d.platform === "KEETA");
  const talabatDrivers = allDrivers.filter(d => d.platform === "TALABAT");
  const deliverooDrivers = allDrivers.filter(d => d.platform === "DELIVEROO");
  const americanaDrivers = allDrivers.filter(d => d.platform === "AMERICANA");

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    // Keeta shifts (4-hour blocks)
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

        // Attendance
        const attStatus: AttendanceStatus = missed ? "ABSENT" : lateMin > 0 ? "LATE" : "PRESENT";
        await prisma.attendanceRecord.create({
          data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: attStatus, lateMinutes: lateMin, source: "system" },
        });

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
    for (const driver of talabatDrivers) {
      const startHour = rand(8, 16);
      const duration = rand(8, 13);
      const start = new Date(date); start.setHours(startHour);
      const end = new Date(date); end.setHours(startHour + duration);
      const missed = Math.random() < 0.05;
      const lateMin = !missed && Math.random() < 0.1 ? rand(5, 30) : 0;

      const shift = await prisma.shift.create({
        data: {
          tenantId: tid, driverId: driver.id, date, platform: "TALABAT",
          zone: driver.zone, scheduledStart: start, scheduledEnd: end,
          actualStart: missed ? null : new Date(start.getTime() + lateMin * 60000),
          actualEnd: missed ? null : new Date(end.getTime() + rand(-30, 30) * 60000),
          status: missed ? "MISSED" : "COMPLETED",
          plannedHoursMinutes: duration * 60,
        },
      });

      const attStatus: AttendanceStatus = missed ? "ABSENT" : lateMin > 0 ? "LATE" : "PRESENT";
      await prisma.attendanceRecord.create({
        data: { tenantId: tid, driverId: driver.id, shiftId: shift.id, date, status: attStatus, lateMinutes: lateMin, source: "system" },
      });

      if (!missed) {
        const cash = decimal(30, 60);
        await prisma.orderLog.create({
          data: {
            tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
            platform: "TALABAT", orderCount: rand(15, 25),
            distanceKm: decimal(80, 150), cashCollected: cash, tips: decimal(0, 2), source: "MANUAL",
          },
        });

        // Cash record
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
      }

      // TalabatSession(s) — 1 or 2 sessions per day
      const numSessions = Math.random() < 0.3 ? 2 : 1;
      const vt = driver.vehicleType as VehicleType;
      const sessionZone = driver.zone || "Sabah";
      const code = `${sessionZone}_${vt.toLowerCase()}`;

      for (let si = 0; si < numSessions; si++) {
        const sessStart = new Date(date);
        const sessEnd = new Date(date);
        if (numSessions === 1) {
          sessStart.setHours(startHour);
          sessEnd.setHours(startHour + duration);
        } else {
          sessStart.setHours(si === 0 ? startHour : startHour + Math.ceil(duration / 2) + 1);
          sessEnd.setHours(si === 0 ? startHour + Math.ceil(duration / 2) : startHour + duration);
        }
        const sessPlannedHrs = (sessEnd.getTime() - sessStart.getTime()) / 3600000;
        const faceOk = Math.random() < 0.9;
        const equipOk = Math.random() < 0.95;
        const gps = rand(70, 100);
        const approvedHrs = missed ? null : sessPlannedHrs - decimal(0, 0.5);
        const actualHrs = missed ? null : sessPlannedHrs + decimal(-1, 0.5);
        const sessDeliveries = missed ? 0 : rand(6, 14);
        const sessCash = missed ? 0 : decimal(15, 35);
        const sessTips = missed ? 0 : decimal(0, 1.5);
        const sessDist = missed ? null : decimal(30, 80);

        const session = await prisma.talabatSession.create({
          data: {
            tenantId: tid, driverId: driver.id, shiftId: shift.id, date,
            zone: sessionZone, vehicleType: vt, sessionCode: code,
            plannedStart: sessStart, plannedEnd: sessEnd,
            approvedStart: missed ? null : new Date(sessStart.getTime() + rand(0, 10) * 60000),
            approvedEnd: missed ? null : new Date(sessEnd.getTime() + rand(-15, 5) * 60000),
            actualStart: missed ? null : new Date(sessStart.getTime() + lateMin * 60000),
            actualEnd: missed ? null : new Date(sessEnd.getTime() + rand(-30, 15) * 60000),
            plannedHours: sessPlannedHrs,
            approvedHours: approvedHrs,
            actualHours: actualHrs,
            deliveries: sessDeliveries,
            cashCollected: sessCash,
            tips: sessTips,
            distanceKm: sessDist,
            status: missed ? "NO_SHOW" : "COMPLETED",
            faceVerified: faceOk,
            equipmentVerified: equipOk,
            gpsCompliance: gps,
          },
        });

        // Compliance events for ~10% of sessions
        if (!faceOk) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "SELFIE_FAIL", severity: "MEDIUM",
              description: `Selfie verification failed — ${pick(["Helmet covering face", "Mask detected", "Sunglasses on", "Image too dark"])}`,
              metadata: { reason: pick(["HELMET", "MASK", "SUNGLASSES", "LOW_QUALITY"]) },
            },
          });
        }
        if (!equipOk) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "EQUIPMENT_MISSING", severity: "MEDIUM",
              description: `Equipment photo check failed — ${pick(["Delivery bag not visible", "Phone holder missing", "Vehicle photo unclear"])}`,
            },
          });
        }
        if (gps < 80 && Math.random() < 0.4) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "GPS_OFF", severity: "HIGH",
              description: `GPS turned off for ${rand(5, 45)} minutes during shift`,
              metadata: { offDurationMinutes: rand(5, 45) },
            },
          });
        }
        if (missed) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId: tid, driverId: driver.id, sessionId: session.id,
              type: "SHIFT_NOT_BOOKED", severity: "HIGH",
              description: "Driver did not show up for scheduled session",
            },
          });
        }
      }
    }

    // Deliveroo shifts
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

    // Americana shifts
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

  console.log("Created 30 days of shifts, attendance, orders");

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
        description: `${ticketTitles[i]} — reported by driver ${driver.name}`,
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
            `${rand(2, 5)} drivers have pending cash deposits exceeding KWD 50`,
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

  // 14b. KeetaDailyMetrics — 30 days for each Keeta driver
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

  // 14c. AmericanaDailyOrders — current month for each Americana driver
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

  // 15. Driver Inventory — equip every driver with realistic items
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

  // 16. Vehicle Inspections — last 2 inspections per vehicle
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

  // 17. Maintenance Records — 20 records
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
  for (const d of driversToSuspend) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "SUSPENDED" } });
  }
  for (const d of driversToInactivate) {
    await prisma.driver.update({ where: { id: d.id }, data: { status: "INACTIVE" } });
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
        notes: pick(["Fast-track candidate", "Experienced rider — 3 years", "Referred by existing driver", "Agency premium candidate", null]),
      },
    });
  }
  console.log("Created more recruitment candidates");

  // 20. More tickets to fill the system
  const moreTicketTitles = [
    "Water bottle holder broken", "Phone charger not working", "Uniform too small — need replacement",
    "Request zone change to Salmiya", "Petrol card declined at station", "SIM card data limit reached",
    "App shows wrong shift schedule", "Cannot clock in — selfie rejected", "Delivery bag zipper stuck",
    "Lost ID badge — need replacement", "Vehicle odometer not working", "Accident report — minor fender bender",
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
        description: `${moreTicketTitles[i]} — reported by driver ${driver.name}`,
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
            summary: `Fleet operated at ${rand(82, 96)}% capacity with ${rand(68, 78)} active drivers. Talabat delivered ${rand(400, 550)} orders, Keeta ${rand(350, 500)}, Americana ${rand(100, 200)}. Total cash collected: KWD ${decimal(2000, 4000, 0)}.`,
            alerts: [
              `${rand(2, 6)} Talabat drivers have pending cash > KWD 50 — oldest overdue ${rand(2, 5)} days`,
              `${rand(1, 4)} vehicles failed inspection this week — brake and tire issues`,
              `${rand(2, 5)} devices running agent version 0.9.8 — push update needed`,
              `${rand(1, 3)} drivers missed Tuesday shift booking window`,
              `${rand(0, 2)} drivers flagged for GPS zone mismatch during shift`,
            ],
            recommendations: [
              "Prioritize cash collection from drivers with >KWD 50 pending dues",
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

  console.log("\nSeed complete!");
  console.log("Login: osama@fleet.kw / demo123");
  console.log(`Total: ${allDrivers.length} drivers, 30 days of data`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
