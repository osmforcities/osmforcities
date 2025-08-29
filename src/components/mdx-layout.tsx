import React from "react";

interface MdxLayoutProps {
  children: React.ReactNode;
}

export default function MdxLayout({ children }: MdxLayoutProps) {
  return (
    <div
      className={`
        space-y-8
        [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:text-black [&>h1]:dark:text-white [&>h1]:mb-6
        [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-black [&>h2]:dark:text-white [&>h2]:mb-4
        [&>p]:text-lg [&>p]:text-gray-600 [&>p]:dark:text-gray-400 [&>p]:leading-relaxed [&>p]:mb-4
        [&>ul]:text-lg [&>ul]:text-gray-600 [&>ul]:dark:text-gray-400 [&>ul]:leading-relaxed 
        [&>ul]:space-y-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4
        [&>a]:text-blue-600 [&>a]:dark:text-blue-400 [&>a]:hover:underline 
        [&>a]:inline-flex [&>a]:items-center [&>a]:gap-1
      `}
    >
      {children}
    </div>
  );
}
