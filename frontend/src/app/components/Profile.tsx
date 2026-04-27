import { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, Camera, Building, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { RolesVerification } from './RolesVerification';
import { createProfileAvatarUploadUrl, getCurrentUserProfile, updateCurrentUserProfile } from '../../features/app/api';
import { clearSession, getSessionUser, getUserInitials, persistSessionUser, SessionUser } from '../../shared/auth/session';
import { requireSupabaseClient } from '../../shared/supabase/client';
import { SmoothedAvatarImage } from './ui/smoothed-avatar-image';

interface ProfileData {
  firstName: string;
  middleName: string;
  lastName: string;
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

const EMPTY_PROFILE: ProfileData = {
  firstName: '',
  middleName: '',
  lastName: '',
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

function getProfileInitials(profile: Pick<ProfileData, 'firstName' | 'middleName' | 'lastName'>) {
  return getUserInitials(combineName(profile));
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
        phone: user.phone,
        profile: user.profile,
        verification: user.verification,
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
  const showFarmFields = sellerVerified;
  const showLaborFields = laborerVerified;
  const mapsApiKey = getMapsApiKey();
  const hasUnsavedChanges = !profilesMatch(editedData, profileData) || pendingAvatarFile !== null;
  const displayAvatarUrl = isEditing ? editedData.avatarUrl : profileData.avatarUrl;
  const displayInitials = getProfileInitials(isEditing ? editedData : profileData);

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
        email: editedData.email,
        phone: editedData.phone,
        profile: {
          firstName: editedData.firstName,
          middleName: editedData.middleName,
          lastName: editedData.lastName,
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

      const nextProfile = mapUserToProfile(user);
      setProfileData(nextProfile);
      setEditedData(nextProfile);
      const nextSessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        roles: user.roles,
        phone: user.phone,
        profile: user.profile,
        verification: user.verification,
      };
      persistSessionUser(nextSessionUser);
      setSessionMeta(nextSessionUser);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully.' });
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
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <span className="text-3xl font-semibold">{displayInitials}</span>
                  </div>
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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{getDisplayValue(profileData.email)}</p>
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
        onUserUpdated={(user) => {
          setSessionMeta(user);
          persistSessionUser(user);
          loadProfile();
        }}
      />
    </div>
  );
}
