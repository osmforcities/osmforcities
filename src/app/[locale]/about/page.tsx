import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About - OSM for Cities",
  description:
    "Learn about OSM for Cities - Daily updated datasets from OpenStreetMap",
};

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-6">
                About
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                OSM for Cities is an experimental platform to help people
                explore and follow updates from OpenStreetMap — a free, open map
                of the world built by volunteers. Every day, people add and
                improve data about streets, buildings, schools, parks,
                transport, and more. This project gives you a way to track those
                changes in places you care about.
              </p>
            </div>

            <div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                You might want to keep an eye on edits to schools in your
                region, or monitor how crosswalks, bus stops, or bike racks are
                being added to your city. Maybe you&apos;re just curious about
                how your neighborhood park is evolving. Whether it&apos;s a
                critical dataset for urban planning or something more personal
                and informal, the platform lets you create and follow it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                Feature Highlights
              </h2>

              <ul className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <li>
                  • Create custom datasets by selecting a place and a topic
                </li>
                <li>
                  • Follow datasets and receive daily or weekly update summaries
                </li>
                <li>
                  • See contributor activity and edit frequency for each dataset
                </li>
                <li>• Reuse or remix templates shared by other users</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                The Experiment
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                OSM for Cities is a proof of concept created by{" "}
                <a
                  href="https://github.com/vgeorge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Vitor George
                  <ExternalLink className="h-4 w-4" />
                </a>{" "}
                and developed as a Labs project by{" "}
                <a
                  href="https://developmentseed.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Development Seed
                  <ExternalLink className="h-4 w-4" />
                </a>
                . It&apos;s a space to test ideas around surfacing OSM data in
                useful, accessible ways.
              </p>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Whether it evolves into a broader tool will depend on how the
                community engages with it. The source code is open and{" "}
                <a
                  href="https://github.com/osmforcities/osmforcities"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  available on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                Get Involved
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your feedback helps shape this experiment. Whether you have
                ideas for new features, found something that doesn&apos;t work
                quite right, or just want to share how you&apos;re using the
                platform — we&apos;d love to hear from you.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a
                    href="https://forms.gle/RGZdZ1mzo4hZx5g27"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    Share Feedback
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>

                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/osmforcities/osmforcities"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    View on GitHub
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
