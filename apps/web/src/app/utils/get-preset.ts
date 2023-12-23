import "server-only";
import prisma from "./db";
import { Preset } from "@prisma/client";

type GetPresetParams = {
  presetSlug: string;
};

export const getPreset = async ({
  presetSlug,
}: GetPresetParams): Promise<Preset | null> => {
  const preset = await prisma.preset.findFirst({
    where: {
      name_slug: presetSlug,
    },
  });

  if (!preset) {
    return null;
  }

  return preset as Preset;
};
