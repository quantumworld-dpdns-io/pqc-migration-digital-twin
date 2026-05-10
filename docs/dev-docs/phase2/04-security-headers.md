# Phase 2.4 — Security Headers

## Layers

Security headers are applied at TWO layers intentionally:

1. **nginx** — applied to all API responses (enforces CORS, HSTS, basic headers)
2. **Next.js** — applied to HTML/JS/CSS responses (enforces CSP, frame policies for the UI)

This means the API and the frontend independently enforce security policy.

## nginx Headers (API layer)

Set in the `http {}` block, apply to all upstream responses.

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options           "DENY" always;
add_header X-Content-Type-Options    "nosniff" always;
add_header X-XSS-Protection          "0" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=(), payment=()" always;
```

## Next.js Headers (UI layer)

Set via `headers()` in `next.config.mjs`, applied to all page responses.

### Content Security Policy

```
default-src 'self';
script-src  'self' 'unsafe-inline';     ← Next.js requires unsafe-inline for hydration
style-src   'self' 'unsafe-inline';     ← Tailwind/inline styles
img-src     'self' data:;
connect-src 'self' <GATEWAY_URL>;       ← allow fetch to nginx gateway
font-src    'self';
frame-src   'none';
object-src  'none';
base-uri    'self';
form-action 'self';
```

`unsafe-inline` for scripts is unfortunate but required by Next.js 14 without a nonce.
Phase 3 can add nonce-based CSP using Next.js middleware.

### Full headers block in next.config.mjs

```javascript
{
  source: '/(.*)',
  headers: [
    { key: 'X-Frame-Options',          value: 'DENY' },
    { key: 'X-Content-Type-Options',   value: 'nosniff' },
    { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy',  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' <GATEWAY_URL>; frame-src 'none'; object-src 'none';" },
  ],
},
```

## CORS Policy Detail

nginx applies CORS only for allowed origins (not a wildcard `*`):

- `http://localhost:3000` — local Next.js dev server
- `https://*.choreoapis.dev` — Choreo-hosted frontends
- Production frontend domain (add to map when known)

Preflight (`OPTIONS`) requests return `204 No Content` immediately,
with correct `Access-Control-Allow-*` headers.

## Security Checklist

- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled in nginx ssl_protocols)
- [ ] Cipher suite excludes NULL, RC4, 3DES, EXPORT
- [ ] HSTS preload submitted once production domain is known
- [ ] CSP violations reported via `report-uri` (add in phase 3)
- [ ] `X-Powered-By` header removed from Next.js (`poweredByHeader: false`)
- [ ] Cookies set with `Secure`, `HttpOnly`, `SameSite=Strict` (add when auth added)
