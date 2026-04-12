const defaultBaseUrl = 'http://localhost:5000/api/v1';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || defaultBaseUrl;

type ApiOptions = RequestInit & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { headers, body, ...init }: ApiOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : 'Something went wrong while contacting the server.';
    throw new Error(message);
  }

  return payload as T;
}
