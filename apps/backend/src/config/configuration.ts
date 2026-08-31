export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  cookieSecure: boolean;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: {
    url: string;
  };
  influx: {
    url: string;
    token: string;
    org: string;
    bucket: string;
  };
  minio: {
    endpoint: string;
    publicEndpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  snmp: {
    /** "mock" (default, no real devices needed) or "real" */
    provider: 'mock' | 'real';
    community: string;
    pollIntervalMs: number;
  };
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  // Controls the auth cookie's `Secure` attribute — browsers silently
  // refuse to store a cookie marked Secure unless the page was loaded over
  // HTTPS, so this must be false for any deployment served over plain HTTP
  // (confirmed to break login this way on a real VM: the login API call
  // itself succeeds and returns a valid Set-Cookie header — curl doesn't
  // enforce this rule and will happily show it — but a real browser drops
  // the cookie immediately, so the person is silently never actually
  // logged in). Previously this was hardcoded to `NODE_ENV === 'production'`,
  // which is wrong for any production deployment that doesn't sit behind
  // HTTPS (e.g. no Nginx/TLS reverse proxy set up yet) — default here
  // matches that old behavior for anyone who doesn't set COOKIE_SECURE
  // explicitly, but it's now independently overridable.
  cookieSecure:
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev-only-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  database: {
    url: requireEnv(
      'DATABASE_URL',
      'postgresql://upnms:upnms@localhost:5432/upnms',
    ),
  },
  influx: {
    url: process.env.INFLUX_URL ?? 'http://localhost:8086',
    token: process.env.INFLUX_TOKEN ?? '',
    org: process.env.INFLUX_ORG ?? 'upnms',
    bucket: process.env.INFLUX_BUCKET ?? 'device_metrics',
  },
  minio: {
    // Used by the backend's own S3 client to actually connect — must be a
    // hostname the BACKEND CONTAINER can resolve. Inside Docker Compose
    // that's the service name ("minio"), never "localhost" (which always
    // means "this container itself", so backend would try to connect to
    // its own loopback and fail with ECONNREFUSED — this bit us in
    // practice, see MINIO_PUBLIC_ENDPOINT below for the actual fix).
    endpoint: process.env.MINIO_ENDPOINT ?? 'minio',
    // Used only to build the public <img src> URLs the BROWSER loads —
    // must be a hostname the browser can resolve (localhost for local dev,
    // the server's real IP/domain in production). Falls back to `endpoint`
    // for backward compatibility, but that fallback is only correct when
    // endpoint itself already happens to be browser-reachable.
    publicEndpoint:
      process.env.MINIO_PUBLIC_ENDPOINT ??
      process.env.MINIO_ENDPOINT ??
      'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'upnms',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'upnms-secret',
    bucket: process.env.MINIO_BUCKET ?? 'device-images',
  },
  snmp: {
    provider: (process.env.SNMP_PROVIDER as 'mock' | 'real') ?? 'mock',
    community: process.env.SNMP_COMMUNITY ?? 'public',
    pollIntervalMs: parseInt(process.env.SNMP_POLL_INTERVAL_MS ?? '300000', 10),
  },
});
