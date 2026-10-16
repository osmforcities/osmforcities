import { cloneElement, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import type { LucideProps } from "lucide-react";
import { getTemplateIcon } from "@/lib/category-icons";
import { COLOR } from "@/lib/email-layout";

export const dynamic = "force-dynamic";

const TILE_PX = 80;

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
 * The template's icon on an olive tile, as a PNG. Email clients strip SVG,
 * so report rows link this instead of the icon component the app renders.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
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
    {
      width: TILE_PX,
      height: TILE_PX,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    }
  );
}
