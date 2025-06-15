import { z } from "zod";

export const MonitorSchema = z.object({
  id: z.string(),
  cityName: z.string(),
  countryCode: z.string().nullable(),
  dataCount: z.number(),
  createdAt: z.date(),
  lastChecked: z.date().nullable(),
  isPublic: z.boolean(),
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
