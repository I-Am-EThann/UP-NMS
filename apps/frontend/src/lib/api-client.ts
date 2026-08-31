import { API_BASE_URL } from "./api-config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractMessage(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    body.message
  ) {
    const m = (body as { message: unknown }).message;
    return Array.isArray(m) ? m.join(", ") : String(m);
  }
  return "Request failed";
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Calls the backend directly (not a Next.js API route). Always includes
 * credentials so the httpOnly `up_nms_token` cookie round-trips correctly.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const parsed = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, parsed, extractMessage(parsed));
  }

  return parsed as T;
}
