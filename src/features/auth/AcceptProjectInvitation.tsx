import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Home,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Logo, PasswordInput } from '@/components/common';

type FormErrors = Partial<Record<'name' | 'phone' | 'password' | 'confirmPassword' | 'terms', string>>;

const SAMPLE_INVITEE_EMAIL = 'minhanh@example.com';
const PHONE_REGEX = /^0\d{9}$/;

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

export const AcceptProjectInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitedEmail = (searchParams.get('email') ?? '').trim() || SAMPLE_INVITEE_EMAIL;
  const expired = searchParams.get('state') === 'expired';
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [complete, setComplete] = useState(false);

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    number: /\d/.test(password),
    uppercase: /[A-Z]/.test(password),
  }), [password]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!fullName.trim()) nextErrors.name = 'Enter your full name.';
    if (!PHONE_REGEX.test(phone.trim())) nextErrors.phone = 'Enter a 10-digit phone number starting with 0.';
    if (!passwordChecks.length || !passwordChecks.number || !passwordChecks.uppercase) {
      nextErrors.password = 'Use at least 8 characters, one number and one uppercase letter.';
    }
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) nextErrors.terms = 'Please accept the terms to continue.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setComplete(true);
  };

  const fieldError = (message?: string) => message
    ? <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">
        Sample data – not connected to API
      </div>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Logo size={34} to="/" />
          <Link to="/login" className="text-sm font-semibold text-blue-700 transition hover:text-blue-900">
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <Mail size={22} />
          </span>
          <p className="mt-4 text-sm font-semibold text-blue-700">Project invitation</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Join your interior design project
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            You’ve been invited as the homeowner. Create your account to see the project brief, share requirements and collaborate with your design team.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-left" aria-label="Project setup progress">
            {['Accept invitation', 'Share requirements', 'Review concepts'].map((step, index) => (
              <div key={step} className={`rounded-xl border px-3 py-3 ${index === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <div className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</div>
                <p className={`mt-2 text-xs font-semibold ${index === 0 ? 'text-blue-800' : 'text-slate-500'}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {expired ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700"><Clock3 size={22} /></span>
            <h2 className="mt-4 text-xl font-bold">This invitation has expired</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ask the project staff member to send a new invitation link.</p>
            <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Back to ArchSync AI</Link>
          </section>
        ) : complete ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={24} /></span>
            <p className="mt-4 text-sm font-semibold text-emerald-700">Invitation preview</p>
            <h2 className="mt-1 text-2xl font-extrabold">You’re ready to join</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">This sample flow shows the confirmation a homeowner will see. Account creation and project access will be connected when the project-invitation API is available.</p>
            <button type="button" onClick={() => navigate(`/homeowner/project-requirements?email=${encodeURIComponent(invitedEmail)}`)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Continue to project brief <ArrowRight size={16} /></button>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Create your homeowner account</h2>
                  <p className="mt-1 text-sm text-slate-500">Your invitation is for this email address.</p>
                </div>
                <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">Homeowner</span>
              </div>

              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-blue-700"><UserRound size={19} /></span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Invited email</p>
                  <p className="truncate text-sm font-bold text-slate-900">{invitedEmail}</p>
                </div>
                <ShieldCheck className="ml-auto shrink-0 text-blue-700" size={19} />
              </div>

              <form onSubmit={submit} noValidate className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Full name
                  <input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Minh Anh Nguyen" className={fieldClass} />
                  {fieldError(errors.name)}
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Phone number
                  <input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+]/g, ''))} placeholder="09xxxxxxxx" className={fieldClass} />
                  {fieldError(errors.phone)}
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <PasswordInput autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" className={fieldClass} />
                  {fieldError(errors.password)}
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm password
                  <PasswordInput autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" className={fieldClass} />
                  {fieldError(errors.confirmPassword)}
                </label>

                <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                  {[
                    [passwordChecks.length, 'At least 8 characters'],
                    [passwordChecks.number, 'One number'],
                    [passwordChecks.uppercase, 'One uppercase letter'],
                  ].map(([valid, label]) => (
                    <span key={String(label)} className={`inline-flex items-center gap-2 text-xs font-medium ${valid ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <Check size={14} className={valid ? 'text-emerald-600' : 'text-slate-300'} />{label}
                    </span>
                  ))}
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-slate-600">
                    <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600" />
                    <span>I agree to the <a href="#terms" className="font-semibold text-blue-700 hover:underline">Terms of Use</a> and <a href="#privacy" className="font-semibold text-blue-700 hover:underline">Privacy Policy</a>.</span>
                  </label>
                  {fieldError(errors.terms)}
                </div>

                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  Accept invitation &amp; create account <ArrowRight size={17} />
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><ShieldCheck size={14} /> Your account details are only shared with this project team.</p>
              </form>
            </section>

            <aside className="space-y-5">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-900 px-6 py-5 text-white sm:px-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Project invitation</p>
                  <h2 className="mt-2 text-xl font-bold">OA Apartment · Bình Thạnh</h2>
                  <p className="mt-1 text-sm text-slate-300">Project AS-2026-018</p>
                </div>
                <div className="space-y-4 p-6 sm:px-7">
                  <div className="flex items-start gap-3"><span className="mt-0.5 text-blue-700"><Home size={17} /></span><div><p className="text-xs text-slate-500">Property</p><p className="mt-0.5 text-sm font-semibold text-slate-800">2 bedrooms · 2 bathrooms · 80 m²</p></div></div>
                  <div className="flex items-start gap-3"><span className="mt-0.5 text-blue-700"><MapPin size={17} /></span><div><p className="text-xs text-slate-500">Location</p><p className="mt-0.5 text-sm font-semibold text-slate-800">Bình Thạnh District, Ho Chi Minh City</p></div></div>
                  <div className="flex items-start gap-3"><span className="mt-0.5 text-blue-700"><UserRound size={17} /></span><div><p className="text-xs text-slate-500">Invited by</p><p className="mt-0.5 text-sm font-semibold text-slate-800">Trần Nam · ArchSync project staff</p></div></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Sparkles size={16} className="text-blue-600" /> After joining</p>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <li>• Share your budget and design preferences.</li>
                      <li>• Upload floor plans and photos of your home.</li>
                      <li>• Review concepts and collaborate with your designer.</li>
                    </ul>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14} /> Invitation expires in 7 days</p>
                </div>
              </section>
              <p className="px-2 text-center text-xs leading-5 text-slate-500">Already created an account with this email? <button type="button" onClick={() => navigate('/login')} className="font-semibold text-blue-700 hover:underline">Sign in to continue</button></p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default AcceptProjectInvitation;
