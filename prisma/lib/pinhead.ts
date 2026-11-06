import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PINHEAD_ICON_DIR = join(__dirname, "../../node_modules/@waysidemapping/pinhead/dist/icons");
/** Icons Pinhead lacks, drawn on the same 15x15 grid as filled paths. */
const CUSTOM_ICON_DIR = join(__dirname, "../custom-icons");

function iconFile(id: string): string | undefined {
  if (!/^[a-z0-9_]+$/.test(id)) return undefined;
  return [PINHEAD_ICON_DIR, CUSTOM_ICON_DIR]
    .map((dir) => join(dir, `${id}.svg`))
    .find((file) => existsSync(file));
}

/** Pinhead icons share one 15x15 grid. */
export const PINHEAD_VIEWBOX = "0 0 15 15";

export function isPinheadIcon(id: string): boolean {
  return iconFile(id) !== undefined;
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
  const file = iconFile(id);
  if (!file) throw new Error(`Unknown Pinhead icon: ${id}`);
  const svg = readFileSync(file, "utf8");
  return Array.from(svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g), (match) => match[1]);
}
