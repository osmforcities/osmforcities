import React from "react";

const GlobalNav = () => {
  return (
    <nav
      id="global-nav"
      className="sticky top-0 w-full bg-white z-10 shadow-md"
      style={{ height: "var(--nav-height)" }}
    >
      <ul className="flex justify-between items-center p-4">
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
