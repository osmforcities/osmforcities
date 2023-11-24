import React from "react";
import { SearchInput } from "./components/search";

const HomePage = () => {
  return (
    <div role="main" aria-label="home" className="p-4">
      <nav>
        <ul className="flex justify-between items-center">
          <li className="mr-auto">
            <a href="/" className="text-blue-500 hover:text-blue-700">
              osmforcities.org
            </a>
          </li>
          <li className="mr-4">
            <a href="/" className="text-blue-500 hover:text-blue-700">
              Home
            </a>
          </li>
          <li className="mr-4">
            <a href="/about" className="text-blue-500 hover:text-blue-700">
              About
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex flex-col mx-auto max-w-xl">
        <h1 className="text-center text-6xl mt-20 mb-10">
          Open data about your city.
        </h1>
        <div className="text-center text-2xl pb-10">
          Download, inspect and track data from OpenStreetMap, the open map for
          the world.
        </div>
        <div className="text-center text-2xl pb-5">Find your city now:</div>
        <div className="w-full flex justify-center pb-10">
          <SearchInput />
        </div>
        <div className="text-center text-2xl pb-5">
          ... or{" "}
          <a href="/about" className="text-blue-500 hover:text-blue-700">
            read more
          </a>{" "}
          about this project.
        </div>
      </div>
    </div>
  );
};

export default HomePage;
