import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const ProfileSettings: React.FC = () => {
  // States thông tin cá nhân
  const [fullName, setFullName] = useState('Nguyen Linh');
  const [phone, setPhone] = useState('+84 903 112 233');
  const [email] = useState('linh.nguyen@archsync.vn');
  const [language, setLanguage] = useState('English');
  const [jobTitle, setJobTitle] = useState('Interior Designer');
  const [specialty, setSpecialty] = useState('Specialty · Townhouse, Level-4 house');

  // States quản lý bật/tắt thông báo
  const [notifications, setNotifications] = useState({
    newMessage: true,
    newFeedback: true,
    deadlineReminders: true,
    weeklySummary: false,
  });

  // State 2FA
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Profile & Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              One profile page shared by every role. Fields adapt to your role.
            </p>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI (4 cols): User Avatar Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center h-fit">
            <div className="w-24 h-24 rounded-full bg-slate-900 text-white font-extrabold text-2xl flex items-center justify-center mb-4 shadow-inner">
              NL
            </div>

            <h2 className="text-lg font-bold text-slate-900">Nguyen Linh</h2>

            {/* Badge gộp dạng viên thuốc (Pill shape) chuẩn ảnh mẫu */}
            <div className="my-2">
              <span className="inline-block px-3 py-1 bg-cyan-100/70 text-cyan-900 font-bold text-xs rounded-full">
                Designer · Company
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-5">{email}</p>

            <button
              type="button"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer mb-8"
            >
              Change photo
            </button>

            {/* Metadata Info */}
            <div className="w-full pt-6 border-t border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Joined</span>
                <span className="font-bold text-slate-900">Mar 2026</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Assigned projects</span>
                <span className="font-bold text-slate-900">6</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Team</span>
                <span className="font-bold text-slate-900">Interior studio</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (8 cols): Personal Info, Notifications, Account & Security */}
          <div className="lg:col-span-8 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 mb-5">
                Personal information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Vietnamese">Vietnamese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Job title (optional)
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Role-specific field
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Save changes
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 mb-5">
                Notifications
              </h3>

              <div className="space-y-4 text-xs font-medium text-slate-800">
                <div className="flex items-center justify-between">
                  <span>New message</span>
                  <button
                    type="button"
                    onClick={() => toggleNotification('newMessage')}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      notifications.newMessage ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                        notifications.newMessage ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span>New version or feedback on my project</span>
                  <button
                    type="button"
                    onClick={() => toggleNotification('newFeedback')}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      notifications.newFeedback ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                        notifications.newFeedback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span>Project deadline reminders</span>
                  <button
                    type="button"
                    onClick={() => toggleNotification('deadlineReminders')}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      notifications.deadlineReminders ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                        notifications.deadlineReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span>Weekly summary email</span>
                  <button
                    type="button"
                    onClick={() => toggleNotification('weeklySummary')}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      notifications.weeklySummary ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                        notifications.weeklySummary ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Account & Security */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 mb-5">
                Account & security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Role
                  </label>
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                    <span>Designer</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-md border border-amber-200">
                      Set by Admin
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Account type
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-500">
                    Company account · invited
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between py-3 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Password</h4>
                  <p className="text-[11px] text-slate-400">
                    Last changed 3 months ago
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Change password
                </button>
              </div>

              {/* Two-factor authentication */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Two-factor authentication
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Extra sign-in step for company accounts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                  className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    twoFactorAuth ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                      twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfileSettings;