/**
 * motion.js
 * prefers-reduced-motion helpers. The CSS @media (prefers-reduced-motion) block
 * in slotify.css only governs CSS-driven motion; a JS scroll that passes an
 * explicit behavior:'smooth' to scrollIntoView/scrollTo OVERRIDES the CSS
 * scroll-behavior property, so every programmatic smooth scroll must gate on the
 * preference here too — otherwise a reduced-motion user still gets an animated
 * jump (the #hash anchor scroll and the Table of Contents click).
 */

/** True when the user has requested reduced motion (and a DOM is available). */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The scroll `behavior` honoring that preference: an instant jump for reduced
 * motion, a smooth animation otherwise. Pass to scrollIntoView/scrollTo.
 */
export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
