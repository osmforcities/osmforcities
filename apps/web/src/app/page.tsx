import React from "react";
import { Footer } from "./components/footer";
import { GLOBAL_REVALIDATION_TIME } from "@/constants";
import FeaturedDatasetsSection from "./components/featured-datasets";
import PageLayout from "./components/page-layout";
import AboutToast from "./components/home/about-toast";

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
    <PageLayout aria-label="home">
      <div className="flex flex-col mx-auto">
        <HeroSection />
        <AboutToast />
        <FeaturedDatasetsSection />
        <Footer />
      </div>
    </PageLayout>
  );
};

export default HomePage;

export const revalidate = GLOBAL_REVALIDATION_TIME;
