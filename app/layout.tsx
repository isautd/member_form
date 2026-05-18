import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISA UTD — Membership",
  description: "Join the Indian Student Association at UT Dallas.",

  icons: {
    icon: "/isa-logo.png",
    apple: "/isa-logo.png",
  },

  openGraph: {
    title: "ISA UTD — Membership",
    description: "Join the Indian Student Association at UT Dallas.",
    url: "https://utd-isa-membership-form.vercel.app",
    siteName: "ISA UTD",
    images: [
      {
        url: "https://utd-isa-membership-form.vercel.app/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ISA UTD Membership",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "ISA UTD — Membership",
    description: "Join the Indian Student Association at UT Dallas.",
    images: ["https://utd-isa-membership-form.vercel.app/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}