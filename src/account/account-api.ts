type JsonRecord = Record<string, unknown>;

export class AccountApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "AccountApiError";
    this.code = code;
    this.status = status;
  }
}

export async function accountApi(path: string, init?: RequestInit): Promise<JsonRecord> {
  let response: Response;
  try {
    response = await fetch(`/api/account/${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(init?.body
          ? { "Content-Type": "application/json", "X-NFV-Public-Request": "1" }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new AccountApiError("network_error", 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload && typeof payload === "object" ? (payload as JsonRecord) : {};
    const errors = Array.isArray(body.errors) ? body.errors : [];
    const first = errors[0] && typeof errors[0] === "object" ? (errors[0] as JsonRecord) : {};
    const code = typeof first.code === "string"
      ? first.code
      : typeof body.error === "string"
        ? body.error
        : "request_failed";
    throw new AccountApiError(code, response.status);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AccountApiError("invalid_response", 502);
  }
  return payload as JsonRecord;
}
