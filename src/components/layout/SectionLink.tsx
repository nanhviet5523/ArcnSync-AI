import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrollToSection } from './scrollToSection';

/**
 * Link to a landing-page section ("#how-it-works"). On "/" it scrolls there smoothly; from any other page it opens
 * "/#how-it-works" and HomePage scrolls once its sections have rendered. Ctrl/⌘/middle clicks keep the browser default.
 */
export function SectionLink({ hash, className, children }: { hash: string; className?: string; children: ReactNode }) {
  const navigate = useNavigate();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(`/${hash}`);
    scrollToSection(hash);
  };

  return <a href={`/${hash}`} onClick={onClick} className={className}>{children}</a>;
}
