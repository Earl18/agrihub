import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CreditCard, Smartphone, Wallet, X } from 'lucide-react';
import { getWalletSummary, requestWalletCashOut } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';
import { formatPhpCurrency } from '../../shared/format/currency';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUser: SessionUser | null;
  onUserUpdated: (user: any) => void;
}

const cashOutOptions = [
  { id: 'gcash' as const, label: 'GCash', icon: Wallet },
  { id: 'paymaya' as const, label: 'PayMaya', icon: Smartphone },
  { id: 'card' as const, label: 'Card', icon: CreditCard },
];

function detectCardBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '');

  if (/^4/.test(digits)) {
    return 'Visa';
  }

  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(digits)) {
    return 'American Express';
  }

  if (/^6(?:011|5)/.test(digits)) {
    return 'Discover';
  }

  return '';
}

function formatCardNumber(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '').slice(0, 19);
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

function formatExpiry(expiry: string) {
  const digits = expiry.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidLuhn(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length < 13) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isValidExpiry(expiry: string) {
  const normalized = expiry.replace(/\D/g, '');

  if (normalized.length !== 4) {
    return false;
  }

  const month = Number(normalized.slice(0, 2));
  const year = Number(normalized.slice(2));

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) {
    return false;
  }

  if (year === currentYear && month < currentMonth) {
    return false;
  }

  return true;
}

export function WalletModal({ isOpen, onClose, sessionUser, onUserUpdated }: WalletModalProps) {
  const [wallet, setWallet] = useState<any>(sessionUser?.wallet || null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'gcash' | 'paymaya' | 'card'>('gcash');
  const [accountName, setAccountName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !sessionUser) {
      return;
    }

    setWallet(sessionUser.wallet || null);
    setLoading(true);
    setMessage(null);

    getWalletSummary()
      .then((response) => {
        setWallet(response.wallet || null);
      })
      .catch((error) => {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Unable to load wallet details right now.',
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen, sessionUser]);

  const detectedCardBrand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);

  if (!isOpen || !sessionUser) {
    return null;
  }

  const balance = Number(wallet?.balance || 0);
  const totalEarned = Number(wallet?.totalEarned || 0);
  const totalWithdrawn = Number(wallet?.totalWithdrawn || 0);
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions.slice(0, 5) : [];
  const cardLast4 = cardNumber.replace(/\D/g, '').slice(-4);

  const resetCashOutFields = () => {
    setAmount('');
    setAccountName('');
    setMobileNumber('');
    setCardholderName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  const validateCardFields = () => {
    if (!cardholderName.trim()) {
      return 'Cardholder name is required.';
    }

    if (!isValidLuhn(cardNumber)) {
      return 'Enter a valid card number.';
    }

    if (!isValidExpiry(cardExpiry)) {
      return 'Enter a valid expiry date.';
    }

    if (cardCvv.replace(/\D/g, '').length < 3) {
      return 'Enter a valid CVV.';
    }

    return '';
  };

  const handleCashOut = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      if (method === 'card') {
        const validationError = validateCardFields();

        if (validationError) {
          throw new Error(validationError);
        }
      }

      const response = await requestWalletCashOut({
        amount: Number(amount),
        method,
        accountName,
        mobileNumber,
        cardholderName,
        cardBrand: detectedCardBrand || 'Card',
        cardLast4,
      });

      setWallet(response.wallet || null);
      onUserUpdated(response.user);
      setMessage({
        type: 'success',
        text: response.message || 'Wallet cash out completed successfully.',
      });
      resetCashOutFields();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to process the cash out right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6">
      <button type="button" aria-label="Close wallet" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="rounded-t-3xl bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">AgriHub Wallet</p>
              <h3 className="mt-2 text-2xl font-semibold">Your earnings in one place</h3>
              <p className="mt-1 text-sm text-emerald-50">
                Completed labor earnings go here automatically. Cash out anytime to GCash, PayMaya, or card.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/30 p-2 text-white transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
              <p className="text-xs uppercase tracking-wide text-emerald-600">Available Balance</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{formatPhpCurrency(balance)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Earned</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatPhpCurrency(totalEarned)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Cashed Out</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatPhpCurrency(totalWithdrawn)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Cash Out</h4>
                  <p className="mt-1 text-sm text-gray-500">Choose where to send your wallet balance.</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {cashOutOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = method === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMethod(option.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                      <p className="mt-3 text-sm font-semibold text-gray-900">{option.label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {(method === 'gcash' || method === 'paymaya') && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Account Name</label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(event) => setAccountName(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Mobile Number</label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(event) => setMobileNumber(event.target.value)}
                        placeholder="09XXXXXXXXX"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}

                {method === 'card' && (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-5 py-5 text-white shadow-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Cash Out Card</p>
                          <p className="mt-3 text-lg font-semibold">{detectedCardBrand || 'Card'}</p>
                        </div>
                        <CreditCard className="h-8 w-8 text-white/80" />
                      </div>
                      <p className="mt-8 text-2xl tracking-[0.22em]">
                        {formatCardNumber(cardNumber) || '**** **** **** ****'}
                      </p>
                      <div className="mt-8 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Cardholder</p>
                          <p className="mt-1 text-sm font-medium">{cardholderName || 'YOUR NAME'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Expires</p>
                          <p className="mt-1 text-sm font-medium">{cardExpiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(event) => setCardholderName(event.target.value)}
                        placeholder="Name on card"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Card Number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatCardNumber(cardNumber)}
                        onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, '').slice(0, 19))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Expiry</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatExpiry(cardExpiry)}
                          onChange={(event) => setCardExpiry(event.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="MM/YY"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">CVV</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          value={cardCvv}
                          onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="***"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      For safety, only the detected card brand and last 4 digits are sent for this cash-out record.
                    </p>
                  </div>
                )}
              </div>

              {message ? (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                    message.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCashOut}
                  disabled={submitting || loading}
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {submitting ? 'Processing...' : 'Cash Out'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-900">Recent Wallet Activity</h4>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading wallet activity...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-gray-500">No wallet activity yet.</p>
                ) : (
                  transactions.map((transaction: any) => (
                    <div key={transaction.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transaction.description || transaction.type}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {transaction.destinationLabel || transaction.method || 'Wallet'}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold ${transaction.type === 'credit' ? 'text-green-700' : 'text-gray-900'}`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatPhpCurrency(Number(transaction.amount || 0))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
