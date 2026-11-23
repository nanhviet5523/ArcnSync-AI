import { t } from '@/i18n';

/** Sample projects; copy in home.inspiration.<key>. Not links: there is no gallery page. */
const INSPIRATION_CARDS = [
  {
    key: 'minimalist',
    area: '35 m²',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
  },
  {
    key: 'japandi',
    area: '42 m²',
    img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop',
  },
  {
    key: 'modern',
    area: '18 m²',
    img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop',
  },
];

/** Section 4: three featured sample projects. */
export function InspirationsSection() {
  return (
    <section className="w-full bg-canvas px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{t('home.inspiration.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{t('home.inspiration.title')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('home.inspiration.intro')}</p>
        </div>

        <ul className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {INSPIRATION_CARDS.map((card) => {
            const title = t(`home.inspiration.${card.key}.title`);
            return (
              <li key={card.key} className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
                <div className="h-64 overflow-hidden">
                  <img
                    src={card.img}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="mb-3.5 flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{t(`home.inspiration.${card.key}.style`)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{card.area}</span>
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-slate-900">{title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t('home.inspiration.designedBy', { name: t('home.inspiration.studio') })}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default InspirationsSection;
