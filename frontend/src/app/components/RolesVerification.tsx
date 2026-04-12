import { useState } from 'react';
import {
  ShieldCheck, Upload, X, FileText, Loader2, ImageIcon,
  Leaf, HardHat, ShoppingBag, Camera, Award, Clock, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Lock, RefreshCw
} from 'lucide-react';

type VerificationStatus = 'unverified' | 'pending' | 'verified';

interface UploadedFile {
  name: string;
  preview: string | null;
}

const SKILLS = ['Harvesting', 'Irrigation', 'Planting', 'Weeding', 'Spraying', 'Land Preparation'];

export function RolesVerification() {
  // Role states
  const [sellerStatus, setSellerStatus] = useState<VerificationStatus>('unverified');
  const [laborerStatus, setLaborerStatus] = useState<VerificationStatus>('unverified');

  // Expanded panels
  const [sellerExpanded, setSellerExpanded] = useState(false);
  const [laborerExpanded, setLaborerExpanded] = useState(false);

  // Seller form
  const [sellerUploads, setSellerUploads] = useState<Record<string, UploadedFile>>({});
  const [sellerConsent, setSellerConsent] = useState(false);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);

  // Laborer form
  const [laborerUploads, setLaborerUploads] = useState<Record<string, UploadedFile>>({});
  const [laborerSkills, setLaborerSkills] = useState<string[]>([]);
  const [laborerExperience, setLaborerExperience] = useState('');
  const [laborerDescription, setLaborerDescription] = useState('');
  const [laborerConsent, setLaborerConsent] = useState(false);
  const [laborerSubmitting, setLaborerSubmitting] = useState(false);

  const activeRoles: { label: string; icon: React.ReactNode; color: string }[] = [
    { label: 'Buyer', icon: <ShoppingBag className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
  ];
  if (sellerStatus === 'verified') {
    activeRoles.push({ label: 'Verified Seller', icon: <Leaf className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700' });
  }
  if (laborerStatus === 'verified') {
    activeRoles.push({ label: 'Verified Laborer', icon: <HardHat className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700' });
  }

  const handleSellerSubmit = () => {
    setSellerSubmitting(true);
    setTimeout(() => {
      setSellerSubmitting(false);
      setSellerStatus('pending');
      setSellerExpanded(false);
    }, 1500);
  };

  const handleLaborerSubmit = () => {
    setLaborerSubmitting(true);
    setTimeout(() => {
      setLaborerSubmitting(false);
      setLaborerStatus('pending');
      setLaborerExpanded(false);
    }, 1500);
  };

  const sellerCanSubmit = sellerConsent && sellerUploads['seller-valid-id'] && sellerUploads['seller-selfie-id'] &&
    (sellerUploads['seller-barangay'] || sellerUploads['seller-farm-photos'] || sellerUploads['seller-rsbsa']);

  const laborerCanSubmit = laborerConsent && laborerUploads['laborer-valid-id'] && laborerUploads['laborer-selfie'] && laborerSkills.length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-1">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Account Roles & Verification</h3>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5 ml-[52px]">
        You can have multiple roles on this platform. Each role requires separate verification.
      </p>

      {/* Current Roles */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2.5">Your Roles</p>
        <div className="flex flex-wrap gap-2">
          {activeRoles.map((role) => (
            <span key={role.label} className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${role.color}`}>
              {role.icon}
              <span>{role.label}</span>
            </span>
          ))}
          {sellerStatus === 'pending' && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <Clock className="w-3.5 h-3.5" />
              <span>Seller (Pending)</span>
            </span>
          )}
          {laborerStatus === 'pending' && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <Clock className="w-3.5 h-3.5" />
              <span>Laborer (Pending)</span>
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 space-y-4">
        {/* ==================== SELLER CARD ==================== */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => sellerStatus !== 'pending' && sellerStatus !== 'verified' && setSellerExpanded(!sellerExpanded)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">Become a Seller 🌾</h4>
                <p className="text-sm text-gray-500">Sell crops and manage your farm products</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <StatusBadge status={sellerStatus} />
              {sellerStatus === 'unverified' && (
                sellerExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Pending State */}
          {sellerStatus === 'pending' && (
            <div className="px-5 pb-5">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
                <Loader2 className="w-8 h-8 text-yellow-600 animate-spin mx-auto mb-2" />
                <h4 className="font-semibold text-yellow-800 mb-1">Verification Under Review</h4>
                <p className="text-sm text-yellow-600">Your verification is under review (24–48 hours)</p>
              </div>
            </div>
          )}

          {/* Verified State */}
          {sellerStatus === 'verified' && (
            <div className="px-5 pb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 mb-1">🌿 Verified Seller</h4>
                <p className="text-sm text-green-600">You have full access to all selling features.</p>
              </div>
            </div>
          )}

          {/* Seller Form */}
          {sellerExpanded && sellerStatus === 'unverified' && (
            <div className="px-5 pb-5 border-t border-gray-100">
              <div className="pt-5 space-y-5">
                {/* Required Uploads */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Required Documents</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UploadBox
                      id="seller-valid-id"
                      label="Valid ID"
                      description="Upload a government-issued ID (National ID, Driver's License, etc.)"
                      icon={<FileText className="w-6 h-6 text-gray-400" />}
                      file={sellerUploads['seller-valid-id']}
                      onUpload={(f) => setSellerUploads(prev => ({ ...prev, 'seller-valid-id': f }))}
                      onRemove={() => setSellerUploads(prev => { const n = { ...prev }; delete n['seller-valid-id']; return n; })}
                    />
                    <UploadBox
                      id="seller-selfie-id"
                      label="Selfie with ID"
                      description="Take a selfie holding your ID"
                      icon={<Camera className="w-6 h-6 text-gray-400" />}
                      file={sellerUploads['seller-selfie-id']}
                      onUpload={(f) => setSellerUploads(prev => ({ ...prev, 'seller-selfie-id': f }))}
                      onRemove={() => setSellerUploads(prev => { const n = { ...prev }; delete n['seller-selfie-id']; return n; })}
                    />
                  </div>
                </div>

                {/* Farm Proof */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Farm Proof <span className="text-gray-400 font-normal">(choose at least one)</span></p>
                  <p className="text-xs text-gray-400 mb-3">This helps verify that you are a legitimate farmer.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <UploadBox
                      id="seller-barangay"
                      label="Barangay Certificate"
                      icon={<FileText className="w-5 h-5 text-gray-400" />}
                      file={sellerUploads['seller-barangay']}
                      onUpload={(f) => setSellerUploads(prev => ({ ...prev, 'seller-barangay': f }))}
                      onRemove={() => setSellerUploads(prev => { const n = { ...prev }; delete n['seller-barangay']; return n; })}
                      compact
                    />
                    <UploadBox
                      id="seller-farm-photos"
                      label="Farm Photos"
                      description="With location"
                      icon={<ImageIcon className="w-5 h-5 text-gray-400" />}
                      file={sellerUploads['seller-farm-photos']}
                      onUpload={(f) => setSellerUploads(prev => ({ ...prev, 'seller-farm-photos': f }))}
                      onRemove={() => setSellerUploads(prev => { const n = { ...prev }; delete n['seller-farm-photos']; return n; })}
                      compact
                    />
                    <UploadBox
                      id="seller-rsbsa"
                      label="RSBSA"
                      description="Optional"
                      icon={<FileText className="w-5 h-5 text-gray-400" />}
                      file={sellerUploads['seller-rsbsa']}
                      onUpload={(f) => setSellerUploads(prev => ({ ...prev, 'seller-rsbsa': f }))}
                      onRemove={() => setSellerUploads(prev => { const n = { ...prev }; delete n['seller-rsbsa']; return n; })}
                      compact
                    />
                  </div>
                </div>

                {/* Consent */}
                <ConsentCheckbox checked={sellerConsent} onChange={setSellerConsent} />

                {/* Submit */}
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-gray-400">Your documents will be reviewed within 24–48 hours.</p>
                  <button
                    disabled={!sellerCanSubmit || sellerSubmitting}
                    onClick={handleSellerSubmit}
                    className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20 transition-all duration-200"
                  >
                    {sellerSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Submitting…</span></>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /><span>Submit for Verification</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== LABORER CARD ==================== */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => laborerStatus !== 'pending' && laborerStatus !== 'verified' && setLaborerExpanded(!laborerExpanded)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <HardHat className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">Become a Laborer 👷</h4>
                <p className="text-sm text-gray-500">Offer farming services and get hired</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <StatusBadge status={laborerStatus} />
              {laborerStatus === 'unverified' && (
                laborerExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Pending State */}
          {laborerStatus === 'pending' && (
            <div className="px-5 pb-5">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
                <Loader2 className="w-8 h-8 text-yellow-600 animate-spin mx-auto mb-2" />
                <h4 className="font-semibold text-yellow-800 mb-1">Verification Under Review</h4>
                <p className="text-sm text-yellow-600">Your verification is under review (24–48 hours)</p>
              </div>
            </div>
          )}

          {/* Verified State */}
          {laborerStatus === 'verified' && (
            <div className="px-5 pb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 mb-1">👷 Verified Laborer</h4>
                <p className="text-sm text-green-600">You can now offer your services and get hired.</p>
              </div>
            </div>
          )}

          {/* Laborer Form */}
          {laborerExpanded && laborerStatus === 'unverified' && (
            <div className="px-5 pb-5 border-t border-gray-100">
              <div className="pt-5 space-y-5">
                {/* Required Uploads */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Required Documents</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UploadBox
                      id="laborer-valid-id"
                      label="Valid ID"
                      description="Upload a government-issued ID"
                      icon={<FileText className="w-6 h-6 text-gray-400" />}
                      file={laborerUploads['laborer-valid-id']}
                      onUpload={(f) => setLaborerUploads(prev => ({ ...prev, 'laborer-valid-id': f }))}
                      onRemove={() => setLaborerUploads(prev => { const n = { ...prev }; delete n['laborer-valid-id']; return n; })}
                    />
                    <UploadBox
                      id="laborer-selfie"
                      label="Selfie"
                      description="Take a clear selfie"
                      icon={<Camera className="w-6 h-6 text-gray-400" />}
                      file={laborerUploads['laborer-selfie']}
                      onUpload={(f) => setLaborerUploads(prev => ({ ...prev, 'laborer-selfie': f }))}
                      onRemove={() => setLaborerUploads(prev => { const n = { ...prev }; delete n['laborer-selfie']; return n; })}
                    />
                  </div>
                </div>

                {/* Skills Selection */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Skills Selection <span className="text-red-400">*</span></p>
                  <p className="text-xs text-gray-400 mb-3">Select the skills you can offer</p>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((skill) => {
                      const selected = laborerSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          onClick={() => setLaborerSkills(prev => selected ? prev.filter(s => s !== skill) : [...prev, skill])}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            selected
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                          }`}
                        >
                          {selected && <span className="mr-1.5">✓</span>}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Certificates */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Upload Certificates <span className="text-gray-400 font-normal">(optional)</span></p>
                  <p className="text-xs text-gray-400 mb-3">Providing certificates increases your credibility and chances of being hired.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <UploadBox
                      id="laborer-tesda"
                      label="TESDA Certificate"
                      icon={<Award className="w-5 h-5 text-gray-400" />}
                      file={laborerUploads['laborer-tesda']}
                      onUpload={(f) => setLaborerUploads(prev => ({ ...prev, 'laborer-tesda': f }))}
                      onRemove={() => setLaborerUploads(prev => { const n = { ...prev }; delete n['laborer-tesda']; return n; })}
                      compact
                    />
                    <UploadBox
                      id="laborer-coe"
                      label="Certificate of Employment"
                      icon={<FileText className="w-5 h-5 text-gray-400" />}
                      file={laborerUploads['laborer-coe']}
                      onUpload={(f) => setLaborerUploads(prev => ({ ...prev, 'laborer-coe': f }))}
                      onRemove={() => setLaborerUploads(prev => { const n = { ...prev }; delete n['laborer-coe']; return n; })}
                      compact
                    />
                    <UploadBox
                      id="laborer-training"
                      label="Training Certificates"
                      icon={<Award className="w-5 h-5 text-gray-400" />}
                      file={laborerUploads['laborer-training']}
                      onUpload={(f) => setLaborerUploads(prev => ({ ...prev, 'laborer-training': f }))}
                      onRemove={() => setLaborerUploads(prev => { const n = { ...prev }; delete n['laborer-training']; return n; })}
                      compact
                    />
                  </div>
                </div>

                {/* Optional Fields */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Additional Information <span className="text-gray-400 font-normal">(optional)</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Experience (years)</label>
                      <input
                        type="number"
                        min="0"
                        value={laborerExperience}
                        onChange={(e) => setLaborerExperience(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Short Description</label>
                      <input
                        type="text"
                        value={laborerDescription}
                        onChange={(e) => setLaborerDescription(e.target.value)}
                        placeholder="e.g. Experienced rice farmer..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <ConsentCheckbox checked={laborerConsent} onChange={setLaborerConsent} />

                {/* Submit */}
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-gray-400">Your documents will be reviewed within 24–48 hours.</p>
                  <button
                    disabled={!laborerCanSubmit || laborerSubmitting}
                    onClick={handleLaborerSubmit}
                    className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20 transition-all duration-200"
                  >
                    {laborerSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Submitting…</span></>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /><span>Submit for Verification</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Note */}
      <div className="mt-5 flex items-start space-x-2 text-xs text-gray-400">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>Your documents are securely stored and used only for verification purposes.</p>
      </div>
    </div>
  );
}

/* ========== Sub-components ========== */

function StatusBadge({ status }: { status: VerificationStatus }) {
  const config = {
    unverified: { bg: 'bg-gray-100 text-gray-600', label: 'Unverified' },
    pending: { bg: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending' },
    verified: { bg: 'bg-green-100 text-green-700', label: '✓ Verified' },
  };
  const c = config[status];
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.bg}`}>{c.label}</span>;
}

function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-gray-600 mb-3">
            We collect your ID and documents to verify your identity and skills. Your data will be kept secure and not shared without your permission.
          </p>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600"
            />
            <span className="text-sm text-gray-700 font-medium">I agree</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function UploadBox({ id, label, description, icon, file, onUpload, onRemove, compact }: {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  file?: UploadedFile;
  onUpload: (file: UploadedFile) => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onUpload({ name: f.name, preview: reader.result as string });
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  if (file) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 relative">
        {file.preview && file.preview.startsWith('data:image') ? (
          <img src={file.preview} alt={label} className="w-full h-24 object-cover rounded-lg mb-2" />
        ) : (
          <div className="w-full h-24 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <FileText className="w-8 h-8 text-green-500" />
          </div>
        )}
        <p className="text-xs text-green-700 font-medium truncate">{file.name}</p>
        <p className="text-xs text-green-500 mb-2">{label}</p>
        <div className="flex gap-2">
          <label htmlFor={`retake-${id}`} className="flex items-center space-x-1 text-xs text-green-600 font-medium cursor-pointer hover:text-green-700">
            <RefreshCw className="w-3 h-3" />
            <span>Retake</span>
            <input id={`retake-${id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
          </label>
          <button onClick={onRemove} className="flex items-center space-x-1 text-xs text-red-500 font-medium hover:text-red-600">
            <X className="w-3 h-3" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <label htmlFor={`upload-${id}`} className={`border-2 border-dashed border-gray-200 rounded-xl ${compact ? 'p-4' : 'p-6'} flex flex-col items-center justify-center text-center cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-all duration-200 group`}>
      <input id={`upload-${id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-100 transition-colors">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-700 mb-0.5">{label}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
      <div className="flex items-center space-x-1 mt-2 text-xs text-green-600 font-medium">
        <Upload className="w-3.5 h-3.5" />
        <span>Upload</span>
      </div>
    </label>
  );
}
