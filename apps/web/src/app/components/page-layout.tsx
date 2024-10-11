import React from "react";

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div role="main" className="max-w-4xl mx-auto">
      {children}
    </div>
  );
};
export default PageLayout;
