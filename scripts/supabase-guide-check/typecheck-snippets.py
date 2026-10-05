"""Assembles every ```ts / ```tsx snippet in SUPABASE-SETUP.md into a throw-away project
(.ts-check/) with the minimum surrounding code (route wrappers, today's helpers) so that
`tsc --strict` can check them against the real @supabase/supabase-js, Express 4 and React types.

usage (from this folder):  npm i && npm run ts
"""
import pathlib, re, shutil

here = pathlib.Path(__file__).resolve().parent
repo = here.parent.parent
md = (repo / "SUPABASE-SETUP.md").read_text()
blocks = [m.group(2) for m in re.finditer(r"```(ts|tsx)\n([\s\S]*?)```", md)]
print(f"{len(blocks)} ts/tsx snippets")

root = here / ".ts-check"
shutil.rmtree(root, ignore_errors=True)
for d in ("src/lib", "scripts", "fe/lib", "fe/admin", "fe/components", "fe/app/auth/callback"):
    (root / d).mkdir(parents=True)


def find(prefix: str) -> str:
    for code in blocks:
        if code.lstrip().startswith(prefix):
            return code
    raise SystemExit("snippet not found in guide: " + prefix)


def write(rel: str, text: str) -> None:
    (root / rel).write_text(text)


shutil.copy(repo / "backend/src/lib/types.ts", root / "src/lib/types.ts")
write("src/config.ts", "export {};\n")
write("src/db.ts", "export const db = { prepare: (_sql: string) => ({ all: (): unknown[] => [] }) };\n")
write("src/supabase.ts", find("// backend/src/supabase.ts"))
write("src/auth.ts", find("// backend/src/auth.ts") + '''
// unchanged helpers from today's backend/src/auth.ts
const RANK: Record<Role, number> = { kitchen: 1, manager: 2, owner: 3 };
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const a = (req as any).auth as TokenPayload | null;
  if (!a || a.scope !== "customer") return res.status(401).json({ error: "auth.required" });
  next();
}
export function requireStaff(min: Role = "kitchen") {
  return (req: Request, res: Response, next: NextFunction) => {
    const a = (req as any).auth as TokenPayload | null;
    if (!a || a.scope !== "staff" || !a.role) return res.status(403).json({ error: "auth.staffRequired" });
    if (RANK[a.role] < RANK[min]) return res.status(403).json({ error: "auth.role" });
    next();
  };
}
''')
write("src/audit.ts", find("// backend/src/audit.ts"))
write("src/menu-repo.ts", find("// backend/src/menu-repo.ts"))

prelude = '''import { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireCustomer, requireStaff, type Role, type TokenPayload } from "./auth";
import { audit } from "./audit";
import { must } from "./supabase";
import type { CartLine, Settings } from "./lib/types";
declare const app: import("express").Express;
const ok = (res: Response, data: unknown, code = 200) => res.status(code).json({ data });
const fail = (res: Response, code: number, error: string) => res.status(code).json({ error });
const wrap = (fn: (req: Request, res: Response) => unknown) =>
  async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };
const uid = (p: string) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const authLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const orderLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30 });
const registerSchema = z.object({ name: z.string(), email: z.string().email(), pass: z.string(), phone: z.string().optional() });
const orderSchema = z.object({ type: z.enum(["pickup", "delivery"]),
  customer: z.object({ name: z.string(), email: z.string(), phone: z.string() }),
  address: z.string().optional(), note: z.string().optional(), lines: z.array(z.any()), total: z.number(),
  scheduled: z.object({ date: z.string(), time: z.string() }).optional() });
const statusSchema = z.object({ status: z.enum(["placed", "accepted", "preparing", "ready", "completed"]) });
declare function loadSettings(): Promise<Settings>;
declare function validateOrder(s: Settings, b: { type: "pickup" | "delivery"; lines: CartLine[]; total: number }): {
  lines: CartLine[]; subtotal: number; deliveryFee: number;
  discount: { title: string; amount: number; offerId?: string } | undefined; total: number; vat: number };
'''
server = prelude
for p in ("// backend/src/server.ts — customer register", "// Staff login keeps the existing form",
          "// backend/src/server.ts — POST /api/uploads", "// backend/src/server.ts — POST /api/orders",
          "// backend/src/server.ts — GET /api/account"):
    server += "\n" + find(p)
server += ('\napp.patch("/api/orders/:id/status", requireStaff("kitchen"), wrap(async (req, res) => {\n'
           '  const b = statusSchema.parse(req.body);\n  const auth = (req as any).auth as TokenPayload;\n'
           + find("// PATCH /api/orders/:id/status") + "\n  ok(res, data);\n}));\n")
export_part, erase_part = find("// GET /api/account/export").split("// DELETE /api/account")
server += ('\napp.get("/api/account/export", requireCustomer, wrap(async (req, res) => {\n'
           '  const auth = (req as any).auth as TokenPayload;\n' + export_part + "\n}));\n")
server += ('\napp.delete("/api/customers/:id", requireStaff("owner"), wrap(async (req, res) => {\n'
           '  const auth = (req as any).auth as TokenPayload;\n// DELETE /api/account' + erase_part + "\n}));\n")
write("src/server-snippets.ts", server)

write("scripts/create-staff.ts", find("// backend/scripts/create-staff.ts"))
write("scripts/import-customers.ts", find("// backend/scripts/import-customers.ts"))
write("fe/lib/http.ts", (repo / "frontend/src/lib/http.ts").read_text() + "\n" +
     find("// frontend/src/lib/http.ts — next to api()") + "\n" +
     find("// frontend/src/lib/http.ts — add beside getToken/setToken"))
write("fe/lib/supabaseAuth.ts", find("// frontend/src/lib/supabaseAuth.ts"))
write("fe/components/GoogleSignInButton.tsx", find("// frontend/src/components/GoogleSignInButton.tsx"))
write("fe/components/AuthSessionBridge.tsx", find("// frontend/src/components/AuthSessionBridge.tsx"))
write("fe/app/auth/callback/page.tsx", find("// frontend/src/app/auth/callback/page.tsx"))
write("fe/admin/liveQueue.ts", find("// frontend/src/admin/liveQueue.ts"))
write("fe/lib/supabasePublic.ts", find("// frontend/src/lib/supabasePublic.ts"))
write("fe/admin/orders-view.tsx", '''import { useEffect, useState } from "react";
import { getStaffToken } from "../lib/http";
import { chime, watchNewOrders } from "./liveQueue";
declare function refresh(): Promise<void>;
export function OrdersViewQueue() {
  const [, setUnseen] = useState(0);
''' + find("// in OrdersView") + '''
  return null;
}
''')
write("tsconfig.json", '''{
  "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true, "noEmit": true, "jsx": "react-jsx",
    "baseUrl": ".", "paths": { "@/*": ["fe/*"] },
    "lib": ["ES2022", "DOM"], "types": ["node"] },
  "include": ["src", "scripts", "fe"]
}
''')
print("wrote", root)
