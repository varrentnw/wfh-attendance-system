import type { ApiErrorBody } from '../types/api';
import { getToken } from '../auth/session';

const BASE_URL: string = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(', '));
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

// The client is plain TypeScript, not a component, so it cannot use the auth context.
// AuthProvider registers a function here, and the client calls it when the server rejects the token.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  const token = getToken();
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    // The browser must write the multipart Content-Type itself, because it includes a generated boundary.
    body = options.body;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (!response.ok) {
    // A 401 on a request that carried a token means the token expired or is invalid.
    // A 401 without a token is a failed login, which the login form reports itself.
    if (response.status === 401 && token !== null) {
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, await readErrorMessages(response));
  }

  return (await response.json()) as T;
}

async function readErrorMessages(response: Response): Promise<string[]> {
  try {
    const errorBody = (await response.json()) as ApiErrorBody;
    return Array.isArray(errorBody.message)
      ? errorBody.message
      : [errorBody.message];
  } catch {
    // Not every error response is our JSON shape (for example a proxy's HTML error page).
    return [
      response.statusText || `Request failed with status ${response.status}`,
    ];
  }
}

/** Turns anything a request can throw into messages that are safe to show the user. */
export function toErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    return error.messages;
  }
  // fetch rejects with a TypeError when no response arrived at all.
  return ['Cannot reach the server. Please try again.'];
}
