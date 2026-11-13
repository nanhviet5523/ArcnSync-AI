import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo, PasswordInput } from '@/components/common';
import { ApiError, registerUser } from '@/services/authService';

type FieldName =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'terms';

type FieldErrors = Partial<Record<FieldName, string>>;

const PHONE_REGEX = /^0[0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;

const FORM_FIELDS: FieldName[] = [
  'fullName',
  'phone',
  'email',
  'password',
];

const FIELD_KEYWORDS: Array<[FieldName, RegExp]> = [
  ['fullName', /full\s*name|họ\s*và\s*tên|họ tên|tên/i],
  ['phone', /phone|số điện thoại|điện thoại/i],
  ['email', /email/i],
  ['password', /password|mật khẩu/i],
];

// Maps BE validation response (per-field errors or message list) to form fields.
function mapServerErrors(err: ApiError): {
  fields: FieldErrors;
  general: string;
} {
  const fields: FieldErrors = {};

  for (const [key, msg] of Object.entries(err.fieldErrors)) {
    const field = FORM_FIELDS.find(
      (f) => f.toLowerCase() === key.toLowerCase(),
    );

    if (field) fields[field] = msg;
  }

  const unmatched: string[] = [];

  for (const msg of err.messages) {
    const hit = FIELD_KEYWORDS.find(([, re]) => re.test(msg));

    if (hit) {
      if (!fields[hit[0]]) fields[hit[0]] = msg;
    } else {
      unmatched.push(msg);
    }
  }

  const general =
    Object.keys(fields).length > 0
      ? unmatched.join(' ')
      : err.message;

  return { fields, general };
}

interface SignUpFormProps {
  onLoginClick?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onLoginClick,
}) => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: FieldName) =>
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone =
        'Số điện thoại phải bắt đầu bằng 0 và gồm đúng 10 chữ số';
    }

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email =
        'Email không đúng định dạng (ví dụ: ten@example.com)';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!agreeTerms) {
      errors.terms =
        'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật';
    }

    return errors;
  };

  const inputClass = (field: FieldName) =>
    `w-full px-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent transition placeholder:text-slate-400 ${
      fieldErrors[field]
        ? 'border-red-400 focus:ring-red-500'
        : 'border-slate-200 focus:ring-blue-600'
    }`;

  const renderError = (field: FieldName) =>
    fieldErrors[field] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
        {fieldErrors[field]}
      </p>
    ) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setNotice('');
    setError('');
    setSuccess('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const res = await registerUser({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });

      const successMessage =
        res.message ||
        'Account created. Check your email for the verification code.';

      setNotice(successMessage);
      setSuccess(successMessage);

      setTimeout(() => {
        navigate('/verify-otp', {
          state: { email: res.user.email },
        });
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const { fields, general } = mapServerErrors(err);
        setFieldErrors(fields);
        setError(general || err.message);
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.';

        setError(message);
        setNotice(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col justify-center h-full py-2">
      {/* Logo */}
      <div className="mb-5">
        <Logo size={38} to="/" />
      </div>

      {/* Header Title */}
      <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
        Create your account
      </h1>

      <p className="text-sm lg:text-base text-slate-500 mb-5 leading-relaxed">
        Create your account to start a project and collaborate with our design team.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
            Full name
          </label>

          <input
            type="text"
            placeholder="Nguyen Van A"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearFieldError('fullName');
            }}
            className={inputClass('fullName')}
          />

          {renderError('fullName')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Email
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              className={inputClass('email')}
            />

            {renderError('email')}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Phone number
            </label>

            <input
              type="tel"
              placeholder="+84 9xx xxx xxx"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError('phone');
              }}
              className={inputClass('phone')}
            />

            {renderError('phone')}
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Password
            </label>

            <PasswordInput
              placeholder="Create a password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              className={inputClass('password')}
            />

            {renderError('password')}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>

            <PasswordInput
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError('confirmPassword');
              }}
              className={inputClass('confirmPassword')}
            />

            {renderError('confirmPassword')}
          </div>
        </div>

        {/* Checkbox Terms */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                clearFieldError('terms');
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />

            <span>
              I agree to the{' '}
              <a
                href="#terms"
                className="font-bold text-blue-600 hover:underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#privacy"
                className="font-bold text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>

          {renderError('terms')}
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2"
          >
            {success}
          </p>
        )}

        {notice && !success && !error && (
          <p
            role="status"
            className="text-xs font-medium text-slate-600"
          >
            {notice}
          </p>
        )}

        {/* Create Account Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#0B132B] hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}

          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>

        <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-widest">
          or
        </span>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        className="w-full py-3.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-3 transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>

        <span>Continue with Google</span>
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-500 mt-4">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-bold text-blue-600 hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );
};
