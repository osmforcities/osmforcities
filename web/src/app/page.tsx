import React from "react";
import { SearchInput } from "../components/search";

const HomePage = () => {
  if (process.env.MAINTENANCE_MODE === "true") {
    return (
      <div role="main" className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Under Maintenance</h1>
          <p className="pb-3">
            We are currently updating this page. Please check back later.
          </p>
          <a
            href="https://github.com/osmforcities/osmforcities"
            className="text-blue-600 hover:text-blue-800 visited:text-purple-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit our GitHub Repository
          </a>
        </div>
      </div>
    );
  }

  return (
    <div role="main">
      <SearchInput />
    </div>
  );
};

export default HomePage;
