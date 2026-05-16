import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISA Digital Event Pass",
  description: "Indian Student Association Digital Membership Pass",
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