import { z } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware factory: validates req.body against a Zod schema.
 * Returns 400 with validation errors if the body is invalid.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const createDriverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Phone number required"),
  platform: z.enum(["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"]),
  companyId: z.string().min(1, "Company is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED", "LEAVE", "RESTRICTED", "RESTRICTED_PERMANENTLY"]).optional().default("ACTIVE"),
  zone: z.string().optional(),
  batchNumber: z.string().optional(),
  vehicleType: z.enum(["MOTORCYCLE", "CAR"]).optional(),
  nationality: z.string().optional(),
  supervisorId: z.string().optional(),
  platformDriverId: z.string().optional(),
  civilId: z.string().optional(),
  salary: z.number().positive().optional(),
  joinDate: z.string().optional(),
  healthCertExpiry: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  foodHandlingCertExpiry: z.string().optional(),
  vehicleRegExpiry: z.string().optional(),
  vehicleInsuranceExpiry: z.string().optional(),
  drivingLicenseExpiry: z.string().optional(),
  civilIdExpiry: z.string().optional(),
});

export const createShiftSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  platform: z.enum(["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"]),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  zone: z.string().optional(),
  plannedHoursMinutes: z.number().int().min(0).max(1440).optional(),
  vehicleType: z.enum(["MOTORCYCLE", "CAR"]).optional(),
});

export const createLeaveRequestSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid start date"),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid end date"),
  type: z.enum(["PERSONAL", "SICK", "EMERGENCY", "ANNUAL"]),
  reason: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

export const createKpiRecordSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  kpiDefinitionId: z.string().min(1, "KPI definition is required"),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  value: z.number(),
  target: z.number().positive().optional(),
  source: z.enum(["MANUAL", "COMPUTED", "SCREENSHOT_OCR"]).optional(),
});

export const createCashRecordSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  salesAmount: z.number().min(0),
  cashCollected: z.number().min(0).optional(),
  pendingDues: z.number().min(0).optional(),
  status: z.enum(["PENDING", "PARTIALLY_PAID", "SETTLED"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const createTalabatSessionSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  zone: z.string().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  plannedHoursMinutes: z.number().int().min(0).max(1440).optional(),
});

export const createOrderSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  platform: z.enum(["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"]),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  orderCount: z.number().int().min(0),
  cashCollected: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  tips: z.number().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
  zone: z.string().optional(),
  source: z.enum(["MANUAL", "SCREENSHOT_OCR", "EXCEL_IMPORT", "AGENT_CAPTURE", "WHATSAPP"]).optional(),
});
