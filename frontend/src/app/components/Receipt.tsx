import { X, Download, Printer, CheckCircle } from 'lucide-react';

export interface ReceiptData {
  id: string;
  type: 'purchase' | 'sale' | 'service' | 'labor';
  date: string;
  time: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping?: number;
  total: number;
  paymentMethod: string;
  seller?: string;
  buyer?: string;
  provider?: string;
}

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function Receipt({ isOpen, onClose, receipt }: ReceiptProps) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real app, this would generate a PDF
    alert('Receipt downloaded! (PDF generation would happen here)');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/30 z-50 flex items-center justify-center p-4 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Receipt Modal */}
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Transaction Successful!</h2>
                  <p className="text-green-100 text-sm mt-1">Receipt #{receipt.id}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-8">
            {/* Business Header */}
            <div className="text-center mb-8 pb-8 border-b border-gray-100">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h3>
              <p className="text-sm text-gray-600 mt-1">Complete Farm Management Platform</p>
              <p className="text-sm text-gray-500 mt-1">www.agrihub.com | support@agrihub.com</p>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Receipt ID</p>
                <p className="font-semibold text-gray-900">{receipt.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Transaction Type</p>
                <p className="font-semibold text-gray-900 capitalize">{receipt.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{receipt.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time</p>
                <p className="font-semibold text-gray-900">{receipt.time}</p>
              </div>
              {receipt.seller && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Seller</p>
                  <p className="font-semibold text-gray-900">{receipt.seller}</p>
                </div>
              )}
              {receipt.buyer && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Buyer</p>
                  <p className="font-semibold text-gray-900">{receipt.buyer}</p>
                </div>
              )}
              {receipt.provider && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Service Provider</p>
                  <p className="font-semibold text-gray-900">{receipt.provider}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900">{receipt.paymentMethod}</p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-8">
              <h4 className="font-semibold mb-4 text-gray-900">Items</h4>
              <div className="bg-gray-50 rounded-2xl p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-700">Qty</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700">Price</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-gray-900">{item.name}</td>
                        <td className="text-center py-3 text-gray-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="text-right py-3 text-gray-600">${item.price.toFixed(2)}</td>
                        <td className="text-right py-3 font-semibold text-gray-900">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 mb-8 pb-8 border-b border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">${receipt.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="font-semibold text-gray-900">${receipt.tax.toFixed(2)}</span>
              </div>
              {receipt.shipping !== undefined && receipt.shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-gray-900">${receipt.shipping.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">${receipt.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 mb-8">
              <p>Thank you for your business!</p>
              <p className="mt-1">For support, contact us at support@agrihub.com</p>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={handlePrint}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
              >
                <Printer className="w-5 h-5" />
                <span>Print</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
              >
                <Download className="w-5 h-5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}