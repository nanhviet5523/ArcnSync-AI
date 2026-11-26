import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CreditCard, FilePenLine, GitCompareArrows, Lightbulb, MapPin, ReceiptText } from 'lucide-react';
import type { CSSProperties } from 'react';
import { t } from '@/i18n';
import { useReveal } from '../useReveal';

/** What a homeowner does on the platform; copy in home.features.<key>. */
const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: 'pins', icon: MapPin },
  { key: 'compare', icon: GitCompareArrows },
  { key: 'otp', icon: FilePenLine },
  { key: 'payos', icon: CreditCard },
  { key: 'bom', icon: ReceiptText },
  { key: 'deadlines', icon: CalendarClock },
];

/** Section 3: the homeowner collaboration features, on the dark band. */
export function FeaturesSection() {
  const intro = useReveal<HTMLDivElement>();
  const cards = useReveal<HTMLUListElement>();
  const soon = useReveal<HTMLParagraphElement>();

  return (
    <section id="features" className="scroll-mt-16 bg-dark px-6 py-20 text-[#FBF8EF] lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div {...intro} className="reveal max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-on-dark">{t('home.features.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{t('home.features.title')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#FBF8EF] sm:text-base">{t('home.features.intro')}</p>
        </div>

        <ul {...cards} className="reveal-group mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }, i) => (
            // reveal-item owns the entrance transition; the inner card owns the hover one, so they don't clash.
            <li key={key} className="reveal-item" style={{ '--i': i } as CSSProperties}>
              <div className="group h-full rounded-2xl border border-dark-hover bg-surface/10 p-6 transition-colors duration-300 hover:border-brand-on-dark/30 hover:bg-surface/[0.14]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-dark-hover text-brand-on-dark transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-bold">{t(`home.features.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#FBF8EF]">{t(`home.features.${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>

        <p {...soon} className="reveal mt-10 inline-flex items-center gap-2 rounded-full border border-dark-hover bg-dark-hover px-4 py-2 text-xs font-semibold text-brand-on-dark">
          <Lightbulb aria-hidden className="h-4 w-4 shrink-0" />
          {t('home.features.soon')}
        </p>
      </div>
    </section>
  );
}

export default FeaturesSection;
