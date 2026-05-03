import React, { useState, useEffect } from 'react';
import { FiMail, FiHash, FiBook, FiLayers, FiMapPin, FiUsers, FiLoader, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import profileApi from '../../services/profileApi';

// Enhanced avatar options with more diverse and professional choices
const AVATAR_OPTIONS = [
  // Professional Male Avatars
  { id: 'male1', gender: 'male', icon: '👨‍💼', color: 'bg-blue-500', style: 'professional' },
  { id: 'male2', gender: 'male', icon: '👨‍🎓', color: 'bg-indigo-500', style: 'professional' },
  { id: 'male3', gender: 'male', icon: '👨‍💻', color: 'bg-purple-500', style: 'professional' },
  { id: 'male4', gender: 'male', icon: '👨‍🏫', color: 'bg-slate-600', style: 'professional' },
  { id: 'male5', gender: 'male', icon: '👨‍🔬', color: 'bg-cyan-500', style: 'professional' },
  { id: 'male6', gender: 'male', icon: '👨‍🔧', color: 'bg-emerald-500', style: 'professional' },
  // Professional Female Avatars
  { id: 'female1', gender: 'female', icon: '👩‍💼', color: 'bg-emerald-500', style: 'professional' },
  { id: 'female2', gender: 'female', icon: '👩‍🎓', color: 'bg-pink-500', style: 'professional' },
  { id: 'female3', gender: 'female', icon: '👩‍💻', color: 'bg-rose-500', style: 'professional' },
  { id: 'female4', gender: 'female', icon: '👩‍🏫', color: 'bg-amber-500', style: 'professional' },
  { id: 'female5', gender: 'female', icon: '👩‍🔬', color: 'bg-orange-500', style: 'professional' },
  { id: 'female6', gender: 'female', icon: '👩‍🔧', color: 'bg-teal-500', style: 'professional' },
  // Casual/Modern Avatars
  { id: 'casual1', gender: 'neutral', icon: '😊', color: 'bg-green-500', style: 'casual' },
  { id: 'casual2', gender: 'neutral', icon: '🤠', color: 'bg-yellow-500', style: 'casual' },
  { id: 'casual3', gender: 'neutral', icon: '🤖', color: 'bg-red-500', style: 'casual' },
  { id: 'casual4', gender: 'neutral', icon: '🎭', color: 'bg-purple-500', style: 'casual' },
  { id: 'casual5', gender: 'neutral', icon: '🦄', color: 'bg-blue-500', style: 'casual' },
  { id: 'casual6', gender: 'neutral', icon: '🐱', color: 'bg-indigo-500', style: 'casual' },
  // Abstract/Artistic Avatars
  { id: 'abstract1', gender: 'neutral', icon: '🌟', color: 'bg-gradient-to-r from-yellow-400 to-orange-500', style: 'artistic' },
  { id: 'abstract2', gender: 'neutral', icon: '🌈', color: 'bg-gradient-to-r from-blue-400 to-purple-600', style: 'artistic' },
  { id: 'abstract3', gender: 'neutral', icon: '🌊', color: 'bg-gradient-to-r from-cyan-400 to-blue-600', style: 'artistic' },
  { id: 'abstract4', gender: 'neutral', icon: '🌸', color: 'bg-gradient-to-r from-pink-400 to-rose-500', style: 'artistic' },
  { id: 'abstract5', gender: 'neutral', icon: '🌺', color: 'bg-gradient-to-r from-purple-400 to-indigo-600', style: 'artistic' },
  // Upload Custom Avatar
  { id: 'custom', gender: 'neutral', icon: '📷', color: 'bg-gray-500', style: 'custom' },
];

// Default male avatar
const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

// Get avatar from localStorage or use default
const getStoredAvatar = (userId) => {
  const key = `user_avatar_${userId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    return AVATAR_OPTIONS.find(a => a.id === stored) || DEFAULT_AVATAR;
  }
  return DEFAULT_AVATAR;
};

// Save avatar to localStorage
const storeAvatar = (userId, avatarId) => {
  const key = `user_avatar_${userId}`;
  localStorage.setItem(key, avatarId);
};

// Teacher avatar generator
const getTeacherAvatar = (name) => {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

const StudentProfile = ({ studentId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  useEffect(() => {
    if (profile?.user?.id) {
      setSelectedAvatar(getStoredAvatar(profile.user.id));
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getStudentProfile(studentId);
      if (response.success) {
        setProfile(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);
    if (profile?.user?.id) {
      storeAvatar(profile.user.id, avatar.id);
    }
    setShowAvatarSelector(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-blue-500 text-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12 text-slate-500">
        {error || 'Profile not found'}
      </div>
    );
  }

  const { user, academic_info, teachers, statistics } = profile;

  const getZoneColor = (zone) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      green: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[zone] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Avatar with edit button */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-3 border-white shadow-lg ${selectedAvatar.color} flex items-center justify-center text-2xl`}>
                {selectedAvatar.icon}
              </div>
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Change Profile Picture"
              >
                <FiEdit2 className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.full_name}</h1>
              <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
                <FiMail className="text-xs" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid with icons */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiHash className="text-blue-600 text-sm" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Roll Number</p>
              <p className="text-sm font-semibold text-slate-900">{academic_info.roll_number}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiBook className="text-purple-600 text-sm" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Class</p>
              <p className="text-sm font-semibold text-slate-900">{academic_info.class?.name || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FiLayers className="text-amber-600 text-sm" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Section</p>
              <p className="text-sm font-semibold text-slate-900">{academic_info.section?.name || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FiMapPin className="text-emerald-600 text-sm" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Zone</p>
              {academic_info.zone ? (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${getZoneColor(academic_info.zone)}`}>
                  {academic_info.zone.toUpperCase()}
                </span>
              ) : (
                <p className="text-sm font-semibold text-slate-900">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-lg">Choose Your Avatar</h2>
              <button 
                onClick={() => setShowAvatarSelector(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              {/* Avatar Categories */}
              <div className="space-y-6">
                {/* Professional Avatars */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
                    Professional
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_OPTIONS.filter(a => a.style === 'professional').map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarSelect(avatar)}
                        className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          selectedAvatar.id === avatar.id 
                            ? avatar.gender === 'male' ? 'border-blue-500 bg-blue-50' : 'border-pink-500 bg-pink-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-full aspect-square rounded-full ${avatar.color} flex items-center justify-center text-2xl`}>
                          {avatar.icon}
                        </div>
                        {selectedAvatar.id === avatar.id && (
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                            avatar.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                          }`}>
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Casual/Modern Avatars */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-100 rounded-full"></div>
                    Casual & Modern
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_OPTIONS.filter(a => a.style === 'casual').map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarSelect(avatar)}
                        className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          selectedAvatar.id === avatar.id 
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-full aspect-square rounded-full ${avatar.color} flex items-center justify-center text-2xl`}>
                          {avatar.icon}
                        </div>
                        {selectedAvatar.id === avatar.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Artistic Avatars */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-100 rounded-full"></div>
                    Artistic
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_OPTIONS.filter(a => a.style === 'artistic').map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarSelect(avatar)}
                        className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          selectedAvatar.id === avatar.id 
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-full aspect-square rounded-full ${avatar.color} flex items-center justify-center text-2xl`}>
                          {avatar.icon}
                        </div>
                        {selectedAvatar.id === avatar.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-purple-500">
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Upload */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-100 rounded-full"></div>
                    Custom Upload
                  </h3>
                  <button
                    className="w-full p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors"
                    onClick={() => {
                      // TODO: Implement custom avatar upload
                      alert('Custom avatar upload coming soon!');
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <FiUpload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Upload your own image</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FiUsers className="text-indigo-500" />
            <h2 className="font-semibold text-slate-900">Assigned Teachers</h2>
            <span className="ml-2 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
              {statistics.total_teachers}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {teachers.length > 0 ? (
            teachers.map((teacher, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <img 
                    src={getTeacherAvatar(teacher.full_name)}
                    alt={teacher.full_name}
                    className="w-10 h-10 rounded-full bg-slate-100"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{teacher.full_name}</p>
                    <p className="text-sm text-slate-500">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-md font-medium">
                    {teacher.class_name}
                  </span>
                  {teacher.section_name && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                      {teacher.section_name}
                    </span>
                  )}
                  {teacher.zone && (
                    <span className={`px-2 py-1 text-xs rounded-md font-medium border ${getZoneColor(teacher.zone)}`}>
                      {teacher.zone.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiUsers className="text-slate-400 text-2xl" />
              </div>
              <p className="text-slate-500">No teachers assigned yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
