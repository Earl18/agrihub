import { useState } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, Camera, Building } from 'lucide-react';
import { RolesVerification } from './RolesVerification';
import { getSessionUser } from '../../shared/auth/session';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  farmName: string;
  location: string;
  farmSize: string;
  experience: string;
  specialization: string;
}

export function Profile() {
  const sessionUser = getSessionUser();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: sessionUser?.name || 'Guest User',
    email: sessionUser?.email || 'Not logged in',
    phone: '',
    farmName: '',
    location: '',
    farmSize: '',
    experience: '',
    specialization: '',
  });

  const [editedData, setEditedData] = useState<ProfileData>(profileData);

  const stats = [
    { label: 'Total Sales', value: '$125,430', color: 'text-green-600' },
    { label: 'Total Purchases', value: '$45,230', color: 'text-blue-600' },
    { label: 'Workers Hired', value: '45', color: 'text-purple-600' },
    { label: 'Services Booked', value: '28', color: 'text-orange-600' },
  ];

  const handleSave = () => {
    setProfileData(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <button className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profileData.name}</h2>
              <p className="text-gray-600">{profileData.farmName}</p>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {profileData.location}
              </p>
            </div>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="mt-4 md:mt-0 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.name}
                onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.name}</p>
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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.email}</p>
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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.phone}</p>
            )}
          </div>

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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.farmName}</p>
            )}
          </div>

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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.location}</p>
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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.farmSize}</p>
            )}
          </div>

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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.experience}</p>
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
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{profileData.specialization}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Account Roles & Verification */}
      <RolesVerification />
    </div>
  );
}
