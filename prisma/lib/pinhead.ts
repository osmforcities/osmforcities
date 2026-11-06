import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PINHEAD_ICON_DIR = join(__dirname, "../../node_modules/@waysidemapping/pinhead/dist/icons");

/** Pinhead icons share one 15x15 grid. */
export const PINHEAD_VIEWBOX = "0 0 15 15";

export function isPinheadIcon(id: string): boolean {
  return /^[a-z0-9_]+$/.test(id) && existsSync(join(PINHEAD_ICON_DIR, `${id}.svg`));
}

/** One message per template whose icon is missing or not a Pinhead id. */
export function templateIconErrors(
  templateIds: string[],
  templateIcons: Map<string, string>,
): string[] {
  return templateIds.flatMap((id) => {
    const icon = templateIcons.get(id);
    if (!icon) return [`${id}: no icon`];
    if (!isPinheadIcon(icon)) return [`${id}: unknown Pinhead icon "${icon}"`];
    return [];
  });
}

/** The `d` attribute of every path in a Pinhead icon (each icon is paths only). */
export function readPinheadPaths(id: string): string[] {
  if (!isPinheadIcon(id)) throw new Error(`Unknown Pinhead icon: ${id}`);
  const svg = readFileSync(join(PINHEAD_ICON_DIR, `${id}.svg`), "utf8");
  return Array.from(svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g), (match) => match[1]);
}
