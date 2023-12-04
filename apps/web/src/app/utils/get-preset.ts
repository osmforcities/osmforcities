import "server-only";
import { cache } from "react";
import prisma from "./db";
import { Preset } from "@prisma/client";

export const revalidate = 3600;

type GetPresetParams = {
  presetSlug: string;
};

export const getPreset = cache(
  async ({ presetSlug }: GetPresetParams): Promise<Preset | null> => {
    const preset = await prisma.preset.findFirst({
      where: {
        name_slug: presetSlug,
      },
    });

    if (!preset) {
      return null;
    }

    return preset as Preset;
  }
);
