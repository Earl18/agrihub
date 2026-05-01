import { useState } from 'react';
import { CreditCard, Smartphone, Wallet, X } from 'lucide-react';
import { createLaborPaymentCheckout } from '../../features/app/api';
import { formatPhpCurrency } from '../../shared/format/currency';

interface LaborPaymentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDraft: any | null;
  worker: any | null;
}

const paymentOptions = [
  {
    id: 'gcash' as const,
    label: 'GCash',
    description: 'Pay securely with your GCash wallet.',
    icon: Wallet,
  },
  {
    id: 'maya' as const,
    label: 'Maya',
    description: 'Use your Maya wallet for labor booking checkout.',
    icon: Smartphone,
  },
  {
    id: 'card' as const,
    label: 'Credit or Debit Card',
    description: 'Complete the payment using a secure card checkout page.',
    icon: CreditCard,
  },
];

export function LaborPaymentDashboard({
  isOpen,
  onClose,
  bookingDraft,
  worker,
}: LaborPaymentDashboardProps) {
  const [selectedMethod, setSelectedMethod] = useState<'gcash' | 'maya' | 'card'>('gcash');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !bookingDraft || !worker) {
    return null;
  }

  const rate = Number(worker.rate || worker.price || 0);
  const durationHours = Number.parseInt(String(bookingDraft.duration || ''), 10) || 0;
  const subtotal = rate * durationHours;
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleContinueToCheckout = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const response = await createLaborPaymentCheckout({
        workerId: worker.workerId,
        workerType: worker.type,
        date: bookingDraft.date,
        time: bookingDraft.time,
        duration: bookingDraft.duration,
        location: bookingDraft.location,
        paymentMethod: selectedMethod,
      });

      if (!response.checkoutUrl) {
        throw new Error('Xendit did not return a checkout link for this labor payment.');
      }

      window.location.href = response.checkoutUrl;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start the Xendit checkout right now.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6">
      <button
        type="button"
        aria-label="Close labor payment dashboard"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="rounded-t-3xl bg-gradient-to-r from-green-600 to-green-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-100">Secure Labor Payment</p>
              <h3 className="mt-2 text-2xl font-semibold">Choose a payment method</h3>
              <p className="mt-1 text-sm text-green-50">
                Your payment is held securely and is only marked ready for release after both client and laborer confirm completion.
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
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Laborer</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{worker.name}</p>
              <p className="mt-1 text-sm text-gray-600">{worker.type}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Work schedule</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {bookingDraft.date} at {bookingDraft.time}
              </p>
              <p className="mt-1 text-sm text-gray-600">{bookingDraft.duration}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedMethod === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedMethod(option.id)}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors ${
                    isSelected
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/50'
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                    <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300'}`} />
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/70 p-5">
            <h4 className="text-sm font-semibold text-gray-900">Payment summary</h4>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Labor subtotal</span>
                <span className="font-medium text-gray-900">{formatPhpCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="font-medium text-gray-900">{formatPhpCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-green-100 pt-3">
                <span className="font-semibold text-gray-900">Total to pay</span>
                <span className="text-xl font-bold text-green-700">{formatPhpCurrency(total)}</span>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleContinueToCheckout}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {submitting ? 'Opening Xendit...' : 'Continue to Secure Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
