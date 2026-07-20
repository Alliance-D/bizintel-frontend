import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bizintel.local";
  return ["", "/start", "/map", "/insights", "/field-validation", "/legal"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
