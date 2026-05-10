/** @type {import('next').NextConfig} */
const gatewayUrl = process.env.GATEWAY_URL ?? 'http://localhost:8080';

/** Strip path/query from gateway URL so CSP connect-src gets an origin only. */
function gatewayOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

const publicGateway = gatewayOrigin(process.env.NEXT_PUBLIC_GATEWAY_URL ?? '');
const serverGateway = gatewayOrigin(process.env.GATEWAY_URL ?? '');

const connectParts = [
  "'self'",
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://localhost',
  'https://*.choreoapis.dev',
];

if (publicGateway) connectParts.push(publicGateway);
if (serverGateway && serverGateway !== publicGateway) connectParts.push(serverGateway);

const contentSecurityPolicy = [
  "default-src 'self'",
  // unsafe-inline: Next.js hydration / styled paths
  // blob: required for some Three.js / Web Worker handshakes
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  `connect-src ${connectParts.join(' ')}`,
  "font-src 'self' https://fonts.gstatic.com",
  // React Three Fiber / WebGL often spawn workers from blob: URLs
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
];

const nextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
