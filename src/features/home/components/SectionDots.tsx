import { useEffect, useState } from 'react';
import { scrollToSection } from '@/components/layout';
import { t } from '@/i18n';

/** Landing-page sections, top to bottom, by element id. */
const SECTIONS = [
  { id: 'hero', label: 'home.nav.hero' },
  { id: 'how-it-works', label: 'home.nav.howItWorks' },
  { id: 'features', label: 'home.nav.features' },
  { id: 'inspiration', label: 'home.nav.inspiration' },
  { id: 'contact', label: 'home.nav.contact' },
];

/**
 * Page outline fixed on the right edge (lg and up): one dot per section, the current one stretched into a bar.
 * Hover or focus shows the section name; clicking scrolls there. The current section is the one crossing the middle
 * of the viewport. Sits on a small frosted pill so it stays readable over the dark Features band.
 */
export function SectionDots() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      // A thin band just above the middle of the screen: whichever section crosses it is current.
      { rootMargin: '-40% 0px -55% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    // The observer moves the bar as the page glides there.
    window.history.replaceState(null, '', `#${id}`);
    scrollToSection(id);
  };

  return (
    <nav
      aria-label={t('home.nav.outline')}
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block xl:right-6"
    >
      <ul className="flex flex-col items-center gap-1 rounded-full border border-line/70 bg-surface/80 px-1.5 py-2 shadow-card backdrop-blur">
        {SECTIONS.map(({ id, label }) => {
          const current = id === active;
          const name = t(label);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => go(id)}
                aria-label={name}
                aria-current={current ? 'location' : undefined}
                className="group relative flex h-7 w-5 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span
                  aria-hidden
                  className={`block w-1.5 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                    current ? 'h-5 bg-brand' : 'h-1.5 bg-line-strong group-hover:bg-slate-500'
                  }`}
                />
                {/* Name tag, left of the dot */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-slate-800 opacity-0 shadow-card transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
                >
                  {name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SectionDots;
