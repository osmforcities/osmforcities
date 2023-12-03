import React from "react";
import { SearchInput } from "./components/search";
import { fetchLatestChanges } from "./fetch";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { InternalLink } from "./components/common";

const LatestChangesSection = async () => {
  const latestChanges = await fetchLatestChanges();

  if (!latestChanges) {
    return null;
  }

  return (
    <section id="latest-changes">
      <div className="flex flex-col mx-auto mt-10">
        <h2 className="text-left text-4xl mb-10">Latest changes</h2>
        <table className="table-auto">
          <thead className="sr-only">
            <tr>
              <th>Preset</th>
              <th>City</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {latestChanges.map(
              ({ presetName, presetUrl, cityName, cityUrl, updatedAt }) => {
                return (
                  <tr key={presetUrl} className="border-b border-gray-300">
                    <td className="font-bold py-2 px-2">
                      <InternalLink href={presetUrl}>{presetName}</InternalLink>
                    </td>
                    <td className="py-2 px-2">
                      <InternalLink href={cityUrl}>{cityName}</InternalLink>
                    </td>
                    <td className="font-thin py-2 pl-2 pr-5 text-right">
                      {formatDistanceToNow(updatedAt, {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

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
            Please visit the about page.
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
      <div className="flex flex-col mx-auto max-w-2xl">
        <HeroSection />
        <LatestChangesSection />
        <SearchSection />
        <AboutSection />
      </div>
    </div>
  );
};

export default HomePage;
