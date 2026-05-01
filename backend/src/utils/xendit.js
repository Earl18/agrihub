const XENDIT_API_BASE_URL = process.env.XENDIT_API_BASE_URL || 'https://api.xendit.co';

function getXenditSecretKey() {
  return String(process.env.XENDIT_SECRET_KEY || '').trim();
}

function getXenditCallbackToken() {
  return String(process.env.XENDIT_WEBHOOK_CALLBACK_TOKEN || '').trim();
}

function createAuthorizationHeader(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function xenditRequest(path, options = {}) {
  const secretKey = getXenditSecretKey();

  if (!secretKey) {
    throw new Error('Xendit secret key is not configured.');
  }

  const response = await fetch(`${XENDIT_API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: createAuthorizationHeader(secretKey),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error_code || 'Xendit request failed.');
  }

  return data;
}

export function mapLaborPaymentMethodToXendit(paymentMethod) {
  const normalized = String(paymentMethod || '').trim().toLowerCase();

  if (normalized === 'gcash') {
    return 'GCASH';
  }

  if (normalized === 'maya' || normalized === 'paymaya') {
    return 'PAYMAYA';
  }

  return 'CREDIT_CARD';
}

export async function createXenditInvoice(payload) {
  return xenditRequest('/v2/invoices', {
    method: 'POST',
    body: payload,
  });
}

export function verifyXenditCallbackToken(receivedToken) {
  const expectedToken = getXenditCallbackToken();

  if (!expectedToken) {
    throw new Error('Xendit webhook callback token is not configured.');
  }

  return String(receivedToken || '').trim() === expectedToken;
}
