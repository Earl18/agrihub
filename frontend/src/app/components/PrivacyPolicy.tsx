import { useNavigate } from 'react-router';
import { ArrowLeft, Sprout, Shield, Database, Eye, Share2, Lock, Bell, UserCheck, Globe } from 'lucide-react';

const sections = [
  { icon: Database, title: '1. Information We Collect', text: 'We collect personal information you provide when creating an account, such as your name, email address, phone number, and delivery address. We also collect usage data to improve our platform experience.' },
  { icon: Eye, title: '2. How We Use Your Information', text: 'Your information is used to facilitate transactions, deliver products, provide customer support, and improve our services. We may also use your data to send relevant notifications about orders and promotions.' },
  { icon: Share2, title: '3. Information Sharing', text: 'We share your information only with parties necessary to complete transactions, such as sellers, delivery partners, and payment processors. We never sell your personal data to third parties.' },
  { icon: Lock, title: '4. Data Security', text: 'We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information from unauthorized access or disclosure.' },
  { icon: Bell, title: '5. Communications', text: 'You may receive transactional emails and notifications related to your orders. You can opt out of promotional communications at any time through your account settings.' },
  { icon: UserCheck, title: '6. Your Rights', text: 'You have the right to access, update, or delete your personal information at any time. You may also request a copy of the data we hold about you by contacting our support team.' },
  { icon: Globe, title: '7. Cookies & Tracking', text: 'We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can manage cookie preferences through your browser settings.' },
  { icon: Shield, title: '8. Policy Updates', text: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notifications. Continued use of AgriHub after changes constitutes acceptance.' },
];

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center px-4 sm:px-6 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-green-600 transition-colors mr-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Sprout className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 sm:p-8 mb-8 shadow-lg shadow-green-500/20">
          <p className="text-green-100 text-sm mb-1">Last updated: March 18, 2026</p>
          <h2 className="text-2xl font-bold text-white mb-2">AgriHub Privacy Policy</h2>
          <p className="text-green-50 text-sm leading-relaxed">Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use the AgriHub platform.</p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{section.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">Questions about your privacy? Contact us at <a href="mailto:privacy@agrihub.com" className="text-green-600 hover:text-green-700">privacy@agrihub.com</a></p>
        </div>
      </div>
    </div>
  );
}
