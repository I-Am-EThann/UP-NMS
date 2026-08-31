// Direct connection to the NestJS backend (not proxied through Next.js).
// Both apps share the "localhost" host in local dev, so the backend's
// httpOnly auth cookie (set on port 3001) is automatically sent along with
// requests to the frontend's own server on port 3000 too — cookies are
// scoped by host, never by port. In production, put both behind the same
// registrable domain (or set an explicit shared Cookie `Domain`) so this
// keeps working across subdomains.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
