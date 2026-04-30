const DEFAULT_FALLBACK = '₱0.00';

function parseCurrencyValue(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function formatPhpCurrency(
  value: number | string | null | undefined,
  {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = DEFAULT_FALLBACK,
  }: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
  } = {},
) {
  const parsed = parseCurrencyValue(value);

  if (parsed === null) {
    return fallback;
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(parsed);
}

export function formatPhpRate(
  value: number | string | null | undefined,
  unit = 'hour',
  {
    shortHour = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = 'Rate unavailable',
  }: {
    shortHour?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
  } = {},
) {
  const parsed = parseCurrencyValue(value);

  if (parsed === null) {
    return fallback;
  }

  const unitLabel = shortHour && unit === 'hour' ? 'hr' : unit;

  return `${formatPhpCurrency(parsed, {
    minimumFractionDigits,
    maximumFractionDigits,
    fallback,
  })}/${unitLabel}`;
}
