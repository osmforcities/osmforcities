import { z } from "zod";

export const MonitorSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  countryCode: z.string().nullable(),
  cityBounds: z.string().nullable(),
  dataCount: z.number(),
  createdAt: z.date(),
  lastChecked: z.date().nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  template: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().nullable(),
  }),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
  }),
});

export const MonitorListSchema = z.array(MonitorSchema);

export const CreateMonitorSchema = z.object({
  templateId: z.string(),
  cityName: z.string().min(1),
  cityBounds: z.string().optional(),
  countryCode: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type Monitor = z.infer<typeof MonitorSchema>;
export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>;
