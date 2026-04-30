import { useNavigate } from 'react-router';
import { ArrowLeft, Sprout, ShieldCheck, Users, Store, ShoppingBag, Wallet, Scale, Ban, Gavel } from 'lucide-react';

const sections = [
  { icon: ShieldCheck, title: '1. Introduction', text: 'Welcome to AgriHub. By using this platform, you agree to comply with these terms and conditions. These terms govern your access to and use of the AgriHub platform, including all services, features, and content offered through the application.' },
  { icon: Users, title: '2. User Responsibilities', text: 'Users must provide accurate information and maintain account security. Any misuse of the platform may result in account suspension. You are responsible for all activities that occur under your account and must notify AgriHub immediately of any unauthorized use.' },
  { icon: Store, title: '3. Seller Responsibilities', text: 'Sellers are responsible for ensuring the quality, accuracy, and freshness of their products. Misrepresentation or fraudulent listings are prohibited. Sellers must comply with all applicable food safety regulations and provide truthful descriptions of their produce.' },
  { icon: ShoppingBag, title: '4. Buyer Responsibilities', text: 'Buyers must provide valid delivery details and submit honest feedback. Complaints must include proof such as photos or videos. Buyers agree to inspect products upon delivery and report any issues within the designated timeframe.' },
  { icon: Wallet, title: '5. Payment and Escrow', text: 'All payments are securely held by the platform and released only after order confirmation to ensure fairness for both parties. AgriHub uses industry-standard encryption and secure payment processing to protect all financial transactions.' },
  { icon: Scale, title: '6. Dispute Resolution', text: 'In case of disputes, the platform will review submitted evidence and make a fair decision regarding refunds or replacements. Both parties will be given an opportunity to present their case before a resolution is reached.' },
  { icon: Ban, title: '7. Account Suspension', text: 'AgriHub reserves the right to suspend or terminate accounts that violate platform policies. Users will be notified of the reason for suspension and may appeal the decision through the designated support channel.' },
  { icon: Gavel, title: '8. Legal Compliance', text: 'This platform operates in accordance with Republic Act No. 8792 (E-Commerce Act of the Philippines). All users agree to abide by applicable local, national, and international laws when using AgriHub services.' },
];

export function TermsOfService() {
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
            <h1 className="text-lg font-bold text-gray-900">Terms of Service</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 sm:p-8 mb-8 shadow-lg shadow-green-500/20">
          <p className="text-green-100 text-sm mb-1">Last updated: March 18, 2026</p>
          <h2 className="text-2xl font-bold text-white mb-2">AgriHub Terms of Service</h2>
          <p className="text-green-50 text-sm leading-relaxed">Please read these terms carefully before using the AgriHub platform. By accessing or using our services, you acknowledge that you have read, understood, and agree to be bound by these terms.</p>
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
          <p className="text-xs text-gray-400">If you have any questions about these terms, contact us at <a href="mailto:agrihub183@gmail.com" className="text-green-600 hover:text-green-700">agrihub183@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
