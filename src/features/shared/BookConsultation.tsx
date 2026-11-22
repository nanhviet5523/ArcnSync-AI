import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';

/**
 * Trang "Gửi yêu cầu tư vấn" — đích đến của nút Book Consultation trên Homepage
 * khi người dùng đã đăng nhập. Backend chưa có API đặt lịch tư vấn, nên form
 * dưới đây chỉ ghi nhận cục bộ (không gửi lên server) cho tới khi có API thật.
 */
export const BookConsultation: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [fullName, setFullName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: nối API đặt lịch tư vấn thật khi Backend cung cấp endpoint.
    setSubmitted(true);
  };

  const labelClass = 'block text-[11px] font-bold text-slate-500 mb-1.5';
  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600';

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="homeowner" />

      <main className="w-full max-w-[640px] mx-auto px-6 lg:px-12 py-14 flex-1">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 size={36} className="text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900">Đã ghi nhận yêu cầu tư vấn</h1>
            <p className="text-sm text-slate-500">
              Đội ngũ ArcnSync AI sẽ liên hệ với bạn qua số điện thoại {phone || 'đã cung cấp'} trong vòng 24 giờ.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays size={20} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Đặt lịch tư vấn</h1>
                <p className="text-sm text-slate-500">Để lại thông tin, nhân viên tư vấn sẽ liên hệ với bạn.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Họ và tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Thời gian mong muốn</label>
                <input
                  type="datetime-local"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nội dung cần tư vấn (tuỳ chọn)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Vd: Nhà phố 2 tầng, 80m², cần tư vấn phong cách hiện đại…"
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
                >
                  Gửi yêu cầu tư vấn
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BookConsultation;
