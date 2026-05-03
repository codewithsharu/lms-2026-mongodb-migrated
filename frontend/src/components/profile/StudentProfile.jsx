import React, { useState, useEffect } from 'react';
import { FiMail, FiHash, FiBook, FiLayers, FiMapPin, FiUsers, FiLoader, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import profileApi from '../../services/profileApi';

// GitHub-style avatar colors
const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500', 
  'bg-yellow-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-gray-500'
];

const getAvatarColor = (userId) => {
  if (!userId) return 'bg-gray-500';
  const hash = userId.toString().split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
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

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  
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
            {/* Avatar */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-3 border-white shadow-lg ${getAvatarColor(profile?.user?.id)} flex items-center justify-center text-white font-semibold text-lg`}>
                {getInitials(profile?.user?.full_name)}
              </div>
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
