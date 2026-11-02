# Kuopio Bites — Frontend

Next.js + TypeScript + Tailwind + Framer Motion. Renders UI only: **no business logic,
no database access, no secrets**. All real data flows through the typed client in
`src/lib/api.ts` → `src/lib/http.ts`. In the browser, `fetch` uses same-origin `/api`
(cookies stay on www). `NEXT_PUBLIC_API_BASE_URL` is the Express origin for Next
rewrites (`next.config.mjs`) and for `apiBase()` when `window` is undefined.

## Run
```
npm install
cp .env.example .env   # rewrite target for Next (see next.config.mjs)
npm run dev            # :3000
```

## Rules of this codebase
- Prices shown always come from `POST /api/cart/price` (server is the price authority).
- Auth = HttpOnly cookies from `POST /api/auth/*` (CSRF on mutations). Customer sessions grant zero admin rights.
- Menu/categories/settings/translations hydrate from the backend at boot
  (bundled `lib/menu.ts` remains only as an offline first-paint fallback).
