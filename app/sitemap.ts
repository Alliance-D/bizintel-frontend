import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bizintel.local";
  return ["", "/opportunity", "/scout", "/competitive", "/compare", "/insights", "/reports"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
