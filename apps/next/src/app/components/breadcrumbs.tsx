import React from "react";

const Breadcrumb = ({
  label,
  url,
  isLast = false,
}: {
  label: string;
  url?: string;
  isLast?: boolean;
}) => (
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

export default Breadcrumb;
