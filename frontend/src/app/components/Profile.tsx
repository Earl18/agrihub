import { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, Camera, Building, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { RolesVerification } from './RolesVerification';
import {
  createProfileAvatarUploadUrl,
  getCurrentUserProfile,
  requestCurrentUserEmailChange,
  updateCurrentUserProfile,
  verifyCurrentUserEmailChange,
} from '../../features/app/api';
import {
  clearSession,
  getSessionUser,
  isAdminUser,
  persistSessionUser,
  SessionUser,
} from '../../shared/auth/session';
import { requireSupabaseClient } from '../../shared/supabase/client';
import { DefaultProfileAvatar } from './ui/default-profile-avatar';
import { SmoothedAvatarImage } from './ui/smoothed-avatar-image';

interface ProfileData {
  firstName: string;
  middleName: string;
  lastName: string;
  age: string;
  gender: string;
  dateOfBirth: string;
  civilStatus: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  farmName: string;
  location: string;
  farmSize: string;
  experience: string;
  specialization: string;
  avatarUrl: string;
}

const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_OUTPUT_TYPE = 'image/jpeg';
const AVATAR_OUTPUT_QUALITY = 0.92;
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Prefer not to say'];

const EMPTY_PROFILE: ProfileData = {
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: '',
  dateOfBirth: '',
  civilStatus: '',
  nationality: '',
  email: '',
  phone: '',
  address: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  latitude: '',
  longitude: '',
  farmName: '',
  location: '',
  farmSize: '',
  experience: '',
  specialization: '',
  avatarUrl: '',
};

function splitName(fullName?: string) {
  const trimmed = fullName?.trim() || '';

  if (!trimmed) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function combineName(profile: Pick<ProfileData, 'firstName' | 'middleName' | 'lastName'>) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

function mapUserToProfile(user?: Partial<SessionUser> & { phone?: string; profile?: any } | null): ProfileData {
  const storedFirstName = user?.profile?.firstName;
  const storedMiddleName = user?.profile?.middleName;
  const storedLastName = user?.profile?.lastName;
  const nameParts =
    storedFirstName !== undefined || storedMiddleName !== undefined || storedLastName !== undefined
      ? {
          firstName: storedFirstName || '',
          middleName: storedMiddleName || '',
          lastName: storedLastName || '',
        }
      : splitName(user?.name);

  return {
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    age: user?.profile?.age || '',
    gender: user?.profile?.gender || '',
    dateOfBirth: user?.profile?.dateOfBirth || '',
    civilStatus: user?.profile?.civilStatus || '',
    nationality: user?.profile?.nationality || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.profile?.address || '',
    streetAddress: user?.profile?.streetAddress || '',
    city: user?.profile?.city || '',
    state: user?.profile?.state || '',
    postalCode: user?.profile?.postalCode || '',
    country: user?.profile?.country || '',
    latitude:
      user?.profile?.coordinates?.lat === null || user?.profile?.coordinates?.lat === undefined
        ? ''
        : String(user.profile.coordinates.lat),
    longitude:
      user?.profile?.coordinates?.lng === null || user?.profile?.coordinates?.lng === undefined
        ? ''
        : String(user.profile.coordinates.lng),
    farmName: user?.profile?.farmName || '',
    location: user?.profile?.location || '',
    farmSize: user?.profile?.farmSize || '',
    experience: user?.profile?.experience || '',
    specialization: user?.profile?.specialization || '',
    avatarUrl: user?.profile?.avatarUrl || '',
  };
}

function getDisplayValue(value: string, fallback = 'Not set') {
  return value?.trim() ? value : fallback;
}

function buildAvatarFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

  return `${baseName}-smoothed.jpg`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to process the selected image.'));
    };

    image.src = objectUrl;
  });
}

async function smoothAvatarImage(file: File) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image processing is not available in this browser.');
  }

  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const sourceSize = Math.min(image.width, image.height);
  const sourceX = (image.width - sourceSize) / 2;
  const sourceY = (image.height - sourceSize) / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
        return;
      }

      reject(new Error('Unable to smooth the selected image.'));
    }, AVATAR_OUTPUT_TYPE, AVATAR_OUTPUT_QUALITY);
  });

  const processedFile = new File([blob], buildAvatarFileName(file.name), {
    type: AVATAR_OUTPUT_TYPE,
    lastModified: Date.now(),
  });

  return {
    previewUrl: URL.createObjectURL(blob),
    uploadFile: processedFile,
  };
}

function profilesMatch(left: ProfileData, right: ProfileData) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getVerificationStatus(user: SessionUser | null, role: 'seller' | 'laborer') {
  return user?.verification?.[role] || 'unverified';
}

function getMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
}

function extractLocationSummary(place: any) {
  let sublocality = '';
  let locality = '';
  let adminArea = '';
  let country = '';

  for (const component of place.address_components || []) {
    const types = component.types || [];

    if (!sublocality && (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood'))) {
      sublocality = component.long_name;
    }

    if (!locality && (types.includes('locality') || types.includes('postal_town') || types.includes('sublocality_level_1'))) {
      locality = component.long_name;
    }

    if (!adminArea && types.includes('administrative_area_level_1')) {
      adminArea = component.short_name;
    }

    if (!country && types.includes('country')) {
      country = component.long_name;
    }
  }

  return [sublocality, locality, adminArea, country].filter(Boolean).join(', ');
}

function extractStructuredAddress(place: any) {
  let streetNumber = '';
  let route = '';
  let premise = '';
  let sublocality = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  for (const component of place.address_components || []) {
    const types = component.types || [];

    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    }

    if (types.includes('route')) {
      route = component.long_name;
    }

    if (!premise && (types.includes('premise') || types.includes('establishment') || types.includes('point_of_interest'))) {
      premise = component.long_name;
    }

    if (!sublocality && (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood'))) {
      sublocality = component.long_name;
    }

    if (!city && (types.includes('locality') || types.includes('postal_town') || types.includes('sublocality_level_1'))) {
      city = component.long_name;
    }

    if (!state && types.includes('administrative_area_level_1')) {
      state = component.short_name;
    }

    if (!postalCode && types.includes('postal_code')) {
      postalCode = component.long_name;
    }

    if (!country && types.includes('country')) {
      country = component.long_name;
    }
  }

  return {
    streetAddress: [streetNumber, route].filter(Boolean).join(' ').trim() || premise,
    city: city || sublocality,
    state,
    postalCode,
    country,
  };
}

export function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionUser = getSessionUser();
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionUser | null>(sessionUser);
  const [profileData, setProfileData] = useState<ProfileData>(mapUserToProfile(sessionUser) || EMPTY_PROFILE);
  const [editedData, setEditedData] = useState<ProfileData>(profileData);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailVerificationBusy, setEmailVerificationBusy] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const previewObjectUrlRef = useRef<string | null>(null);

  const loadProfile = () => {
    getCurrentUserProfile()
      .then(({ user }) => {
      const nextProfile = mapUserToProfile(user);
      setProfileData(nextProfile);
      setEditedData(nextProfile);
      setSessionMeta(user);
      persistSessionUser({
          id: user.id,
          name: user.name,
          email: user.email,
        role: user.role,
        accountType: user.accountType,
        roles: user.roles,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        penalty: user.penalty,
        canManageCommercialFeatures: user.canManageCommercialFeatures,
        phone: user.phone,
        profile: user.profile,
        verification: user.verification,
        verificationMeta: user.verificationMeta,
        emailChangePending: user.emailChangePending,
      });
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    setEditedData(profileData);
  }, [profileData]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const sellerVerified = getVerificationStatus(sessionMeta, 'seller') === 'verified';
  const laborerVerified = getVerificationStatus(sessionMeta, 'laborer') === 'verified';
  const requestedKycRole = searchParams.get('kyc');
  const defaultExpandedRole =
    requestedKycRole === 'seller' || requestedKycRole === 'laborer' ? requestedKycRole : null;
  const canAccessAdmin = isAdminUser(sessionMeta);
  const showFarmFields = sellerVerified;
  const showLaborFields = laborerVerified;
  const mapsApiKey = getMapsApiKey();
  const hasUnsavedChanges = !profilesMatch(editedData, profileData) || pendingAvatarFile !== null;
  const displayAvatarUrl = isEditing ? editedData.avatarUrl : profileData.avatarUrl;
  const penaltyStatus = sessionMeta?.penalty?.status || 'good';
  const hasAccountPenalty = penaltyStatus !== 'good';
  const pendingEmailChange = sessionMeta?.emailChangePending || null;
  useEffect(() => {
    if (!mapsApiKey) {
      return;
    }

    if (window.google?.maps?.places) {
      setMapsReady(true);
      return;
    }

    const existingScript = document.querySelector('script[data-google-maps-places="true"]') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => setMapsReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsPlaces = 'true';
    script.onload = () => setMapsReady(true);
    document.head.appendChild(script);
  }, [mapsApiKey]);

  useEffect(() => {
    if (!isEditing || !mapsReady || !addressInputRef.current || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      fields: ['formatted_address', 'geometry', 'address_components', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const formattedAddress = place.formatted_address || place.name || addressInputRef.current?.value || '';
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const locationSummary = extractLocationSummary(place);
      const structuredAddress = extractStructuredAddress(place);

      setEditedData((current) => ({
        ...current,
        address: formattedAddress,
        location: locationSummary || current.location,
        streetAddress: structuredAddress.streetAddress || current.streetAddress,
        city: structuredAddress.city || current.city,
        state: structuredAddress.state || current.state,
        postalCode: structuredAddress.postalCode || current.postalCode,
        country: structuredAddress.country || current.country,
        latitude: lat === undefined ? current.latitude : String(lat),
        longitude: lng === undefined ? current.longitude : String(lng),
      }));
    });

    autocompleteRef.current = autocomplete;

    return () => {
      autocompleteRef.current = null;
    };
  }, [isEditing, mapsReady]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      let avatarPath: string | undefined;
      let successMessage = 'Profile updated successfully.';

      if (pendingAvatarFile) {
        const supabase = requireSupabaseClient();
        const uploadTarget = await createProfileAvatarUploadUrl({
          fileName: pendingAvatarFile.name,
        });
        const { error } = await supabase.storage
          .from(uploadTarget.bucket)
          .uploadToSignedUrl(uploadTarget.path, uploadTarget.token, pendingAvatarFile);

        if (error) {
          throw new Error(error.message || 'Unable to upload the profile picture.');
        }

        avatarPath = uploadTarget.path;
      }

      const { user } = await updateCurrentUserProfile({
        name: combineName(editedData),
        email: profileData.email,
        phone: editedData.phone,
        profile: {
          firstName: editedData.firstName,
          middleName: editedData.middleName,
          lastName: editedData.lastName,
          age: editedData.age,
          gender: editedData.gender,
          dateOfBirth: editedData.dateOfBirth,
          civilStatus: editedData.civilStatus,
          nationality: editedData.nationality,
          address: editedData.address,
          streetAddress: editedData.streetAddress,
          city: editedData.city,
          state: editedData.state,
          postalCode: editedData.postalCode,
          country: editedData.country,
          coordinates: {
            lat: editedData.latitude ? Number(editedData.latitude) : null,
            lng: editedData.longitude ? Number(editedData.longitude) : null,
          },
          ...(showFarmFields
            ? {
                farmName: editedData.farmName,
                farmSize: editedData.farmSize,
              }
            : {}),
          ...(showFarmFields || showLaborFields
            ? {
                location: editedData.location,
              }
            : {}),
          ...(showLaborFields
            ? {
                experience: editedData.experience,
                specialization: editedData.specialization,
              }
            : {}),
          ...(avatarPath ? { avatarPath } : {}),
          ...(!avatarPath ? { avatarUrl: editedData.avatarUrl } : {}),
        },
      });

      const nextEmail = editedData.email.trim().toLowerCase();
      const currentEmail = profileData.email.trim().toLowerCase();

      if (nextEmail && nextEmail !== currentEmail) {
        const emailChangeResult = await requestCurrentUserEmailChange(nextEmail);
        setEmailVerificationCode('');
        setShowEmailVerificationModal(false);
        successMessage = emailChangeResult.message;
      }

      const nextProfile = mapUserToProfile(user);
      setProfileData(nextProfile);
      setEditedData(nextProfile);
      setEmailVerificationCode('');
      setShowEmailVerificationModal(false);
      const nextSessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        roles: user.roles,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        penalty: user.penalty,
        canManageCommercialFeatures: user.canManageCommercialFeatures,
        phone: user.phone,
        profile: user.profile,
        verification: user.verification,
        verificationMeta: user.verificationMeta,
        emailChangePending: user.emailChangePending,
      };
      persistSessionUser(nextSessionUser);
      setSessionMeta(nextSessionUser);
      setSaveMessage({ type: 'success', text: successMessage });
      setIsEditing(false);
      setPendingAvatarFile(null);
      loadProfile();
    } catch (error: any) {
      setSaveMessage({
        type: 'error',
        text: error?.message || 'Unable to save your profile right now.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setSaveMessage(null);
    setIsEditing(false);
    setPendingAvatarFile(null);
  };

  const closeEmailVerificationModal = () => {
    setShowEmailVerificationModal(false);
    setEmailVerificationCode('');
    setEmailVerificationMessage(null);
  };

  const handleVerifyEmailChange = async () => {
    if (!pendingEmailChange?.email || !emailVerificationCode.trim()) {
      setEmailVerificationMessage({ type: 'error', text: 'Enter the verification code sent to your new email.' });
      return;
    }

    setEmailVerificationBusy(true);
    setEmailVerificationMessage(null);

    try {
      const { user, message } = await verifyCurrentUserEmailChange(
        pendingEmailChange.email,
        emailVerificationCode.trim(),
      );

      const nextProfile = mapUserToProfile(user);
      setProfileData(nextProfile);
      setEditedData(nextProfile);
      closeEmailVerificationModal();
      setSessionMeta(user);
      persistSessionUser(user);
      setSaveMessage({ type: 'success', text: message });
      loadProfile();
    } catch (error: any) {
      setEmailVerificationMessage({
        type: 'error',
        text: error?.message || 'Unable to verify the new email address right now.',
      });
    } finally {
      setEmailVerificationBusy(false);
    }
  };

  const handleResendEmailChangeCode = async () => {
    if (!pendingEmailChange?.email) {
      return;
    }

    setEmailVerificationBusy(true);
    setEmailVerificationMessage(null);

    try {
      const response = await requestCurrentUserEmailChange(pendingEmailChange.email);
      setEmailVerificationMessage({ type: 'success', text: response.message });
    } catch (error: any) {
      setEmailVerificationMessage({
        type: 'error',
        text: error?.message || 'Unable to resend the verification code right now.',
      });
    } finally {
      setEmailVerificationBusy(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const handleProfilePhotoClick = () => {
    if (!isEditing) {
      return;
    }

    photoInputRef.current?.click();
  };

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please choose an image file for your profile photo.' });
      event.target.value = '';
      return;
    }

    try {
      const processedAvatar = await smoothAvatarImage(file);

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      previewObjectUrlRef.current = processedAvatar.previewUrl;
      setEditedData((current) => ({
        ...current,
        avatarUrl: processedAvatar.previewUrl,
      }));
      setPendingAvatarFile(processedAvatar.uploadFile);
      setSaveMessage(null);
    } catch (error: any) {
      setSaveMessage({
        type: 'error',
        text: error?.message || 'Unable to process your profile photo right now.',
      });
    }

    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {pendingEmailChange?.email ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">New email is waiting for verification</p>
              <p className="mt-1">
                Your current login email stays as {profileData.email} until {pendingEmailChange.email} is verified.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Unverified
              </span>
                <button
                  onClick={() => {
                    setEmailVerificationMessage(null);
                    setShowEmailVerificationModal(true);
                  }}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  Verify New Email
                </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        {saveMessage && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              saveMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {saveMessage.text}
          </div>
        )}
        {hasAccountPenalty && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              penaltyStatus === 'warned'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <p className="font-medium">
              Account status: {penaltyStatus.charAt(0).toUpperCase() + penaltyStatus.slice(1)}
            </p>
            <p className="mt-1">{sessionMeta?.penalty?.reason || 'An admin placed a penalty on this account.'}</p>
            {sessionMeta?.penalty?.expiresAt ? (
              <p className="mt-1">Expires: {new Date(sessionMeta.penalty.expiresAt).toLocaleString()}</p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-28 h-28 overflow-hidden rounded-full flex items-center justify-center ring-1 ring-gray-200 shadow-sm">
                {displayAvatarUrl ? (
                  <SmoothedAvatarImage
                    src={displayAvatarUrl}
                    alt="Profile"
                    className="block h-full w-full object-cover object-center"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <DefaultProfileAvatar showCameraBadge={isEditing} />
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleProfilePhotoClick}
                  className="absolute bottom-0 right-0 rounded-full bg-green-600 p-2 text-white hover:bg-green-700 cursor-pointer"
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{getDisplayValue(combineName(profileData), 'Buyer Account')}</h2>
              {showFarmFields && (
                <p className="text-gray-600">{getDisplayValue(profileData.farmName, 'Farm name not set')}</p>
              )}
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {getDisplayValue(profileData.address || profileData.location, 'Address not set')}
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            {canAccessAdmin ? (
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 flex items-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>
            ) : null}
            <button
              onClick={handleLogout}
              className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isEditing ? isSaving || !hasUnsavedChanges : isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.firstName}
                onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.firstName)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.middleName}
                onChange={(e) => setEditedData({ ...editedData, middleName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.middleName)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.lastName}
                onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.lastName)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            {isEditing ? (
              <input
                type="text"
                inputMode="numeric"
                value={editedData.age}
                onChange={(e) => setEditedData({ ...editedData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.age, 'Not set')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            {isEditing ? (
              <select
                value={editedData.gender}
                onChange={(e) => setEditedData({ ...editedData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.gender)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            {isEditing ? (
              <input
                type="date"
                value={editedData.dateOfBirth}
                onChange={(e) => setEditedData({ ...editedData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.dateOfBirth)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Civil Status</label>
            {isEditing ? (
              <select
                value={editedData.civilStatus}
                onChange={(e) => setEditedData({ ...editedData, civilStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select civil status</option>
                {CIVIL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.civilStatus)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.nationality}
                onChange={(e) => setEditedData({ ...editedData, nationality: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.nationality)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editedData.email}
                onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 px-4 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>{getDisplayValue(pendingEmailChange?.email || profileData.email)}</span>
                    {pendingEmailChange?.email ? (
                      <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        Unverified
                      </span>
                    ) : (
                      <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={editedData.phone}
                onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.phone, '0')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Address
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  ref={addressInputRef}
                  type="text"
                  value={editedData.address}
                  onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                  placeholder={mapsApiKey ? 'Search sitio, barangay, town, landmark, or full address' : 'Enter your address'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500">
                  {mapsApiKey
                    ? 'You can search by sitio, barangay, landmark, town, or full address for a more accurate location pin.'
                    : 'Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps address autocomplete.'}
                </p>
              </div>
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.address)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.streetAddress}
                onChange={(e) => setEditedData({ ...editedData, streetAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.streetAddress)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.city}
                onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.city)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province/State</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.state}
                onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.state)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.postalCode}
                onChange={(e) => setEditedData({ ...editedData, postalCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.postalCode)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.country}
                onChange={(e) => setEditedData({ ...editedData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.country)}</p>
            )}
          </div>

          {(showFarmFields || showLaborFields) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.location}
                  onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.location)}</p>
              )}
            </div>
          )}

          {showFarmFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-2" />
                  Farm Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.farmName}
                    onChange={(e) => setEditedData({ ...editedData, farmName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.farmName)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm Size</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.farmSize}
                    onChange={(e) => setEditedData({ ...editedData, farmSize: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.farmSize, '0')}</p>
                )}
              </div>
            </>
          )}

          {showLaborFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.experience}
                    onChange={(e) => setEditedData({ ...editedData, experience: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.experience, '0')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.specialization}
                    onChange={(e) => setEditedData({ ...editedData, specialization: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.specialization)}</p>
                )}
              </div>
            </>
          )}
        </div>

        {!showFarmFields && !showLaborFields && (
          <p className="mt-4 text-sm text-gray-500">
            Buyer accounts only need basic information. Farm and work details will appear after seller or laborer verification.
          </p>
        )}

        {isEditing && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Account Roles & Verification */}
      <RolesVerification
        user={sessionMeta}
        defaultExpandedRole={defaultExpandedRole}
        onUserUpdated={(user) => {
          setSessionMeta(user);
          persistSessionUser(user);
          loadProfile();
        }}
      />

      {showEmailVerificationModal && pendingEmailChange?.email ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeEmailVerificationModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Verify New Email</h3>
              <p className="mt-1 text-sm text-gray-500">
                Enter the 6-digit code sent to {pendingEmailChange.email}.
              </p>
            </div>

            <div className="space-y-4">
              {emailVerificationMessage ? (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    emailVerificationMessage.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {emailVerificationMessage.text}
                </div>
              ) : null}

              <input
                type="text"
                inputMode="numeric"
                value={emailVerificationCode}
                onChange={(event) => setEmailVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleResendEmailChangeCode}
                  disabled={emailVerificationBusy}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend Code
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={closeEmailVerificationModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyEmailChange}
                    disabled={emailVerificationBusy || emailVerificationCode.trim().length < 6}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {emailVerificationBusy ? 'Verifying...' : 'Submit Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
