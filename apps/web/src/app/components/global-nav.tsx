"use client";
import React from "react";
import { Navbar, NavbarBrand, NavbarContent } from "@nextui-org/react";
import Link from "./link";
import Heading from "./headings";
import { SearchInput } from "./search";

const GlobalNav = () => {
  return (
    <Navbar maxWidth="full">
      <NavbarBrand>
        <Link href="/">
          <Heading level={1}>OSM for Cities</Heading>
        </Link>
      </NavbarBrand>
      <NavbarContent justify="end">
        <SearchInput />
      </NavbarContent>
      <NavbarContent justify="end">
        <Link
          href="https://github.com/osmforcities/osmforcities"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github
        </Link>
        <Link href="/about">About</Link>
      </NavbarContent>
    </Navbar>
  );
};

export default GlobalNav;
