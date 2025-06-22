import { z } from "zod";
import {
  MonitorSchema,
  WatchMonitorSchema,
  UnwatchMonitorSchema,
} from "@/schemas/monitor";

const ApiResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  details: z.string().optional(),
});

const MonitorsResponseSchema = z.array(MonitorSchema);

const MonitorResponseSchema = MonitorSchema;

const WatchResponseSchema = z.object({
  success: z.boolean(),
  watch: z.object({
    id: z.string(),
    userId: z.string(),
    monitorId: z.string(),
    createdAt: z.coerce.date(),
  }),
});

const RefreshResponseSchema = z.object({
  success: z.boolean(),
  dataCount: z.number().optional(),
  lastChecked: z.coerce.date().optional(),
});

const UpdateMonitorSchema = z.object({
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

const UpdateMonitorResponseSchema = ApiResponseSchema;

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type MonitorResponse = z.infer<typeof MonitorResponseSchema>;
export type MonitorsResponse = z.infer<typeof MonitorsResponseSchema>;
export type WatchResponse = z.infer<typeof WatchResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorSchema>;
export type UpdateMonitorResponse = z.infer<typeof UpdateMonitorResponseSchema>;

export {
  ApiResponseSchema,
  MonitorResponseSchema,
  MonitorsResponseSchema,
  WatchResponseSchema,
  RefreshResponseSchema,
  UpdateMonitorSchema,
  UpdateMonitorResponseSchema,
  WatchMonitorSchema,
  UnwatchMonitorSchema,
};
