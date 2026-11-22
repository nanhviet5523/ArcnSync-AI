import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { t, tList } from '@/i18n';
import { StaticLayout, StaticSection } from './StaticLayout';

type Billing = 'monthly' | 'annual';
const TIERS = ['starter', 'pro', 'enterprise'] as const;

const k = (path: string) => t(`pricingPage.${path}`);

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');

  const price = (tier: (typeof TIERS)[number]) =>
    tier === 'pro' ? k(`tiers.pro.${billing}Price`) : k(`tiers.${tier}.price`);
  const priceNote = (tier: (typeof TIERS)[number]) =>
    tier === 'pro' ? k(billing === 'annual' ? 'billedAnnually' : 'billedMonthly') : k(`tiers.${tier}.priceNote`);

  return (
    <StaticLayout
      eyebrow={k('eyebrow')}
      title={k('title')}
      subtitle={k('subtitle')}
      heroExtra={
        <div role="radiogroup" aria-label={k('billingLabel')} className="mt-8 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
          {(['monthly', 'annual'] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition ${billing === b ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}
            >
              {k(b)}
              {b === 'annual' && <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-400">{k('annualSave')}</span>}
            </button>
          ))}
        </div>
      }
    >
      <StaticSection>
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const featured = tier === 'pro';
            return (
              <article
                key={tier}
                className={`relative flex flex-col rounded-2xl p-6 lg:p-8 ${featured ? 'border border-slate-800/80 bg-slate-900 text-white shadow-2xl' : 'border border-line bg-surface shadow-card'}`}
              >
                {featured && (
                  <span className="absolute -top-3 left-6 rounded-full border border-amber-500/20 bg-amber-500 px-3 py-1 text-xs font-semibold text-white">{k('tiers.pro.badge')}</span>
                )}
                <h2 className={`text-lg font-bold ${featured ? 'text-white' : 'text-slate-900'}`}>{k(`tiers.${tier}.name`)}</h2>
                <p className={`mt-1 text-sm ${featured ? 'text-slate-300' : 'text-slate-600'}`}>{k(`tiers.${tier}.audience`)}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight lg:text-4xl">{price(tier)}</span>
                  {tier === 'pro' && <span className={featured ? 'text-sm text-slate-300' : 'text-sm text-slate-500'}>{k('perMonth')}</span>}
                </p>
                <p className={`mt-1 text-xs ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{priceNote(tier)}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {tList(`pricingPage.tiers.${tier}.features`).map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${featured ? 'text-slate-200' : 'text-slate-700'}`}>
                      <Check aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 text-brand`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-center font-medium transition-all ${
                    featured
                      ? 'bg-brand text-white shadow-lg shadow-slate-900/30 hover:bg-brand-hover'
                      : 'border border-line-strong bg-surface text-slate-900 hover:border-brand hover:text-brand'
                  }`}
                >
                  {k(`tiers.${tier}.cta`)}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">{k('footnote')}</p>
      </StaticSection>
    </StaticLayout>
  );
}

export default PricingPage;
