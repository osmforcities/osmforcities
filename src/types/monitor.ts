import { z } from "zod";
import { MonitorSchema } from "../schemas/monitor";

export type Monitor = z.infer<typeof MonitorSchema>;
