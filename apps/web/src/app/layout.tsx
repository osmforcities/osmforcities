import React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import GlobalNav from "./components/global-nav";
import Providers from "./providers";

const font = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSM for Cities",
  description: "OpenStreetMap data for cities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <Providers>
          <div role="main" className="flex flex-col">
            <GlobalNav />
            {children}
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
