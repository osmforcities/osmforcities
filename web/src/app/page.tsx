import React from "react";
import Image from "next/image";
import logo from "../../public/images/logo.svg";

const Heading = ({ children }) => {
  return <h1 className="text-4xl font-bold mb-4">{children}</h1>;
};

const Paragraph = ({ children }) => {
  return <p className="mb-4">{children}</p>;
};

const HomePage = () => {
  return (
    <div className="page-content home" role="main">
      <div className="grid">
        <div className="flex justify-center items-center">
          <Image src={logo} alt="OSM for Cities" />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">OSM for Cities</h1>
          <Heading>Daily updated datasets from OpenStreetMap</Heading>
          <Paragraph>
            OSM for Cities is a platform to provide easy access to city-level
            OpenStreetMap data. It is aimed to simplify retrieving and utilizing
            OSM data, enabling cities to make informed decisions and leverage
            the power of local mapping.
          </Paragraph>
          <Paragraph>
            We have developed a tool that tracks daily-updated city-level OSM
            data in a git repository. This service processes daily diffs of
            predefined OSM presets, such as schools, hospitals, cycling
            infrastructure, etc. The processed data is then pushed to the git
            repository, making it readily available for direct access or
            integration into third-party applications.
          </Paragraph>
          <Heading>Key features</Heading>
          <Paragraph>
            This platform ensures timeliness by updating data daily, reflecting
            the latest changes in OpenStreetMap. Additionally, a git server
            enables users to visualize the data's change history, providing
            insights into how files have evolved over time.
          </Paragraph>
          <Paragraph>
            Coverage is another crucial aspect of OSM for Cities. Each city
            within in the platform can potentially offer 30+ datasets, allowing
            for a comprehensive understanding of various urban aspects. We aim
            to include data from all countries on our platform, making
            city-level OSM data accessible globally.
          </Paragraph>
          <Paragraph>
            We have already added the first country:{" "}
            <a
              href="https://osmforcities.org/cities-of/brazil"
              target="_blank"
              referrerpolicy="no-referrer"
            >
              Brazil
            </a>
            . With more than five thousand municipalities and ranking among the
            top 10 countries in number of OSM elements, Brazil showcases the
            potential of the platform. As we expand, the next challenge is to
            add more countries to OSM for Cities.
          </Paragraph>
          <Heading>The data processing workflow</Heading>
          <Paragraph>
            The process begins by recursively slicing the Planet PBF file to the
            city level. City-level presets are then extracted and converted into
            GeoJSON format. These files are committed and pushed to a git
            repository. With a cloud-based infrastructure based on Kubernetes,
            the platform is scalable.
          </Paragraph>
          <Paragraph>
            The datasets are available in GeoJSON format, enclosed within the
            city limits polygon, reducing the need for pre-processing. This
            ready-to-use approach saves time for anyone interested in using the
            data and make it easier to integrate of OSM data into workflows.
          </Paragraph>
          <Heading>About this project</Heading>
          <Paragraph>
            The source code for this project is{" "}
            <a
              href="https://github.com/vgeorge/osm-for-cities"
              target="_blank"
              referrerpolicy="no-referrer"
            >
              available at Github
            </a>
            .
          </Paragraph>
          <Paragraph>
            This is a labs project from Development Seed. We value feedback and
            are looking forward to work with partners to improve its usability
            and coverage.
          </Paragraph>
          <Paragraph>
            Please reach us at our{" "}
            <a
              href="https://developmentseed.org/contact"
              target="_blank"
              referrerpolicy="no-referrer"
            >
              contact page
            </a>
            .
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
