import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Matches the website's body font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Matches the website's heading/display font
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ISA UTD — Membership",
  description: "Join the Indian Student Association at UT Dallas.",

  icons: {
    icon: "/isa-logo.png",
    apple: "/isa-logo.png",
  },

  openGraph: {
    title: "ISA UTD - Membership",
    description: "Join the Indian Student Association at UT Dallas.",
    siteName: "ISA UTD",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ISA UTD Membership",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "ISA UTD - Membership",
    description: "Join the Indian Student Association at UT Dallas.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}