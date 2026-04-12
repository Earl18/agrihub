import { useState } from 'react';
import { Search, Filter, ShoppingCart, Plus } from 'lucide-react';

interface MarketplaceProps {
  onAddToCart: (product: any) => void;
}

export function Marketplace({ onAddToCart }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'seeds', 'fertilizer', 'grains', 'vegetables', 'fruits', 'equipment'];

  const products = [
    { id: 1, name: 'Organic Wheat Seeds', category: 'seeds', price: 45, unit: 'kg', seller: 'Green Farms Co.', rating: 4.5, stock: 500, image: '🌾' },
    { id: 2, name: 'NPK Fertilizer', category: 'fertilizer', price: 35, unit: 'kg', seller: 'AgriChem Ltd.', rating: 4.8, stock: 1000, image: '🧪' },
    { id: 3, name: 'Premium Rice', category: 'grains', price: 60, unit: 'kg', seller: 'Valley Harvest', rating: 4.7, stock: 800, image: '🌾' },
    { id: 4, name: 'Fresh Tomatoes', category: 'vegetables', price: 25, unit: 'kg', seller: 'Sunrise Farms', rating: 4.6, stock: 200, image: '🍅' },
    { id: 5, name: 'Organic Apples', category: 'fruits', price: 80, unit: 'kg', seller: 'Orchard Valley', rating: 4.9, stock: 150, image: '🍎' },
    { id: 6, name: 'Corn Seeds (Hybrid)', category: 'seeds', price: 55, unit: 'kg', seller: 'Seed Masters', rating: 4.4, stock: 300, image: '🌽' },
    { id: 7, name: 'Organic Compost', category: 'fertilizer', price: 20, unit: 'kg', seller: 'EcoGrow', rating: 4.5, stock: 600, image: '♻️' },
    { id: 8, name: 'Fresh Potatoes', category: 'vegetables', price: 30, unit: 'kg', seller: 'Farmland Co.', rating: 4.3, stock: 400, image: '🥔' },
  ];

  const myListings = [
    { id: 1, name: 'Organic Wheat', quantity: 1000, price: 55, unit: 'kg', status: 'active', views: 45, orders: 8 },
    { id: 2, name: 'Fresh Carrots', quantity: 200, price: 28, unit: 'kg', status: 'active', views: 23, orders: 3 },
    { id: 3, name: 'Barley Grain', quantity: 500, price: 42, unit: 'kg', status: 'sold out', views: 67, orders: 15 },
  ];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm p-2 flex space-x-2 border border-gray-100">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium ${
            activeTab === 'buy' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Buy Products
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium ${
            activeTab === 'sell' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          My Listings
        </button>
      </div>

      {activeTab === 'buy' ? (
        <>
          {/* Search and Filter */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <button className="px-6 py-3 border border-gray-200 rounded-xl flex items-center space-x-2 hover:bg-gray-50 transition-all">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Filters</span>
              </button>
            </div>

            {/* Category Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/30'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                <div className="p-6">
                  <div className="text-6xl text-center mb-4 group-hover:scale-110 transition-transform duration-300">{product.image}</div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{product.seller}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">${product.price}</p>
                      <p className="text-xs text-gray-500">per {product.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{product.stock} {product.unit}</p>
                      <p className="text-xs text-gray-500">in stock</p>
                    </div>
                  </div>
                  <div className="flex items-center mb-4">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm ml-1 font-medium text-gray-700">{product.rating}</span>
                  </div>
                  <button 
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 flex items-center justify-center space-x-2 font-medium">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* My Listings */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">My Product Listings</h3>
              <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 flex items-center space-x-2 font-medium">
                <Plus className="w-4 h-4" />
                <span>New Listing</span>
              </button>
            </div>

            <div className="space-y-4">
              {myListings.map((listing) => (
                <div key={listing.id} className="border border-gray-100 rounded-xl p-6 hover:border-green-500 hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg text-gray-900">{listing.name}</h4>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {listing.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Quantity: {listing.quantity} {listing.unit}</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mt-2">${listing.price}/{listing.unit}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900">{listing.views}</p>
                        <p className="text-xs text-gray-500">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-600">{listing.orders}</p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                      <button className="px-6 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}