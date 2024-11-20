"use client";

import { CollecticonArrowLeft } from "@devseed-ui/collecticons-react";
import { Link as NextUILink } from "@nextui-org/react";

const Link = NextUILink;

export const BackLink = ({ children, ...props }) => {
  return (
    <Link {...props} size="sm">
      <span className="flex items-center mb-2">
        <CollecticonArrowLeft className="mr-2" size="8" />
        {children}
      </span>
    </Link>
  );
};

export default Link;
