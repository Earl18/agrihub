import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, Sprout, User } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  registerUser,
  resendRegistrationCode,
  verifyRegistrationCode,
} from '../../features/auth/api';
import {
  getAuthenticatedHomeRoute,
  getLogoHomeRoute,
  getSessionUser,
  persistSession,
} from '../../shared/auth/session';

type VerificationStep = 'form' | 'verify';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionUser = getSessionUser();
  const [step, setStep] = useState<VerificationStep>('form');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const updatePhone = (value: string) => {
    update('phone', value.replace(/\D/g, '').slice(0, 11));
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'bg-yellow-400', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'bg-green-400', width: '75%' };
    return { label: 'Strong', color: 'bg-green-600', width: '100%' };
  };

  const strength = passwordStrength();
  const passwordsMatch = form.confirmPassword && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;
  const fullName = [form.firstName, form.middleName, form.lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMessage('First name and last name are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (form.phone && !/^09\d{9}$/.test(form.phone.trim())) {
      setErrorMessage('Please enter a valid Philippine mobile number.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser({
        name: fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        profile: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
        },
      });

      setVerificationEmail(response.email);
      setSuccessMessage(response.message);
      setStep('verify');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create your account right now.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await verifyRegistrationCode(verificationEmail, verificationCode);
      persistSession(response.token, response.user);
      navigate(searchParams.get('redirect') || getAuthenticatedHomeRoute(response.user));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to verify your email right now.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsResending(true);

    try {
      const response = await resendRegistrationCode(verificationEmail);
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to resend the verification code right now.',
      );
    } finally {
      setIsResending(false);
    }
  };

  const inputClass =
    'w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-green-800/90 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1759140047496-f40e8eb482b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmdhbmljJTIwZmFybSUyMGhhcnZlc3QlMjBiYXNrZXQlMjB2ZWdldGFibGVzfGVufDF8fHx8MTc3MzgyNTEzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Fresh farm harvest"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(getLogoHomeRoute(sessionUser))}>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AgriHub</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Start your journey with AgriHub
            </h2>
            <p className="text-green-100 leading-relaxed mb-8">
              Create your account and connect with thousands of verified farmers and buyers across the country.
            </p>
            <div className="space-y-4">
              {['Access fresh produce directly from farms', 'Secure escrow payments on every order', 'Book labor & services on demand'].map((item) => (
                <div key={item} className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-300 shrink-0" />
                  <span className="text-white/90 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md">
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              "I signed up in minutes and had my first sale within a week. AgriHub made everything so simple."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">JK</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">James Kariuki</p>
                <p className="text-xs text-green-200">Grain Farmer, Kansas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8 cursor-pointer" onClick={() => navigate(getLogoHomeRoute(sessionUser))}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {step === 'form' ? 'Create Account' : 'Verify Email'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'form'
                  ? 'Join AgriHub and start buying fresh products'
                  : `Enter the code sent to ${verificationEmail}`}
              </p>
            </div>

            {(errorMessage || successMessage) ? (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                errorMessage
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}>
                {errorMessage || successMessage}
              </div>
            ) : null}

            {step === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="Juan" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Middle Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type="text" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} placeholder="Optional" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Dela Cruz" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type="tel" inputMode="numeric" value={form.phone} onChange={(e) => updatePhone(e.target.value)} placeholder="09XX XXX XXXX" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Create a password" className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.width }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Password strength: <span className="font-medium">{strength.label}</span></p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className={`w-full pl-11 pr-12 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${passwordsMismatch ? 'border-red-300 focus:ring-red-500/30 focus:border-red-500' : passwordsMatch ? 'border-green-300 focus:ring-green-500/30 focus:border-green-500' : 'border-gray-200 focus:ring-green-500/30 focus:border-green-500'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {passwordsMismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                  {passwordsMatch && <p className="text-xs text-green-600 mt-1">Passwords match</p>}
                </div>

                <label className="flex items-start space-x-2.5 cursor-pointer pt-1">
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600" />
                  <span className="text-sm text-gray-500">I agree to the <Link to="/terms" className="text-green-600 hover:text-green-700">Terms of Service</Link> and <Link to="/privacy" className="text-green-600 hover:text-green-700">Privacy Policy</Link></span>
                </label>

                <button type="submit" disabled={isLoading || !agreedToTerms}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Verification Code</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full rounded-xl border border-green-200 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
                >
                  {isResending ? 'Resending...' : 'Resend Code'}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-green-600 hover:text-green-700 font-medium transition-colors">Login</button>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">&copy; 2026 AgriHub. Empowering farmers with technology.</p>
        </div>
      </div>
    </div>
  );
}
