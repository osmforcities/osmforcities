import { z } from "zod";

export const CreateMonitorSchema = z.object({
  templateId: z.string(),
  osmRelationId: z.number(),
  isPublic: z.boolean().optional(),
});

export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>;
