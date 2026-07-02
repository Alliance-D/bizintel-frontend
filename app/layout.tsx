import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Location Intelligence | BizIntel",
  description: "ML-powered spatial opportunity intelligence for urban microbusiness location decisions.",
  openGraph: {
    title: "Business Location Intelligence Platform",
    description: "Discover, assess and compare business opportunities across Kigali.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
