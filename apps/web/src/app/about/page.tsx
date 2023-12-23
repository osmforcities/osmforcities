import React from "react";
import {
  ExternalLink,
  PageSubtitle,
  PageTitle,
  Paragraph,
} from "../components/common";

const AboutPage = async () => {
  return (
    <div role="main" className="pt-10">
      <PageTitle>Daily updated datasets from OpenStreetMap</PageTitle>
      <Paragraph>
        OSM for Cities is a platform to provide easy access to city-level
        OpenStreetMap data. It is aimed to simplify retrieving and utilizing OSM
        data, enabling cities to make informed decisions and leveraged by the
        power of local mapping.
      </Paragraph>
      <Paragraph>
        We have developed a tool that tracks daily-updated city-level OSM data
        in a git repository. This service processes daily diffs of predefined
        OSM presets, such as schools, hospitals, cycling infrastructure, etc.
        The processed data is then pushed to the git repository, making it
        readily available for direct access or integration into third-party
        applications.
      </Paragraph>
      <PageSubtitle>Key features</PageSubtitle>
      <Paragraph>
        This platform ensures timeliness by updating data daily, reflecting the
        latest changes in OpenStreetMap. Additionally, a git server enables
        users how files have evolved over time.
      </Paragraph>
      <Paragraph>
        Coverage is another crucial aspect of OSM for Cities. Each city within
        in the platform can potentially offer 30+ datasets, allowing for a
        comprehensive understanding of various urban aspects. We aim to include
        data from all countries on our platform, making city-level OSM data
        accessible globally.
      </Paragraph>
      <Paragraph>
        In the first prototype of this platform, the coverage is restricted to
        Brazil. With more than five thousand municipalities and ranking among
        the top 10 countries in number of OSM elements, Brazil showcases the
        potential of the platform. As we expand, the next challenge is to add
        more countries to OSM for Cities.
      </Paragraph>
      <PageSubtitle>The data processing workflow</PageSubtitle>
      <Paragraph>
        The process begins by recursively slicing the Planet PBF file to the
        city level. City-level presets are then extracted and converted into
        GeoJSON format. The datasets are available in GeoJSON format, enclosed
        within the city limits polygon, reducing the need for pre-processing.
        This ready-to-use approach saves time for anyone interested in using the
        data and make it easier to integrate of OpenStreetMap data into
        workflows.
      </Paragraph>
      <PageSubtitle>Contact & Feedback</PageSubtitle>
      <Paragraph>
        Please share your thoughts with us through{" "}
        <ExternalLink href="https://forms.gle/RGZdZ1mzo4hZx5g27">
          our Contact & Feedback form.
        </ExternalLink>
      </Paragraph>
      <PageSubtitle>About</PageSubtitle>
      <Paragraph>
        This project is part of the Labs program of{" "}
        <ExternalLink href="https://developmentseed.org">
          Development Seed
        </ExternalLink>
        .
      </Paragraph>
      <Paragraph>
        The source code for this project is open and{" "}
        <ExternalLink href="https://github.com/osmforcities/osmforcities">
          available at Github
        </ExternalLink>
        .
      </Paragraph>
      <Paragraph>
        OSM for Cities was idealized by{" "}
        <ExternalLink href="https://github.com/vgeorge">
          Vitor George
        </ExternalLink>
        .
      </Paragraph>
    </div>
  );
};

export default AboutPage;
