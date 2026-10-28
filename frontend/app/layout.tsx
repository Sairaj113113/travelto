import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoyaAI - AI Tourism Portal",
  description:
    "Your personal AI travel assistant for unforgettable journeys.",
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