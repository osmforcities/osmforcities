import React from "react";
import { SearchInput } from "./components/search";
import { Footer } from "./components/footer";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";
import FeaturedDatasetsSection from "./components/featured-datasets";

const SearchSection = () => {
  return (
    <section id="search">
      <div className="flex flex-col mx-auto mt-10">
        <h2 className="text-left text-4xl mb-10">Find a city</h2>
        <div className="w-full flex">
          <SearchInput />
        </div>
      </div>
    </section>
  );
};

const AboutSection = () => {
  return (
    <section id="about">
      <div className="flex flex-col mx-auto mt-10">
        <h2 className="text-left text-4xl mb-10">About</h2>
        <div className=" text-lg pb-10">
          This platform is in early development and the coverage it restricted
          to Brazil.{" "}
          <a href="/about" className="text-blue-500 hover:text-blue-700">
            Please visit the about page to know more.
          </a>
        </div>
      </div>
    </section>
  );
};

const HeroSection = () => {
  return (
    <section id="hero">
      <div className="flex flex-col mx-auto">
        <h1 className="text-center text-6xl mt-20 mb-10 font-bold">
          <span className="block">Discover free maps</span>
          <span className="block">of your city.</span>
        </h1>
        <div className="text-center text-2xl pb-5 font-light">
          OSM for Cities is a platform that provides daily updated city-level
          maps from OpenStreetMap, the map of the world where everyone can
          collaborate.
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  return (
    <div role="main" aria-label="home">
      <div className="flex flex-col mx-auto">
        <HeroSection />
        <SearchSection />
        <AboutSection />
        <FeaturedDatasetsSection />
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
