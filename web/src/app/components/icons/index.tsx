import React from "react";
import { Icon, IconProps } from "./icon";

// This project uses Collecticons, available at https://collecticons.io/. To add
// a new icon, download the SVG file from the Collecticons website and add it to
// the ./icons directory. Then, import the svg file and add a new component
// extending the Icon component.

import MagnifierRightSvg from "./magnifier-right.svg";
export const MagnifierRight: React.FC<Omit<IconProps, "src" | "alt">> = (
  props
) => {
  return <Icon src={MagnifierRightSvg} alt="Magnifier right" {...props} />;
};
