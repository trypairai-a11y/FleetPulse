import { z } from "zod/v4";

export const driverCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  name_ar: z.string().optional(),
  phone: z.string().min(8, "Phone is required"),
  email: z.email().optional().or(z.literal("")),
  employee_id: z.string().optional(),
  platform: z.string().optional(),
  nationality: z.string().optional(),
  hire_date: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  license_group: z.string().optional(),
  notes: z.string().optional(),
});

export const driverUpdateSchema = driverCreateSchema.partial();

export type DriverCreateForm = z.infer<typeof driverCreateSchema>;
export type DriverUpdateForm = z.infer<typeof driverUpdateSchema>;
