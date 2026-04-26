import { useEffect, useRef, useState } from 'react';
import { Sprout, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  getGoogleAuthConfig,
  loginUser,
  loginWithGoogle,
} from '../../features/auth/api';
import { persistSession } from '../../shared/auth/session';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    let isMounted = true;

    getGoogleAuthConfig()
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        if (payload?.enabled && typeof payload?.clientId === 'string') {
          setGoogleClientId(payload.clientId.trim());
        }
      })
      .catch(() => {
        if (isMounted) {
          setGoogleClientId('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setErrorMessage('');
          setIsLoading(true);

          try {
            const response = await loginWithGoogle(credential);
            persistSession(response.token, response.user);

            const redirectTarget = searchParams.get('redirect');
            const isAdmin =
              response.user.email.toLowerCase() === 'admin@agrihub.com';
            navigate(redirectTarget || (isAdmin ? '/admin' : '/app'));
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Google sign-in failed. Please try again.',
            );
          } finally {
            setIsLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 360,
      });
    };

    const existingScript = document.querySelector(
      'script[data-google-identity="true"]',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  }, [googleClientId, navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await loginUser(email, password);
      persistSession(response.token, response.user);

      const redirectTarget = searchParams.get('redirect');
      const isAdmin = response.user.email.toLowerCase() === 'admin@agrihub.com';
      navigate(redirectTarget || (isAdmin ? '/admin' : '/app'));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in right now.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex">
      {/* Left — Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-green-800/90 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1755353545133-9a8956d1b0ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjBncmVlbmhvdXNlJTIwdmVnZXRhYmxlcyUyMG9yZ2FuaWN8ZW58MXx8fHwxNzczODI0ODYyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Farmer in greenhouse"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          {/* Top logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AgriHub</span>
          </div>

          {/* Center content */}
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Grow your business with smarter farming
            </h2>
            <p className="text-green-100 leading-relaxed">
              Join thousands of farmers who manage their marketplace, labor, and services — all in one place.
            </p>
            <div className="flex items-center space-x-8 mt-10">
              <div>
                <p className="text-2xl font-bold text-white">2.5K+</p>
                <p className="text-sm text-green-200">Farmers</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">15K+</p>
                <p className="text-sm text-green-200">Products</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">98%</p>
                <p className="text-sm text-green-200">Satisfaction</p>
              </div>
            </div>
          </div>

          {/* Bottom testimonial */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md">
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              "AgriHub transformed the way I sell my produce. I went from local markets to nationwide delivery in just weeks."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">MR</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Maria Rodriguez</p>
                <p className="text-xs text-green-200">Organic Farmer, Texas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-10 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h1>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
              <p className="text-sm text-gray-500">Login to your AgriHub account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Email or Phone</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-green-600 hover:text-green-700 transition-colors">
                  Forgot Password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-4 text-xs text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google Button */}
            {googleClientId ? (
              <div className="flex justify-center">
                <div ref={googleButtonRef} className="w-full flex justify-center" />
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
              >
                Add `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in
              </button>
            )}
            {!googleClientId ? (
              <p className="mt-2 text-center text-xs text-gray-400">
                Add `GOOGLE_CLIENT_ID` to `backend/.env` to enable Google sign-in.
              </p>
            ) : null}

            {/* Register link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Register
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            &copy; 2026 AgriHub. Empowering farmers with technology.
          </p>
        </div>
      </div>
    </div>
  );
}
