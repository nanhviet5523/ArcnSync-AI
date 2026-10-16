import React, { useState } from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';

export const ProfileSettings: React.FC = () => {
  const currentUser = getCurrentUser();
  // States thông tin cá nhân
  const [fullName, setFullName] = useState(currentUser?.name ?? 'Nguyen Linh');
  const [phone, setPhone] = useState('+84 903 112 233');
  const [email] = useState(currentUser?.email ?? 'linh.nguyen@archsync.vn');
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
  const [companyName, setCompanyName] = useState('Noi That Viet Co., Ltd');
  const [taxId, setTaxId] = useState('0312 345 678');
  const [contactPerson, setContactPerson] = useState('Nguyen Van Viet');
  const [warehouse, setWarehouse] = useState('12 Nguyen Van Linh, District 7, Ho Chi Minh City');
  const [supplierNotice, setSupplierNotice] = useState('');

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (currentUser?.role === 'supplier') {
    return (
      <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
        <Header role="supplier" />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-10 lg:px-12">
          <div className="mb-8"><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Profile &amp; Settings</h1><p className="mt-1 text-sm text-slate-500">Supplier company profile and account preferences.</p></div>
          {supplierNotice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{supplierNotice}</p>}
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:col-span-4">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-slate-900 text-2xl font-extrabold text-white">NV</div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Noi That Viet</h2>
              <div className="mt-2 flex justify-center gap-2"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Supplier · Partner</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Verified</span></div>
              <p className="mt-3 text-xs text-slate-400">{email}</p>
              <button type="button" className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Change logo</button>
              <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-left text-xs"><div className="flex justify-between"><dt className="text-slate-400">Partner since</dt><dd className="font-bold text-slate-800">Mar 2026</dd></div><div className="flex justify-between"><dt className="text-slate-400">Products</dt><dd className="font-bold text-slate-800">128</dd></div><div className="flex justify-between"><dt className="text-slate-400">Projects</dt><dd className="font-bold text-slate-800">23</dd></div><div className="flex justify-between"><dt className="text-slate-400">Avg. reply time</dt><dd className="font-bold text-slate-800">2.4 h</dd></div></dl>
              <div className="mt-6 border-t border-slate-100 pt-5 text-left"><h3 className="mb-3 text-sm font-bold text-slate-800">Verification</h3>{[['Application submitted','10 Mar 2026'],['Documents reviewed by Staff','12 Mar 2026'],['Approved as partner','14 Mar 2026']].map(([label,date])=><p key={label} className="mb-3 flex gap-2 text-xs text-slate-600"><span className="text-emerald-600">✓</span><span><b>{label}</b><small className="mt-1 block text-slate-400">{date}</small></span></p>)}</div>
            </aside>
            <div className="space-y-6 lg:col-span-8">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 font-bold text-slate-900">Company information</h2><div className="grid gap-4 sm:grid-cols-2">
                {[['Business name',companyName,setCompanyName],['Tax ID',taxId,setTaxId],['Contact person',contactPerson,setContactPerson],['Phone','+84 28 3822 1199',()=>{}]].map(([label,value,setter])=><label key={String(label)} className="text-xs font-bold text-slate-500">{label as string}<input value={value as string} onChange={(event)=>(setter as (v:string)=>void)(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800"/></label>)}
                <label className="text-xs font-bold text-slate-500">Email<input value={email} readOnly className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"/></label><label className="text-xs font-bold text-slate-500">Language<select value={language} onChange={(event)=>setLanguage(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800"><option>English</option><option>Vietnamese</option></select></label>
              </div><label className="mt-4 block text-xs font-bold text-slate-500">Warehouse address<input value={warehouse} onChange={(event)=>setWarehouse(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800"/></label><div className="mt-4"><p className="mb-2 text-xs font-bold text-slate-500">Product categories</p><div className="flex flex-wrap gap-2">{['Sofa','Table','Chair','Cabinet','Storage'].map((item)=><span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{item}</span>)}</div></div><div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 p-3"><span className="text-sm font-semibold text-slate-700">Business license.pdf <small className="block font-normal text-slate-400">Approved by Staff</small></span><span className="text-xs font-bold text-emerald-700">Verified</span></div><div className="mt-5 flex justify-end"><button type="button" onClick={()=>{setSupplierNotice('Company profile saved in this demo.');window.setTimeout(()=>setSupplierNotice(''),2500)}} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white">Save changes</button></div></section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 font-bold text-slate-900">Notifications</h2>{[['newMessage','New message'],['newFeedback','New designer inquiry'],['deadlineReminders','Low stock alert'],['weeklySummary','Weekly summary email']].map(([key,label])=><div key={key} className="flex items-center justify-between border-t border-slate-100 py-3 first:border-0"><span className="text-sm text-slate-700">{label}</span><button type="button" role="switch" aria-checked={notifications[key as keyof typeof notifications]} onClick={()=>toggleNotification(key as keyof typeof notifications)} className={`relative h-6 w-11 rounded-full ${notifications[key as keyof typeof notifications]?'bg-blue-600':'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${notifications[key as keyof typeof notifications]?'left-6':'left-1'}`}/></button></div>)}</section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 font-bold text-slate-900">Account &amp; security</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">Role<input readOnly value="Supplier Partner · Set by Admin" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm"/></label><label className="text-xs font-bold text-slate-500">Account type<input readOnly value="Partner account · invited" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm"/></label></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm font-semibold text-slate-700">Password <small className="block font-normal text-slate-400">Change your sign-in password</small></span><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Change password</button></div><div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-700">Two-factor authentication</span><button type="button" role="switch" aria-checked={twoFactorAuth} onClick={()=>setTwoFactorAuth(!twoFactorAuth)} className={`relative h-6 w-11 rounded-full ${twoFactorAuth?'bg-blue-600':'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${twoFactorAuth?'left-6':'left-1'}`}/></button></div></section>
            </div>
          </div>
        </main><Footer/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role={currentUser?.role} />

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
