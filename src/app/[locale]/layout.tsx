import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import NavBar from "@/components/nav-bar";
import { QueryProvider } from "@/hooks/QueryProvider";
import { NextIntlClientProvider, hasLocale, Locale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSM for Cities",
  description: "Monitor OpenStreetMap datasets across cities",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  if (!hasLocale(routing.locales, typedLocale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={typedLocale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-screen flex flex-col">
              <NavBar />
              <main className="flex-1">{children}</main>
            </div>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
