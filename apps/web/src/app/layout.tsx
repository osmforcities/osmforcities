import React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <div role="main" className="max-w-screen-xl mx-auto p-4">
          {children}
        </div>
      </body>
    </html>
  );
}
