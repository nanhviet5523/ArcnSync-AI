import React from 'react';
import { Logo } from '@/components/common/Logo';
const FOOTER_SECTIONS = [
  {
    title: 'Platform',
    links: ['How It Works', 'Designers', 'Pricing'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Contact', 'Privacy Policy'],
  },
];

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-200 px-6 lg:px-12 py-10 text-slate-900">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-8">
        
        {/* Cột 1: Logo & Tagline */}
        <div className="max-w-xs">
          <Logo size={32} />
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Generative AI-powered interior design collaboration platform.
          </p>
        </div>

        {/* Cột 2, 3, 4: Navigation Links */}
        <div className="flex flex-wrap gap-12 lg:gap-16">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-bold text-gray-900 mb-3.5">
                {section.title}
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-500">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                      className="hover:text-gray-900 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cột 5: Copyright góc phải */}
        <div className="text-xs text-gray-400 whitespace-nowrap self-start lg:self-auto">
          © 2026 ArchSync AI
        </div>

      </div>
    </footer>
  );
};

export default Footer;