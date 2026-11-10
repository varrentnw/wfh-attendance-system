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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    throw new ApiError(response.status, await readErrorMessages(response));
  }

  return (await response.json()) as T;
}

async function readErrorMessages(response: Response): Promise<string[]> {
  try {
    const errorBody = (await response.json()) as ApiErrorBody;
    return Array.isArray(errorBody.message) ? errorBody.message : [errorBody.message];
  } catch {
    // Not every error response is our JSON shape (for example a proxy's HTML error page).
    return [response.statusText || `Request failed with status ${response.status}`];
  }
}