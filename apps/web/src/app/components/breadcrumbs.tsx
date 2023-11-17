import React from "react";

type BreadcrumbProps = {
  label: string;
  url?: string;
  isLast?: boolean;
};

const Breadcrumb = ({ label, url, isLast = false }: BreadcrumbProps) => (
  <>
    {isLast ? (
      <span className="text-gray-500 font-semibold">{label}</span>
    ) : (
      <a href={url} className="text-blue-600 hover:text-blue-800 font-medium">
        {label}
      </a>
    )}
    {!isLast && <span className="text-gray-400 mx-2">{">"}</span>}
  </>
);

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbProps[];
}

const Breadcrumbs = ({ breadcrumbs }: BreadcrumbsProps) => {
  return (
    <nav aria-label="breadcrumb" className="flex mb-4">
      {breadcrumbs.map(({ label, url, isLast }) => (
        <Breadcrumb key={label} label={label} url={url} isLast={isLast} />
      ))}
    </nav>
  );
};

export default Breadcrumbs;
