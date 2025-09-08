"use client";

import { Breadcrumbs, Breadcrumb } from "react-aria-components";
import { Link as NextLink } from "@/i18n/navigation";
import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbNavProps = {
  items: BreadcrumbItem[];
};

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <Breadcrumbs className="flex items-center space-x-2 text-sm">
      {items.map((item, index) => (
        <Breadcrumb key={index}>
          <div className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
            {item.href ? (
              <NextLink
                href={item.href}
                className="text-olive-600 hover:text-olive-500 transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                {item.label}
              </NextLink>
            ) : (
              <span className="text-gray-500">{item.label}</span>
            )}
          </div>
        </Breadcrumb>
      ))}
    </Breadcrumbs>
  );
}
