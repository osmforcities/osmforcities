import React from "react";

const GlobalNav = () => {
  return (
    <nav className="my-5">
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
  );
};

export default GlobalNav;
