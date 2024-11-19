import React from "react";
import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export const Button = ({ children, href, onClick }: ButtonProps) => {
  const className =
    "w-36 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-2 flex items-center justify-center text-center";

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
};
