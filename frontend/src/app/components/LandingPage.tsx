import { Sprout, ShieldCheck, Leaf, Truck, Search, CreditCard, Package, ArrowRight, ChevronRight, Users, ShoppingBasket, BarChart3, HardHat } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h1>
                <p className="text-xs text-gray-500">Farm to Table</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-sm text-gray-600 hover:text-green-600 transition-colors">Home</a>
              <a href="#features" className="text-sm text-gray-600 hover:text-green-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-green-600 transition-colors">How It Works</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-green-600 transition-colors">About</a>
            </nav>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-all duration-200"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-sm text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm mb-6">
              <Leaf className="w-4 h-4" />
              <span>Trusted by 10,000+ farmers</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Fresh from <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">Farm</span> to You
            </h1>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              Buy fresh produce, hire skilled farm workers, and manage your agricultural operations — all in one platform.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              A complete farm ecosystem connecting buyers, farmers, and laborers.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/app?tab=marketplace')}
                className="flex items-center space-x-2 px-6 py-3 text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:brightness-110 transition-all duration-200"
              >
                <ShoppingBasket className="w-4 h-4" />
                <span>Start Buying</span>
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex items-center space-x-2 px-6 py-3 text-green-600 border border-green-200 rounded-xl hover:bg-green-50 hover:shadow-md transition-all duration-200"
              >
                <Sprout className="w-4 h-4" />
                <span>Become a Seller</span>
              </button>
              <button
                onClick={() => navigate('/app?tab=labor')}
                className="flex items-center space-x-2 px-6 py-3 text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 hover:shadow-md transition-all duration-200"
              >
                <HardHat className="w-4 h-4" />
                <span>Hire Workers</span>
              </button>
            </div>

            {/* Clarity statement */}
            <div className="flex flex-wrap items-center gap-5 mt-8 py-4 px-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="text-lg">🌾</span>
                <span>Sell Crops</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="text-lg">👷</span>
                <span>Hire Workers</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="text-lg">📊</span>
                <span>Manage Operations</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 mt-8">
              <div>
                <p className="text-2xl font-bold text-gray-900">2.5K+</p>
                <p className="text-sm text-gray-500">Active Farmers</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-gray-900">15K+</p>
                <p className="text-sm text-gray-500">Products Listed</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-gray-900">98%</p>
                <p className="text-sm text-gray-500">Satisfaction</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-green-200/50 to-green-300/30 rounded-3xl blur-2xl" />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1773319825721-2b1d96676a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtJTIwZmllbGQlMjBjcm9wcyUyMGFlcmlhbCUyMGdyZWVufGVufDF8fHx8MTc3MzgyNDA0NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Fresh farm produce"
              className="relative w-full h-80 md:h-[420px] object-cover rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Choose AgriHub?</h2>
          <p className="text-gray-600 max-w-xl mx-auto">Everything you need to buy, sell, and manage agricultural operations in one place.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, title: 'Verified Farmers & Workers', desc: 'All users are verified to ensure trust and quality across the platform.', color: 'from-green-500 to-green-600' },
            { icon: CreditCard, title: 'Secure Escrow Payments', desc: 'Payments are held securely until orders and services are completed.', color: 'from-blue-500 to-blue-600' },
            { icon: HardHat, title: 'Hire Skilled Labor', desc: 'Easily find and book experienced agricultural workers on demand.', color: 'from-orange-500 to-orange-600' },
            { icon: Package, title: 'Farm-to-Consumer Marketplace', desc: 'Buy and sell fresh agricultural products directly — no middlemen.', color: 'from-emerald-500 to-emerald-600' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-600 max-w-xl mx-auto">Get started in three simple steps.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: Search, title: 'Browse Products', desc: 'Explore thousands of fresh products from verified local farmers.' },
            { step: '02', icon: CreditCard, title: 'Secure Payment', desc: 'Pay safely with our escrow system. Funds released on delivery.' },
            { step: '03', icon: Package, title: 'Get Delivered', desc: 'Receive fresh produce at your doorstep with real-time tracking.' },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center relative hover:shadow-md transition-all duration-300">
              <span className="absolute top-4 right-4 text-4xl font-bold text-gray-100">{item.step}</span>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 mx-auto mb-5">
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-10 md:p-16 text-center shadow-xl shadow-green-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Farm?</h2>
          <p className="text-green-100 mb-8 max-w-lg mx-auto">Join thousands of farmers already using AgriHub to grow their business.</p>
          <button
            onClick={() => navigate('/app')}
            className="px-8 py-3 bg-white text-green-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-white/80 backdrop-blur-lg border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; 2026 AgriHub. Empowering farmers with technology.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Support</a>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
