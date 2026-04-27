import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HardHat,
  ImageIcon,
  Leaf,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Upload,
  UserSquare2,
  X,
} from 'lucide-react';
import { applyForRole, createVerificationUploadUrl } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';
import { requireSupabaseClient } from '../../shared/supabase/client';

type VerificationStatus = 'unverified' | 'pending' | 'verified';
type RoleKey = 'seller' | 'laborer';
type WizardStep = 0 | 1 | 2 | 3;

interface UploadedFile {
  name: string;
  preview: string | null;
  file: File;
}

type UploadRecord = Record<string, UploadedFile>;

type VerificationUploadRecord = {
  type: string;
  bucket: string;
  path: string;
  originalName: string;
};

interface KycFormState {
  idType: string;
  idNumber: string;
  farmProofType: string;
  laborProofType: string;
  addressConfirmed: boolean;
  selfieConfirmed: boolean;
  riskAccepted: boolean;
  consentAccepted: boolean;
  uploads: UploadRecord;
  skills: string[];
  experience: string;
  description: string;
}

interface RolesVerificationProps {
  user: SessionUser | null;
  onUserUpdated: (user: SessionUser) => void;
}

const SKILLS = ['Harvesting', 'Irrigation', 'Planting', 'Weeding', 'Spraying', 'Land Preparation'];
const ID_TYPES = ['National ID', 'Driver License', 'Passport', 'Voter ID', 'Postal ID'];
const FARM_PROOF_TYPES = [
  'Barangay Certificate',
  'RSBSA Registration',
  'Farm Lease Agreement',
  'Land Title or Tax Declaration',
  'Cooperative Certification',
];
const LABOR_PROOF_TYPES = [
  'TESDA National Certificate',
  'Barangay Certification for Farm Work',
  'Certificate of Employment',
  'DA or ATI Training Certificate',
  'Cooperative Endorsement',
  'Valid Service Contract or Work Record',
];
const WIZARD_LABELS = ['Identity', 'Documents', 'Role Proof', 'Review'];

const EMPTY_KYC_FORM: KycFormState = {
  idType: '',
  idNumber: '',
  farmProofType: '',
  laborProofType: '',
  addressConfirmed: false,
  selfieConfirmed: false,
  riskAccepted: false,
  consentAccepted: false,
  uploads: {},
  skills: [],
  experience: '',
  description: '',
};

async function uploadVerificationFile(
  role: RoleKey,
  documentType: string,
  uploadedFile: UploadedFile | undefined,
) {
  if (!uploadedFile) {
    throw new Error(`Missing ${documentType} file.`);
  }

  const supabase = requireSupabaseClient();
  const uploadTarget = await createVerificationUploadUrl({
    role,
    documentType,
    fileName: uploadedFile.name,
  });

  const { error } = await supabase.storage
    .from(uploadTarget.bucket)
    .uploadToSignedUrl(uploadTarget.path, uploadTarget.token, uploadedFile.file);

  if (error) {
    throw new Error(error.message || 'Unable to upload verification document.');
  }

  return {
    type: documentType,
    bucket: uploadTarget.bucket,
    path: uploadTarget.path,
    originalName: uploadedFile.name,
  } satisfies VerificationUploadRecord;
}

function createEmptyForm() {
  return {
    ...EMPTY_KYC_FORM,
    uploads: {},
    skills: [],
  };
}

function getRequiredUploadKeys(role: RoleKey) {
  return role === 'seller'
    ? ['id-front', 'id-back', 'selfie', 'farm-proof']
    : ['id-front', 'id-back', 'selfie'];
}

function getStepCompletion(role: RoleKey, form: KycFormState) {
  const identityComplete =
    Boolean(form.idType.trim()) &&
    Boolean(form.idNumber.trim()) &&
    form.addressConfirmed &&
    form.selfieConfirmed;

  const documentsComplete = ['id-front', 'id-back', 'selfie'].every((key) => Boolean(form.uploads[key]));

  const roleProofComplete =
    role === 'seller'
      ? Boolean(form.farmProofType.trim()) && Boolean(form.uploads['farm-proof'])
      : Boolean(form.laborProofType.trim()) &&
        Boolean(form.uploads['work-proof']) &&
        form.skills.length > 0 &&
        Boolean(form.experience.trim()) &&
        Boolean(form.description.trim());

  const reviewComplete = form.riskAccepted && form.consentAccepted;

  return [identityComplete, documentsComplete, roleProofComplete, reviewComplete];
}

function getStatusTone(status: VerificationStatus) {
  if (status === 'verified') {
    return {
      card: 'border-green-200 bg-green-50',
      text: 'text-green-700',
      label: 'Verified',
      icon: <CheckCircle2 className="w-4 h-4" />,
    };
  }

  if (status === 'pending') {
    return {
      card: 'border-amber-200 bg-amber-50',
      text: 'text-amber-700',
      label: 'Under review',
      icon: <Clock className="w-4 h-4" />,
    };
  }

  return {
    card: 'border-gray-200 bg-gray-50',
    text: 'text-gray-600',
    label: 'Not started',
    icon: <ShieldCheck className="w-4 h-4" />,
  };
}

function UploadBox({
  id,
  label,
  description,
  icon,
  file,
  onUpload,
  onRemove,
  disabled = false,
}: {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  file?: UploadedFile;
  onUpload: (file: UploadedFile) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      onUpload({
        name: selectedFile.name,
        preview: reader.result as string,
        file: selectedFile,
      });
    reader.readAsDataURL(selectedFile);
    event.target.value = '';
  };

  if (file) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        {file.preview && file.preview.startsWith('data:image') ? (
          <img src={file.preview} alt={label} className="mb-3 h-28 w-full rounded-xl object-cover" />
        ) : (
          <div className="mb-3 flex h-28 w-full items-center justify-center rounded-xl bg-green-100">
            <FileText className="h-8 w-8 text-green-600" />
          </div>
        )}
        <p className="truncate text-sm font-medium text-green-800">{file.name}</p>
        <p className="mt-1 text-xs text-green-600">{label}</p>
        <div className="mt-3 flex items-center gap-4">
          <label htmlFor={`retake-${id}`} className="flex cursor-pointer items-center gap-1 text-xs font-medium text-green-700">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retake</span>
            <input id={`retake-${id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
          </label>
          <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs font-medium text-red-600">
            <X className="h-3.5 w-3.5" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={disabled ? undefined : `upload-${id}`}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          : 'cursor-pointer border-gray-200 hover:border-green-400 hover:bg-green-50/60'
      }`}
    >
      <input id={`upload-${id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} disabled={disabled} />
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${disabled ? 'bg-gray-200' : 'bg-gray-100'}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${disabled ? 'text-gray-400' : 'text-green-700'}`}>
        <Upload className="h-3.5 w-3.5" />
        <span>{disabled ? 'Choose proof type first' : 'Upload'}</span>
      </div>
    </label>
  );
}

function ProgressRail({ step, completion }: { step: WizardStep; completion: boolean[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {WIZARD_LABELS.map((label, index) => {
        const isCurrent = step === index;
        const isDone = completion[index];

        return (
          <div
            key={label}
            className={`rounded-2xl border px-3 py-3 text-left ${
              isCurrent
                ? 'border-green-300 bg-green-50'
                : isDone
                  ? 'border-green-200 bg-white'
                  : 'border-gray-200 bg-white'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isCurrent || isDone ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {isDone ? 'OK' : index + 1}
              </span>
            </div>
            <p className={`text-xs font-medium ${isCurrent ? 'text-green-800' : 'text-gray-600'}`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function KycWizard({
  role,
  title,
  subtitle,
  icon,
  status,
  expanded,
  onToggle,
  form,
  setForm,
  submitting,
  onSubmit,
}: {
  role: RoleKey;
  title: string;
  subtitle: string;
  icon: ReactNode;
  status: VerificationStatus;
  expanded: boolean;
  onToggle: () => void;
  form: KycFormState;
  setForm: Dispatch<SetStateAction<KycFormState>>;
  submitting: boolean;
  onSubmit: () => Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>(0);
  const tone = getStatusTone(status);
  const completion = useMemo(() => getStepCompletion(role, form), [form, role]);

  useEffect(() => {
    if (status !== 'unverified') {
      setStep(0);
    }
  }, [status]);

  const canGoNext = completion[step];
  const nextStep = () => {
    if (step < 3 && canGoNext) {
      setStep((current) => (current + 1) as WizardStep);
    }
  };

  const previousStep = () => {
    if (step > 0) {
      setStep((current) => (current - 1) as WizardStep);
    }
  };

  const updateUpload = (key: string, file: UploadedFile) => {
    setForm((current) => ({
      ...current,
      uploads: {
        ...current.uploads,
        [key]: file,
      },
    }));
  };

  const removeUpload = (key: string) => {
    setForm((current) => {
      const nextUploads = { ...current.uploads };
      delete nextUploads[key];
      return {
        ...current,
        uploads: nextUploads,
      };
    });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => status === 'unverified' && onToggle()}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            {icon}
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${tone.card} ${tone.text}`}>
            {tone.icon}
            <span>{tone.label}</span>
          </span>
          {status === 'unverified' ? (
            expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : null}
        </div>
      </button>

      {status === 'pending' ? (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-amber-600" />
            <h4 className="font-semibold text-amber-800">KYC submitted</h4>
            <p className="mt-1 text-sm text-amber-700">Your documents are waiting for manual review. Keep your contact details active in case an admin needs clarification.</p>
          </div>
        </div>
      ) : null}

      {status === 'verified' ? (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-600" />
            <h4 className="font-semibold text-green-800">KYC approved</h4>
            <p className="mt-1 text-sm text-green-700">This account can now access protected {role === 'seller' ? 'selling' : 'labor'} features.</p>
          </div>
        </div>
      ) : null}

      {expanded && status === 'unverified' ? (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="space-y-5 pt-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">KYC verification</p>
                  <p className="text-xs text-gray-500">A step-by-step identity check inspired by wallet and marketplace verification flows.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                  Step {step + 1} of 4
                </span>
              </div>
              <ProgressRail step={step} completion={completion} />
            </div>

            {step === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">ID type</label>
                  <select
                    value={form.idType}
                    onChange={(event) => setForm((current) => ({ ...current, idType: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select an ID</option>
                    {ID_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">ID number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.idNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        idNumber: event.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="Enter numbers only"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">Only numeric characters are allowed in this field.</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 md:col-span-2">
                  <p className="text-sm font-semibold text-blue-900">Identity quality checks</p>
                  <ul className="mt-2 space-y-2 text-sm text-blue-800">
                    <li>Use your real legal name and the same ID you will photograph.</li>
                    <li>Make sure the address in your profile matches your current location details.</li>
                    <li>Take photos in a bright area with no blur, glare, or cropped edges.</li>
                  </ul>
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.addressConfirmed}
                    onChange={(event) => setForm((current) => ({ ...current, addressConfirmed: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">I confirm my profile address and contact details are accurate and belong to me.</span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.selfieConfirmed}
                    onChange={(event) => setForm((current) => ({ ...current, selfieConfirmed: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">I understand the selfie must clearly show my face and match the uploaded ID.</span>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <UploadBox
                    id={`${role}-id-front`}
                    label="ID front"
                    description="All corners visible"
                    icon={<UserSquare2 className="h-5 w-5 text-gray-500" />}
                    file={form.uploads['id-front']}
                    onUpload={(file) => updateUpload('id-front', file)}
                    onRemove={() => removeUpload('id-front')}
                  />
                  <UploadBox
                    id={`${role}-id-back`}
                    label="ID back"
                    description="Include barcodes or signatures"
                    icon={<FileText className="h-5 w-5 text-gray-500" />}
                    file={form.uploads['id-back']}
                    onUpload={(file) => updateUpload('id-back', file)}
                    onRemove={() => removeUpload('id-back')}
                  />
                  <UploadBox
                    id={`${role}-selfie`}
                    label="Clear selfie"
                    description="Face centered and well lit"
                    icon={<Camera className="h-5 w-5 text-gray-500" />}
                    file={form.uploads['selfie']}
                    onUpload={(file) => updateUpload('selfie', file)}
                    onRemove={() => removeUpload('selfie')}
                  />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">Capture tips</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-3 text-sm text-gray-600">No flash glare on laminated IDs.</div>
                    <div className="rounded-xl bg-white p-3 text-sm text-gray-600">Do not cover any name, birth date, or ID number.</div>
                    <div className="rounded-xl bg-white p-3 text-sm text-gray-600">Avoid hats, masks, filters, and heavy shadows in selfies.</div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                {role === 'seller' ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Farm proof type</label>
                        <select
                          value={form.farmProofType}
                          onChange={(event) => setForm((current) => ({ ...current, farmProofType: event.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Choose a farm document</option>
                          {FARM_PROOF_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          Pick the real document you have, then upload that exact proof below.
                        </p>
                      </div>
                      <UploadBox
                        id="seller-farm-proof"
                        label={form.farmProofType || 'Farm proof'}
                        description={form.farmProofType ? `Upload your ${form.farmProofType.toLowerCase()}` : 'Choose a document type first'}
                        icon={<Leaf className="h-5 w-5 text-gray-500" />}
                        file={form.uploads['farm-proof']}
                        onUpload={(file) => updateUpload('farm-proof', file)}
                        onRemove={() => removeUpload('farm-proof')}
                        disabled={!form.farmProofType.trim()}
                      />
                      <UploadBox
                        id="seller-farm-photo"
                        label="Farm photo"
                        description="Optional but strongly recommended"
                        icon={<ImageIcon className="h-5 w-5 text-gray-500" />}
                        file={form.uploads['farm-photo']}
                        onUpload={(file) => updateUpload('farm-photo', file)}
                        onRemove={() => removeUpload('farm-photo')}
                      />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      Seller safety review checks include matching identity, farm proof, and whether the account can be traced back to a real person before products go live.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">Primary work skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {SKILLS.map((skill) => {
                          const selected = form.skills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  skills: selected
                                    ? current.skills.filter((item) => item !== skill)
                                    : [...current.skills, skill],
                                }))
                              }
                              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-green-300 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50'
                              }`}
                            >
                              {selected ? `Selected: ${skill}` : skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-gray-200 p-4 md:col-span-3">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Work proof type</label>
                        <select
                          value={form.laborProofType}
                          onChange={(event) => setForm((current) => ({ ...current, laborProofType: event.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Choose a worker proof document</option>
                          {LABOR_PROOF_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          Choose the Philippine proof document you really have, then upload that exact file below.
                        </p>
                      </div>
                      <UploadBox
                        id="laborer-work-proof"
                        label={form.laborProofType || 'Work proof'}
                        description={form.laborProofType ? `Upload your ${form.laborProofType.toLowerCase()}` : 'Choose a work proof type first'}
                        icon={<FileText className="h-5 w-5 text-gray-500" />}
                        file={form.uploads['work-proof']}
                        onUpload={(file) => updateUpload('work-proof', file)}
                        onRemove={() => removeUpload('work-proof')}
                        disabled={!form.laborProofType.trim()}
                      />
                      <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Experience</label>
                        <input
                          type="text"
                          value={form.experience}
                          onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}
                          placeholder="Required: example 3 years in rice planting and irrigation"
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <label className="mb-2 mt-4 block text-sm font-medium text-gray-700">Work summary</label>
                        <textarea
                          value={form.description}
                          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Required: describe the type of farm work you can safely perform."
                          rows={4}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      Laborer safety review checks look at identity, skills, and whether the profile gives buyers enough confidence to hire responsibly.
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ReviewLine label="Role" value={role === 'seller' ? 'Seller' : 'Laborer'} />
                  <ReviewLine label="ID type" value={form.idType || 'Not selected'} />
                  <ReviewLine label="ID number" value={form.idNumber || 'Not set'} />
                  <ReviewLine label="Core uploads" value={`${getRequiredUploadKeys(role).filter((key) => form.uploads[key]).length}/${getRequiredUploadKeys(role).length} ready`} />
                  {role === 'laborer' ? (
                    <ReviewLine label="Skills" value={form.skills.length ? form.skills.join(', ') : 'None selected'} />
                  ) : (
                    <ReviewLine label="Farm proof type" value={form.farmProofType || 'Not selected'} />
                  )}
                  {role === 'laborer' ? (
                    <ReviewLine label="Work proof type" value={form.laborProofType || 'Not selected'} />
                  ) : null}
                  {role === 'laborer' ? (
                    <ReviewLine label="Experience" value={form.experience || 'Not set'} />
                  ) : null}
                  {role === 'laborer' ? (
                    <ReviewLine label="Work summary" value={form.description || 'Not set'} />
                  ) : null}
                  {role === 'seller' ? (
                    <ReviewLine label="Farm photo" value={form.uploads['farm-photo'] ? 'Included' : 'Optional, not uploaded'} />
                  ) : null}
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    checked={form.riskAccepted}
                    onChange={(event) => setForm((current) => ({ ...current, riskAccepted: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">I understand false documents or impersonation can lead to rejection, account suspension, and removal from the marketplace.</span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    checked={form.consentAccepted}
                    onChange={(event) => setForm((current) => ({ ...current, consentAccepted: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">I consent to storing my KYC files for account verification and safety review.</span>
                </label>
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
                  After submission, the role will stay locked until an admin reviews the file set and approves it.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                This school-project flow imitates a safer KYC experience with stronger document checks, but it does not perform biometric or government API verification.
              </p>
              <div className="flex gap-2">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={previousStep}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                ) : null}
                {step < 3 ? (
                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={nextStep}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!completion[3] || submitting}
                    onClick={() => void onSubmit()}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    <span>{submitting ? 'Submitting KYC' : 'Submit KYC'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RolesVerification({ user, onUserUpdated }: RolesVerificationProps) {
  const [sellerStatus, setSellerStatus] = useState<VerificationStatus>('unverified');
  const [laborerStatus, setLaborerStatus] = useState<VerificationStatus>('unverified');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sellerExpanded, setSellerExpanded] = useState(false);
  const [laborerExpanded, setLaborerExpanded] = useState(false);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [laborerSubmitting, setLaborerSubmitting] = useState(false);
  const [sellerForm, setSellerForm] = useState<KycFormState>(createEmptyForm());
  const [laborerForm, setLaborerForm] = useState<KycFormState>(createEmptyForm());

  useEffect(() => {
    setSellerStatus(user?.verification?.seller || 'unverified');
    setLaborerStatus(user?.verification?.laborer || 'unverified');
  }, [user]);

  const activeRoles: { label: string; icon: ReactNode; color: string }[] = [
    { label: 'Buyer', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
  ];

  if (sellerStatus === 'verified') {
    activeRoles.push({ label: 'Verified Seller', icon: <Leaf className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' });
  }

  if (laborerStatus === 'verified') {
    activeRoles.push({ label: 'Verified Laborer', icon: <HardHat className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700' });
  }

  const handleSellerSubmit = async () => {
    setSellerSubmitting(true);
    setFeedback(null);

    try {
      const documents = (
        await Promise.all([
          uploadVerificationFile('seller', 'id-front', sellerForm.uploads['id-front']),
          uploadVerificationFile('seller', 'id-back', sellerForm.uploads['id-back']),
          uploadVerificationFile('seller', 'selfie', sellerForm.uploads['selfie']),
          uploadVerificationFile('seller', 'farm-proof', sellerForm.uploads['farm-proof']),
          sellerForm.uploads['farm-photo']
            ? uploadVerificationFile('seller', 'farm-photos', sellerForm.uploads['farm-photo'])
            : null,
        ])
      ).filter(Boolean) as VerificationUploadRecord[];

      const { user: updatedUser, message } = await applyForRole({
        role: 'seller',
        application: {
          details: {
            idType: sellerForm.idType,
            idNumber: sellerForm.idNumber,
            farmProofType: sellerForm.farmProofType,
            addressConfirmed: sellerForm.addressConfirmed,
            selfieConfirmed: sellerForm.selfieConfirmed,
            riskAccepted: sellerForm.riskAccepted,
            consentAccepted: sellerForm.consentAccepted,
          },
          documents,
        },
      });

      onUserUpdated(updatedUser);
      setFeedback({ type: 'success', message });
      setSellerStatus(updatedUser.verification?.seller || 'pending');
      setSellerExpanded(false);
      setSellerForm(createEmptyForm());
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Seller KYC failed.' });
    } finally {
      setSellerSubmitting(false);
    }
  };

  const handleLaborerSubmit = async () => {
    setLaborerSubmitting(true);
    setFeedback(null);

    try {
      const documents = (
        await Promise.all([
          uploadVerificationFile('laborer', 'id-front', laborerForm.uploads['id-front']),
          uploadVerificationFile('laborer', 'id-back', laborerForm.uploads['id-back']),
          uploadVerificationFile('laborer', 'selfie', laborerForm.uploads['selfie']),
          uploadVerificationFile('laborer', 'work-proof', laborerForm.uploads['work-proof']),
        ])
      ).filter(Boolean) as VerificationUploadRecord[];

      const { user: updatedUser, message } = await applyForRole({
        role: 'laborer',
        application: {
          details: {
            idType: laborerForm.idType,
            idNumber: laborerForm.idNumber,
            farmProofType: '',
            laborProofType: laborerForm.laborProofType,
            addressConfirmed: laborerForm.addressConfirmed,
            selfieConfirmed: laborerForm.selfieConfirmed,
            riskAccepted: laborerForm.riskAccepted,
            consentAccepted: laborerForm.consentAccepted,
          },
          documents,
          skills: laborerForm.skills,
          experience: laborerForm.experience,
          description: laborerForm.description,
        },
      });

      onUserUpdated(updatedUser);
      setFeedback({ type: 'success', message });
      setLaborerStatus(updatedUser.verification?.laborer || 'pending');
      setLaborerExpanded(false);
      setLaborerForm(createEmptyForm());
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Laborer KYC failed.' });
    } finally {
      setLaborerSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
          <ShieldCheck className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Role Verification</h3>
        </div>
      </div>
      <p className="ml-[52px] mb-5 text-sm text-gray-500">
        Protect buyers and workers with a stronger KYC-style onboarding flow before sensitive roles are unlocked.
      </p>

      {feedback ? (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mb-6">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Your Roles</p>
        <div className="flex flex-wrap gap-2">
          {activeRoles.map((role) => (
            <span key={role.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${role.color}`}>
              {role.icon}
              <span>{role.label}</span>
            </span>
          ))}
          {sellerStatus === 'pending' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              <span>Seller pending</span>
            </span>
          ) : null}
          {laborerStatus === 'pending' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              <span>Laborer pending</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-5">
        <KycWizard
          role="seller"
          title="Seller KYC"
          subtitle="Identity, farm proof, and review before the account can list products."
          icon={<Leaf className="h-6 w-6" />}
          status={sellerStatus}
          expanded={sellerExpanded}
          onToggle={() => {
            setSellerExpanded((current) => !current);
            setLaborerExpanded(false);
          }}
          form={sellerForm}
          setForm={setSellerForm}
          submitting={sellerSubmitting}
          onSubmit={handleSellerSubmit}
        />

        <KycWizard
          role="laborer"
          title="Laborer KYC"
          subtitle="Verify identity and work profile before taking job requests."
          icon={<HardHat className="h-6 w-6" />}
          status={laborerStatus}
          expanded={laborerExpanded}
          onToggle={() => {
            setLaborerExpanded((current) => !current);
            setSellerExpanded(false);
          }}
          form={laborerForm}
          setForm={setLaborerForm}
          submitting={laborerSubmitting}
          onSubmit={handleLaborerSubmit}
        />
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs text-gray-400">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>KYC files stay in private storage and are only used for verification review and account safety checks.</p>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 text-gray-500" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800">Important safety note</p>
            <p className="mt-1">
              This flow now behaves much more like a wallet-style KYC journey, but it is still a school-project version. It improves user trust through stricter capture, better review data, and private storage, yet it does not perform real biometric matching or government registry checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
