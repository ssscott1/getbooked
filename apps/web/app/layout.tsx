import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GetBooked — Australia's specialist booking marketplace",
    template: "%s | GetBooked",
  },
  description:
    "Find and book specialist medical appointments across Australia. No referral chasing, no waiting on hold — just fast, transparent booking.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://getbooked-web.netlify.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "GetBooked",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
