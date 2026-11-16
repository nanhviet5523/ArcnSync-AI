import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, ErrorState, Field, Input, Select, Textarea } from '@/components/ui';
import { errorText, t, tList } from '@/i18n';
import { INQUIRY_TOPICS, inquiryApi } from '@/features/inquiries/inquiryApi';
import type { ContactInput, InquiryPropertyType, InquiryTopic } from '@/features/inquiries/inquiryApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{9,15}$/;
const EMPTY = { fullName: '', email: '', phone: '', topic: 'NEW_PROJECT' as InquiryTopic, propertyType: '' as InquiryPropertyType | '', message: '', website: '' };

/** Public contact form (#contact on the homepage): no account needed; staff answer it from their Inquiries inbox. */
export function ContactSection() {
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const phone = form.phone.replace(/[\s.-]/g, '');
  const errors: Record<string, string | undefined> = {
    fullName: form.fullName.trim() ? undefined : t('common.required'),
    email: EMAIL.test(form.email.trim()) ? undefined : t('common.checkValue'),
    phone: !phone || PHONE.test(phone) ? undefined : t('common.checkValue'),
    message: form.message.trim().length >= 10 ? undefined : t('contact.messageHint'),
  };
  const show = (k: string) => (touched ? errors[k] : undefined) ?? fieldErrors[k];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true); setError(''); setFieldErrors({});
    const input: ContactInput = {
      fullName: form.fullName.trim(), email: form.email.trim(), topic: form.topic, message: form.message.trim(),
      ...(phone ? { phone } : {}), ...(form.propertyType ? { propertyType: form.propertyType } : {}), ...(form.website ? { website: form.website } : {}),
    };
    try {
      await inquiryApi.submit(input);
      setSent(true); setForm(EMPTY); setTouched(false);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setFieldErrors(Object.fromEntries(Object.keys((err as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}).map((k) => [k, t('common.checkValue')])));
      setError(status === 429 ? t('contact.tooMany') : errorText(err));
    } finally { setBusy(false); }
  };

  return (
    <section id="contact" className="w-full scroll-mt-20 bg-slate-50 px-6 py-16 lg:px-16">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{t('contact.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl">{t('contact.title')}</h2>
          <p className="mt-3 text-sm text-slate-600 lg:text-base">{t('contact.description')}</p>
          <ul className="mt-6 space-y-3">
            {tList('contact.points').map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />{p}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3 lg:p-8">
          {sent ? (
            <div role="status" className="flex flex-col items-start gap-4 py-6">
              <CheckCircle2 aria-hidden className="h-10 w-10 text-emerald-600" />
              <p className="text-base font-semibold text-slate-900">{t('contact.sent')}</p>
              <Button onClick={() => setSent(false)}>{t('contact.sendAnother')}</Button>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label={t('contact.fullName')} error={show('fullName')}>
                {(p) => <Input {...p} autoComplete="name" maxLength={150} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} invalid={!!show('fullName')} />}
              </Field>
              <Field label={t('contact.email')} error={show('email')}>
                {(p) => <Input {...p} type="email" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!show('email')} />}
              </Field>
              <Field label={t('contact.phone')} optional error={show('phone')}>
                {(p) => <Input {...p} type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} invalid={!!show('phone')} />}
              </Field>
              <Field label={t('contact.propertyType')} optional>
                {(p) => (
                  <Select {...p} value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value as InquiryPropertyType | '' })}>
                    <option value="">{t('contact.propertyAny')}</option>
                    <option value="APARTMENT">{t('projectDetail.propertyType.APARTMENT')}</option>
                    <option value="HOUSE">{t('projectDetail.propertyType.HOUSE')}</option>
                  </Select>
                )}
              </Field>
              <Field label={t('contact.topic')} className="sm:col-span-2">
                {(p) => (
                  <Select {...p} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as InquiryTopic })}>
                    {INQUIRY_TOPICS.map((x) => <option key={x} value={x}>{t(`inquiries.topic.${x}`)}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t('contact.message')} error={show('message')} hint={t('contact.messageHint')} className="sm:col-span-2">
                {(p) => <Textarea {...p} rows={5} maxLength={5000} placeholder={t('contact.messagePlaceholder')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} invalid={!!show('message')} />}
              </Field>
              {/* honeypot: hidden from people and screen readers; bots fill it */}
              <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
              </div>
              {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" loading={busy} className="w-full sm:w-auto">{t('contact.submit')}</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
