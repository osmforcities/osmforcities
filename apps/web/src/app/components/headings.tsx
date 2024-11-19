import React from "react";

interface HeadingProps {
  size?: "small" | "medium" | "large";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

const Heading: React.FC<HeadingProps> = ({
  size = "medium",
  level = 2,
  children,
}) => {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  let headingClass = "";
  switch (size) {
    case "small":
      headingClass = "text-lg font-semibold";
      break;
    case "medium":
      headingClass = "text-2xl font-bold";
      break;
    case "large":
      headingClass = "text-4xl font-extrabold";
      break;
  }

  return <Tag className={headingClass}>{children}</Tag>;
};

export default Heading;
