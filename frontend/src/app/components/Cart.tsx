import { Minus, Plus, Trash2, ShoppingCart, X } from 'lucide-react';
import { useState } from 'react';
import { formatPhpCurrency, formatPhpRate } from '../../shared/format/currency';

export interface CartItem {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  seller: string;
  quantity: number;
  image: string;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemoveItem: (id: number) => void;
  onCheckout: () => void;
}

export function Cart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartProps) {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const shipping = items.length > 0 ? 15 : 0;
  const total = subtotal + tax + shipping;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/30 z-40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Cart Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[28rem] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Shopping Cart</h2>
              <p className="text-xs text-green-100">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-600">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add some products to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{item.image}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.seller}</p>
                      <p className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mt-1">
                        {formatPhpRate(item.price, item.unit, { shortHour: true })}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-2 bg-gray-50 rounded-xl p-1">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-2 hover:bg-white rounded-lg transition-all"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-center bg-transparent border-none focus:outline-none font-medium text-gray-900"
                            min="1"
                          />
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-white rounded-lg transition-all"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        Subtotal: <span className="font-semibold text-gray-900">{formatPhpCurrency(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPhpCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="font-semibold text-gray-900">{formatPhpCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-gray-900">{formatPhpCurrency(shipping)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">{formatPhpCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 font-semibold"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
