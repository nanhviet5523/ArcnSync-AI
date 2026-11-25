/** Scroll to a landing-page section by its hash ("#features"). Jumps instead of gliding when the user prefers reduced motion. */
export function scrollToSection(hash: string): void {
  let id = hash.replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    // malformed escape in a typed URL: look the raw hash up instead of crashing the page
  }
  if (!id) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
