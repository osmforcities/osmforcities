import React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GlobalNav from "./components/global-nav";
import { format } from "date-fns";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSM for Cities",
  description: "OpenStreetMap data for cities",
};

const Footer = () => {
  const renderTimestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  return (
    <footer className="italic text-sm font-thin pt-5">
      <div>Page generated at {renderTimestamp} UTC</div>
    </footer>
  );
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div role="main" className="max-w-4xl mx-auto p-4">
          <GlobalNav />
          {children}
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
