import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { Button, ErrorState, Field, Input, Select, Textarea } from '@/components/ui';
import { errorText, formatNumber, t } from '@/i18n';
import { StaticLayout } from '@/features/static/StaticLayout';
import { INQUIRY_TOPICS, inquiryApi } from './inquiryApi';
import type { InquiryPropertyType, InquiryTopic } from './inquiryApi';
import {
  buildContactPayload,
  CONTACT_EMAIL_MAX,
  CONTACT_FULL_NAME_MAX,
  CONTACT_MESSAGE_MAX,
  extractContactFieldErrors,
  INITIAL_CONTACT_FORM,
  isRateLimitError,
  validateContactForm,
} from './contactForm';
import type { ContactField, ContactFormValues } from './contactForm';

const CONTACTS: { key: string; icon: LucideIcon; href?: (value: string) => string }[] = [
  { key: 'hotline', icon: Phone, href: (value) => `tel:${value.replace(/[^\d+]/g, '')}` },
  { key: 'email', icon: Mail, href: (value) => `mailto:${value}` },
  { key: 'zalo', icon: MessageCircle },
  { key: 'address', icon: MapPin },
];

const PROPERTY_TYPES: InquiryPropertyType[] = ['APARTMENT', 'HOUSE'];

/** Public contact form (/contact): submits to POST /contact-inquiries without requiring an account. */
export function ContactPage() {
  const [values, setValues] = useState<ContactFormValues>(INITIAL_CONTACT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const setField = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key !== 'website') {
      const field = key as ContactField;
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const clientErrors = validateContactForm(values);
    if (Object.keys(clientErrors).length > 0) {
      const translated: Partial<Record<ContactField, string>> = {};
      for (const [k, code] of Object.entries(clientErrors)) {
        if (code) translated[k as ContactField] = t(`contactPage.validation.${code}`);
      }
      setFieldErrors(translated);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await inquiryApi.submit(buildContactPayload(values));
      setSuccessMessage(res.message?.trim() || t('contactPage.successFallback'));
      setValues(INITIAL_CONTACT_FORM);
    } catch (err) {
      if (isRateLimitError(err)) {
        setFormError(t('contactPage.rateLimited'));
      } else {
        const serverFields = extractContactFieldErrors(err);
        if (Object.keys(serverFields).length > 0) {
          setFieldErrors(serverFields);
        } else {
          setFormError(errorText(err));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StaticLayout
      eyebrow={t('contactPage.eyebrow')}
      title={t('contactPage.title')}
      subtitle={t('contactPage.subtitle')}
    >
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 lg:px-16 lg:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <aside className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:col-span-2">
            <h2 className="text-base font-bold text-ink">{t('home.contact.infoTitle')}</h2>
            <dl className="mt-6 space-y-5">
              {CONTACTS.map(({ key, icon: Icon, href }) => {
                const value = t(`home.contact.values.${key}`);
                return (
                  <div key={key} className="flex items-start gap-3.5">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-slate-500">{t(`home.contact.${key}`)}</dt>
                      <dd className="mt-0.5 wrap-break-word text-sm font-semibold text-ink">
                        {href
                          ? <a href={href(value)} className="rounded transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{value}</a>
                          : value}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
            <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-slate-500">
              {t('contactPage.responseNote')}
            </p>
          </aside>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:col-span-3">
            {successMessage ? (
              <div role="status" className="space-y-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 aria-hidden className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-ink">{t('contactPage.successTitle')}</h2>
                  <p className="text-sm leading-relaxed text-slate-700">{successMessage}</p>
                </div>
                <div className="pt-2">
                  <Button onClick={() => setSuccessMessage('')}>{t('contactPage.sendAnother')}</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-ink">{t('contactPage.formTitle')}</h2>
                  <p className="mt-1 text-xs text-slate-500">{t('contactPage.formHint')}</p>
                </div>

                {/* Honeypot: off-screen, hidden from assistive tech and keyboard focus, left empty by real visitors */}
                <div aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.website}
                    onChange={(e) => setField('website', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('contactPage.fullName')} error={fieldErrors.fullName}>
                    {(p) => (
                      <Input
                        {...p}
                        type="text"
                        required
                        maxLength={CONTACT_FULL_NAME_MAX}
                        autoComplete="name"
                        placeholder={t('contactPage.fullNamePlaceholder')}
                        invalid={Boolean(fieldErrors.fullName)}
                        value={values.fullName}
                        onChange={(e) => setField('fullName', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label={t('contactPage.email')} error={fieldErrors.email}>
                    {(p) => (
                      <Input
                        {...p}
                        type="email"
                        required
                        maxLength={CONTACT_EMAIL_MAX}
                        autoComplete="email"
                        placeholder={t('contactPage.emailPlaceholder')}
                        invalid={Boolean(fieldErrors.email)}
                        value={values.email}
                        onChange={(e) => setField('email', e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('contactPage.phone')}
                    optional
                    hint={t('contactPage.phoneOptional')}
                    error={fieldErrors.phone}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        type="tel"
                        inputMode="tel"
                        maxLength={16}
                        autoComplete="tel"
                        placeholder={t('contactPage.phonePlaceholder')}
                        invalid={Boolean(fieldErrors.phone)}
                        value={values.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label={t('contactPage.propertyType')} optional error={fieldErrors.propertyType}>
                    {(p) => (
                      <Select
                        {...p}
                        invalid={Boolean(fieldErrors.propertyType)}
                        value={values.propertyType}
                        onChange={(e) => setField('propertyType', e.target.value as InquiryPropertyType | '')}
                      >
                        <option value="">{t('contactPage.propertyTypeNone')}</option>
                        {PROPERTY_TYPES.map((pt) => (
                          <option key={pt} value={pt}>{t(`projectDetail.propertyType.${pt}`)}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>

                <Field label={t('contactPage.topic')} error={fieldErrors.topic}>
                  {(p) => (
                    <Select
                      {...p}
                      required
                      invalid={Boolean(fieldErrors.topic)}
                      value={values.topic}
                      onChange={(e) => setField('topic', e.target.value as InquiryTopic)}
                    >
                      {INQUIRY_TOPICS.map((topic) => (
                        <option key={topic} value={topic}>{t(`inquiries.topic.${topic}`)}</option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field
                  label={t('contactPage.message')}
                  hint={t('contactPage.counter', { n: formatNumber(values.message.length), max: formatNumber(CONTACT_MESSAGE_MAX) })}
                  error={fieldErrors.message}
                >
                  {(p) => (
                    <Textarea
                      {...p}
                      required
                      rows={5}
                      maxLength={CONTACT_MESSAGE_MAX}
                      placeholder={t('contactPage.messagePlaceholder')}
                      invalid={Boolean(fieldErrors.message)}
                      value={values.message}
                      onChange={(e) => setField('message', e.target.value)}
                    />
                  )}
                </Field>

                {formError && <ErrorState message={formError} />}

                <div className="flex justify-end pt-1">
                  <Button type="submit" variant="primary" loading={submitting}>
                    <Send aria-hidden className="h-4 w-4" />
                    {submitting ? t('contactPage.sending') : t('contactPage.submit')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </StaticLayout>
  );
}

export default ContactPage;
