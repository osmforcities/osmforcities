import React from "react";
import { SearchInput } from "./components/search";

const HomePage = () => {
  return (
    <div role="main" aria-label="home" className="p-4">
      <div className="flex flex-col mx-auto max-w-lg">
        <h1 className="text-center text-6xl mt-20 mb-10">
          Open maps of your city.
        </h1>
        <div className="text-center text-2xl pb-10">
          Download, inspect and track data from OpenStreetMap, the open map for
          the world.
        </div>
        <div className="text-center text-2xl pb-5">
          Start by finding your city:
        </div>
        <div className="w-full flex justify-center pb-10">
          <SearchInput />
        </div>
        <div className="text-center text-xl pb-5">
          This platform is in early development and the coverage it restricted
          to Brazil.
        </div>
        <div className="text-center text-lg pb-5">
          <a href="/about" className="text-blue-500 hover:text-blue-700">
            Please visit the about page to learn more.
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
