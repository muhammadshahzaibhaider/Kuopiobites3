import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* tiny .env loader (backend-only secrets; never shipped to the frontend) */
const envPath = resolve(here, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export const CFG = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  dbFile: resolve(here, "..", process.env.DB_FILE || "./data/kuopio.db"),
};

if (process.env.NODE_ENV === "production" && CFG.jwtSecret === "dev-only-insecure-secret") {
  throw new Error("JWT_SECRET must be set in production");
}
