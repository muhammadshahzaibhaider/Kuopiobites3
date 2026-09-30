# Kuopio Bites — Frontend

Next.js + TypeScript + Tailwind + Framer Motion. Renders UI only: **no business logic,
no database access, no secrets**. All real data flows through the typed client in
`src/lib/api.ts` → `src/lib/http.ts`, which targets `NEXT_PUBLIC_API_BASE_URL`
(single configurable origin; in the sandbox preview the client derives the sibling
`4000-…` host from `window.location` when the env var is unset).

## Run
```
npm install
cp .env.example .env   # point at your backend
npm run dev            # :3000
```

## Rules of this codebase
- Prices shown always come from `POST /api/cart/price` (server is the price authority).
- Auth = scoped bearer JWTs from `POST /api/auth/*`; customer tokens grant zero admin rights.
- Menu/categories/settings/translations hydrate from the backend at boot
  (bundled `lib/menu.ts` remains only as an offline first-paint fallback).
