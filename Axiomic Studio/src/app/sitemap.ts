import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/data/services";
import { CASE_STUDIES } from "@/lib/data/caseStudies";
import { POSTS } from "@/lib/data/posts";
import { DEMOS } from "@/lib/data/demos";

const BASE = "https://axiomic-studio.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/work", "/company", "/contact", "/blog", "/open-resources", "/demos", "/services"];

  return [
    ...staticRoutes.map((path) => ({
      url: `${BASE}${path}/`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.8,
    })),
    ...SERVICES.map((service) => ({
      url: `${BASE}/services/${service.slug}/`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...CASE_STUDIES.map((study) => ({
      url: `${BASE}/case-study/${study.slug}/`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...POSTS.map((post) => ({
      url: `${BASE}/blog/${post.slug}/`,
      lastModified: new Date(post.dateISO),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    ...DEMOS.map((demo) => ({
      url: `${BASE}/demos/${demo.slug}/`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
