# Phase 2.3 — Frontend API Integration

## Environment Variable Strategy

| Variable | Where set | Value (local) | Value (Choreo) |
|----------|-----------|--------------|---------------|
| `NEXT_PUBLIC_GATEWAY_URL` | `.env.local` / Choreo secret | `https://localhost` | `https://<choreo-nginx-url>/pqc-migration-digital-twi/nginx/v1.0` |

`NEXT_PUBLIC_` prefix makes it available in the browser bundle.
Never put secrets (tokens) in `NEXT_PUBLIC_` vars.

## API Client (`src/web/lib/api.ts`)

Single typed client wrapping all 6 backend endpoints:

| Function | Method | Path | Backend |
|----------|--------|------|---------|
| `getAssets()` | GET | `/api/v1/assets` | go-services |
| `runDiscovery(req)` | POST | `/api/v1/discovery` | go-services |
| `getRiskScore(req)` | POST | `/api/v1/risk` | rust-risk (via go) |
| `getRiskBacklog(req)` | POST | `/api/v1/risk/backlog` | rust-risk (via go) |
| `generateProof(req)` | POST | `/api/v1/proof` | rust-risk (via go) |
| `getQasm(req)` | POST | `/api/v1/qasm` | python-services (via go) |

All functions:
- Accept an optional `AbortSignal` for cancellation
- Return typed responses
- Throw `ApiError` with `.status` and `.message` on non-2xx

## Data Flow in Next.js 14 App Router

Dashboard page is a **Server Component**. It fetches data at render time:

```typescript
// app/page.tsx
import { getAssets, getRiskScore } from '../lib/api';

export default async function DashboardPage() {
  const [assets, risk] = await Promise.allSettled([
    getAssets(),
    getRiskScore({ total_assets: 100, quantum_vulnerable_assets: 40 }),
  ]);
  // use fulfilled values or fall back to static data
}
```

Benefits:
- No client-side loading states needed for initial render
- API URL is server-side only (doesn't expose gateway URL in browser JS for server calls)
- Static fallback data if API is unreachable (graceful degradation)

## next.config.mjs Rewrites

For local dev without CORS hassle, Next.js can proxy API calls:

```javascript
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: `${process.env.GATEWAY_URL}/api/:path*`,
  },
],
```

`GATEWAY_URL` (no `NEXT_PUBLIC_`) is server-only, used by the dev rewrite proxy.
In production the browser calls the Choreo URL directly.

## Graceful Degradation Pattern

```typescript
async function fetchOrFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!process.env.NEXT_PUBLIC_GATEWAY_URL) return fallback;
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}
```

Static data in `page.tsx` becomes the fallback, so the dashboard always renders.
