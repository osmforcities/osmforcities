import { z } from "zod";
import { OSMElementSchema } from "./osm";

export const OverpassResponseSchema = z
  .object({
    elements: z.array(OSMElementSchema),
    remark: z.string().optional(),
    generator: z.string().optional(),
    version: z.union([z.string(), z.number()]).optional(),
    osm3s: z
      .object({
        timestamp_osm_base: z.string().optional(),
        copyright: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export const OverpassErrorSchema = z.object({
  remark: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type OverpassResponse = z.infer<typeof OverpassResponseSchema>;
export type OverpassError = z.infer<typeof OverpassErrorSchema>;

export interface OverpassData {
  elements: z.infer<typeof OSMElementSchema>[];
}
