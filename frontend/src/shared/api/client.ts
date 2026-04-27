const defaultBaseUrl = 'http://localhost:8000/api/v1';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || defaultBaseUrl;

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { headers, body, ...init }: ApiOptions = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('agrihub_token') : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawMessage =
      typeof payload?.message === 'string'
        ? payload.message
        : 'Something went wrong while contacting the server.';
    const message =
      rawMessage.startsWith('Route not found:')
        ? 'This feature is not available right now. Please try again in a moment.'
        : rawMessage;
    throw new Error(message);
  }

  return payload as T;
}
