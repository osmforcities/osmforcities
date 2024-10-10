import React from "react";

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div role="main" className="max-w-4xl mx-auto p-4">
      {children}
    </div>
  );
};
export default PageLayout;
