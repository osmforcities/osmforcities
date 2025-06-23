import { z } from "zod";

// OSM Element Schemas
export const OSMNodeSchema = z.object({
  type: z.literal("node"),
  id: z.number(),
  lat: z.number(),
  lon: z.number(),
  tags: z.record(z.string(), z.string()).optional(),
  timestamp: z.string().optional(),
  version: z.number().optional(),
  changeset: z.number().optional(),
  user: z.string().optional(),
  uid: z.number().optional(),
});

export const OSMWaySchema = z.object({
  type: z.literal("way"),
  id: z.number(),
  nodes: z.array(z.number()),
  geometry: z
    .array(
      z.object({
        lat: z.number(),
        lon: z.number(),
      })
    )
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
  timestamp: z.string().optional(),
  version: z.number().optional(),
  changeset: z.number().optional(),
  user: z.string().optional(),
  uid: z.number().optional(),
});

export const OSMRelationSchema = z.object({
  type: z.literal("relation"),
  id: z.number(),
  members: z
    .array(
      z.object({
        type: z.enum(["node", "way", "relation"]),
        ref: z.number(),
        role: z.string(),
      })
    )
    .optional(),
  geometry: z
    .array(
      z.array(
        z.object({
          lat: z.number(),
          lon: z.number(),
        })
      )
    )
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
  bounds: z
    .object({
      minlat: z.number(),
      minlon: z.number(),
      maxlat: z.number(),
      maxlon: z.number(),
    })
    .optional(),
  timestamp: z.string().optional(),
  version: z.number().optional(),
  changeset: z.number().optional(),
  user: z.string().optional(),
  uid: z.number().optional(),
});

export const OSMElementSchema = z.union([
  OSMNodeSchema,
  OSMWaySchema,
  OSMRelationSchema,
]);

// TypeScript types derived from Zod schemas
export type OSMNode = z.infer<typeof OSMNodeSchema>;
export type OSMWay = z.infer<typeof OSMWaySchema>;
export type OSMRelation = z.infer<typeof OSMRelationSchema>;
export type OSMElement = z.infer<typeof OSMElementSchema>;
