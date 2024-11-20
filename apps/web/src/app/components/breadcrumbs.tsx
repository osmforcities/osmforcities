"use client";
import React from "react";

import {
  BreadcrumbItem,
  Breadcrumbs as NextUIBreadcrumbs,
} from "@nextui-org/react";

type BreadcrumbProps = {
  label: string;
  url?: string;
  isLast?: boolean;
};

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbProps[];
}

const Breadcrumbs = ({ breadcrumbs }: BreadcrumbsProps) => {
  return (
    <NextUIBreadcrumbs className="my-4">
      {breadcrumbs.map(({ label, url, isLast }) => (
        <BreadcrumbItem key={label} href={url} isLast={isLast}>
          {label}
        </BreadcrumbItem>
      ))}
    </NextUIBreadcrumbs>
  );
};

export default Breadcrumbs;
