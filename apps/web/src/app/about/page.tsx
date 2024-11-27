import React from "react";
import {
  ExternalLink,
  PageSubtitle,
  PageTitle,
  Paragraph,
} from "../components/common";
import PageLayout from "../components/page-layout";

const AboutPage = async () => {
  return (
    <PageLayout aria-label="about">
      <PageTitle>Daily Updated Datasets from OpenStreetMap</PageTitle>
      <Paragraph>
        OSM for Cities is a platform designed to provide easy access to
        city-level OpenStreetMap data. It aims to simplify retrieving and
        utilizing OSM data, enabling cities to make informed decisions while
        leveraging the power of local mapping.
      </Paragraph>
      <Paragraph>
        We have developed a tool that tracks daily-updated city-level OSM data
        in a Git repository. This service processes daily diffs of predefined
        OSM presets, such as schools, hospitals, cycling infrastructure, and
        more. The processed data is then pushed to the Git repository, making it
        readily available for direct access or integration with third-party
        applications.
      </Paragraph>
      <PageSubtitle>Key Features</PageSubtitle>
      <Paragraph>
        This platform ensures timeliness by updating data daily to reflect the
        latest changes in OpenStreetMap. Additionally, a Git server allows users
        to see how files have evolved over time.
      </Paragraph>
      <Paragraph>
        Coverage is another crucial aspect of OSM for Cities. Each city on the
        platform can potentially offer over 30 datasets, providing a
        comprehensive understanding of various urban aspects. Our goal is to
        include data from all countries on our platform, making city-level OSM
        data accessible globally.
      </Paragraph>
      <Paragraph>
        In its first prototype, the platform&apos;s coverage is restricted to
        Brazil. With more than five thousand municipalities and ranking among
        the top 10 countries in the number of OSM elements, Brazil showcases the
        potential of the platform. As we expand, the next challenge is to add
        more countries to OSM for Cities.
      </Paragraph>
      <PageSubtitle>The Data Processing Workflow</PageSubtitle>
      <Paragraph>
        The process begins by recursively slicing the Planet PBF file to the
        city level. City-level presets are then extracted and converted into
        GeoJSON format. These datasets are available in GeoJSON format and are
        enclosed within city limit polygons, reducing the need for
        pre-processing. This ready-to-use approach saves time for anyone
        interested in using the data and makes it easier to integrate
        OpenStreetMap data into workflows.
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
        This project is part of the Labs program by{" "}
        <ExternalLink href="https://developmentseed.org">
          Development Seed
        </ExternalLink>
        .
      </Paragraph>
      <Paragraph>
        The source code for this project is open and{" "}
        <ExternalLink href="https://github.com/osmforcities/osmforcities">
          available on GitHub
        </ExternalLink>
        .
      </Paragraph>
      <Paragraph>
        OSM for Cities was conceptualized by{" "}
        <ExternalLink href="https://github.com/vgeorge">
          Vitor George
        </ExternalLink>
        .
      </Paragraph>
    </PageLayout>
  );
};

export default AboutPage;
