import { createElement, type ComponentType, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import * as lucide from "lucide-react";
import type { LucideProps } from "lucide-react";
import { COLOR } from "../../src/lib/email-layout";

const TILE_PX = 80;
const TILE_ICON_PX = 44;
const GLYPH_PX = 32;

type ForwardRefType = { render: (props: unknown, ref: null) => ReactElement };

/**
 * Satori renders host elements only. Lucide icons are forwardRef wrappers
 * (hook-free) around an <svg>, so call their render functions down to it.
 */
function toHostElement(element: ReactElement): ReactElement {
  let node = element;
  while (typeof node.type === "object" && node.type !== null && "render" in node.type) {
    node = (node.type as ForwardRefType).render(node.props, null);
  }
  return node;
}

function lucideSvg(iconName: string, props: LucideProps): ReactElement {
  const Icon = (lucide as unknown as Record<string, ComponentType<LucideProps>>)[iconName];
  if (!Icon) throw new Error(`Unknown lucide-react icon: ${iconName}`);
  return toHostElement(createElement(Icon, props));
}

async function toPng(element: ReactElement, size: number): Promise<Buffer> {
  const response = new ImageResponse(element, { width: size, height: size });
  return Buffer.from(await response.arrayBuffer());
}

/** A template's icon on the olive tile used by report rows (80px, shown at 40). */
export function renderTemplateTile(iconName: string): Promise<Buffer> {
  const tile = createElement(
    "div",
    {
      style: {
        width: TILE_PX,
        height: TILE_PX,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLOR.olive100,
        borderRadius: 16,
      },
    },
    lucideSvg(iconName, { size: TILE_ICON_PX, color: COLOR.olive600, strokeWidth: 2 })
  );
  return toPng(tile, TILE_PX);
}

/** A small transparent glyph (32px, shown at 14 or 16). */
export function renderGlyph(iconName: string, color: string): Promise<Buffer> {
  return toPng(lucideSvg(iconName, { size: GLYPH_PX, color, strokeWidth: 2 }), GLYPH_PX);
}
