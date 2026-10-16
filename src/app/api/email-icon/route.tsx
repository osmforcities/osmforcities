import { cloneElement, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import { CalendarDays, Shapes, TriangleAlert, Users, type LucideProps } from "lucide-react";
import { getTemplateIcon } from "@/lib/category-icons";
import { COLOR } from "@/lib/email-layout";

export const dynamic = "force-dynamic";

const TILE_PX = 80;
const GLYPH_PX = 32;
const CACHE = { "Cache-Control": "public, max-age=86400, s-maxage=604800" };

// A Map, not an object literal: `?glyph=toString` must not hit Object.prototype.
const GLYPHS = new Map<string, { icon: ReactElement<LucideProps>; color: string }>([
  ["calendar", { icon: <CalendarDays />, color: COLOR.muted }],
  ["features", { icon: <Shapes />, color: COLOR.muted }],
  ["mappers", { icon: <Users />, color: COLOR.muted }],
  ["alert", { icon: <TriangleAlert />, color: COLOR.yellow700 }],
]);

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

/**
 * Email icons as PNGs, since email clients strip SVG. `?glyph=` returns a
 * small transparent UI glyph; otherwise the template's icon on an olive tile.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const glyphName = params.get("glyph");

  if (glyphName !== null) {
    const glyph = GLYPHS.get(glyphName);
    if (!glyph) return new Response("Unknown glyph", { status: 404 });
    return new ImageResponse(
      toHostElement(cloneElement(glyph.icon, { size: GLYPH_PX, color: glyph.color, strokeWidth: 2 })),
      { width: GLYPH_PX, height: GLYPH_PX, headers: CACHE }
    );
  }

  const icon = getTemplateIcon(
    params.get("template") ?? "",
    params.get("category") ?? ""
  ) as ReactElement<LucideProps>;

  return new ImageResponse(
    (
      <div
        style={{
          width: TILE_PX,
          height: TILE_PX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLOR.olive100,
          borderRadius: 16,
        }}
      >
        {toHostElement(cloneElement(icon, { size: 44, color: COLOR.olive600, strokeWidth: 2 }))}
      </div>
    ),
    { width: TILE_PX, height: TILE_PX, headers: CACHE }
  );
}
