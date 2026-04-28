import { useEffect, useState } from 'react';
import { Search, Filter, ShoppingCart, Plus } from 'lucide-react';
import { getMarketplaceData } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';

interface MarketplaceProps {
  onAddToCart: (product: any) => void;
  currentUser: SessionUser | null;
}

export function Marketplace({ onAddToCart, currentUser }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [canManageListings, setCanManageListings] = useState(false);

  const categories = ['all', 'seeds', 'fertilizer', 'grains', 'vegetables', 'fruits', 'equipment'];
  const isSeller = currentUser?.roles?.includes('seller') || canManageListings;
  const isCommerciallyRestricted = currentUser?.canManageCommercialFeatures === false;

  useEffect(() => {
    getMarketplaceData()
      .then((payload) => {
        setProducts(payload.products || []);
        setMyListings(payload.myListings || []);
        setCanManageListings(Boolean(payload.canManageListings));
      })
      .catch(() => undefined);
  }, []);

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((product) => product.category === selectedCategory);

  return (
    <div className="space-y-6">
      {isCommerciallyRestricted && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Your account is currently restricted. Marketplace selling tools are disabled until an admin clears the penalty.
        </div>
      )}
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
          onClick={() => isSeller && !isCommerciallyRestricted && setActiveTab('sell')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium ${
            activeTab === 'sell' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
          } ${!isSeller || isCommerciallyRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          My Listings
        </button>
      </div>

      {activeTab === 'buy' ? (
        <>
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
                    <span className="text-yellow-400">?</span>
                    <span className="text-sm ml-1 font-medium text-gray-700">{product.rating}</span>
                  </div>
                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          {!isSeller && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              Buyer is the default account. Apply as a seller in your profile verification to unlock listing tools.
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">My Product Listings</h3>
            <button
              disabled={!isSeller || isCommerciallyRestricted}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>New Listing</span>
            </button>
          </div>

          <div className="space-y-4">
            {isSeller && myListings.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                Seller verification is active. You can now add listings from this dashboard.
              </div>
            )}
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
      )}
    </div>
  );
}
