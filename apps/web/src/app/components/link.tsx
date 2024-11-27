"use client";
import React from "react";
import { CollecticonArrowLeft } from "@devseed-ui/collecticons-react";
import { Link as NextUILink, LinkProps } from "@nextui-org/react";

const Link = NextUILink;

interface BackLinkProps extends LinkProps {
  children: React.ReactNode;
}

export const BackLink = ({ children, ...props }: BackLinkProps) => {
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
