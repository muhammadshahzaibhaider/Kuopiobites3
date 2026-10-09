/** @type {import('next').NextConfig} */
const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  images: { unoptimized: true },
  /* Do not advertise the framework. */
  poweredByHeader: false,
  /* Never emit browser-readable source maps in production builds. */
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/media/:path*", destination: `${apiOrigin}/media/:path*` },
    ];
  },
  async headers() {
    const apiConnect = process.env.NEXT_PUBLIC_API_BASE_URL || "'self'";
    const productionOnly = process.env.NODE_ENV === "production";
    const scriptSrc = productionOnly ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ${apiConnect}; frame-src 'self' https://www.google.com https://maps.google.com; worker-src 'self' blob:${productionOnly ? "; upgrade-insecure-requests" : ""}` },
          { key: "Strict-Transport-Security", value: productionOnly ? "max-age=63072000; includeSubDomains; preload" : "max-age=0" },

          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        ],
      },
      /* The admin UI is credential-gated and reached by direct URL only —
         keep it out of search indexes. */
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
