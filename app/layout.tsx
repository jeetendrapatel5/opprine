import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next"
import { getSiteUrl } from "@/lib/seo/sitemap";
import { SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo/site";

const fraunces = Fraunces({
  variable: "--font-fraunces",  
  subsets: ["latin"],
  axes: ["WONK", "opsz"],        
  display: "swap",               
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",  
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    googleBot: {
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${dmSans.variable}`}>
      <Script 
          src="https://upload-widget.cloudinary.com/global/all.js" 
          strategy="afterInteractive" 
        />
      <body
        className="antialiased"
      >
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}