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
    {isLast ? label : <a href={url}>{label}</a>}
    {!isLast && " > "}
  </>
);

export default Breadcrumb;
