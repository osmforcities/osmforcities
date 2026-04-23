import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import NavBar from "@/components/nav-bar";
import Footer from "@/components/footer";
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
  // Note: Using official OpenStreetMap logo as placeholder until project has own logo
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    images: "/og-image.png",
  },
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
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID &&
          process.env.NEXT_PUBLIC_UMAMI_URL && (
            <Script
              src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              strategy="afterInteractive"
            />
          )}
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-screen flex flex-col">
              <NavBar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
