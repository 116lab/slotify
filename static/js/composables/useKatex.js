/**
 * useKatex.js
 * Owns every KaTeX DOM + library side effect: dynamically loading the KaTeX
 * CSS and JS assets on demand, and rendering each .math element inside the
 * content container.
 */
import { loadLazyLibrary } from './useLazyLibrary.js';
import { renderContentError } from './useContentError.js';

/**
 * Dynamically load KaTeX stylesheet and JavaScript bundle on demand.
 * Keeps KaTeX out of the eager head payload; only downloaded when a page
 * contains math formulas.
 * @returns {Promise<object>} resolves with window.katex
 */
export function loadKatex() {
  return loadLazyLibrary({
    globalKey: 'katex',
    lazyKey: 'katex',
    label: 'KaTeX',
    cssKey: 'katexCss'
  });
}

export function useKatex() {
  /**
   * Render math formulas in the given content container.
   * Targets .math elements emitted by Hugo's Goldmark passthrough markup hooks.
   * @param {HTMLElement|string} target - container element or container id
   */
  const renderMath = (target) => {
    if (typeof window.katex === 'undefined') return;

    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) return;

    const nodes = container.querySelectorAll('.math:not([data-processed])');
    if (!nodes.length) return;

    nodes.forEach((el) => {
      const formula = (el.dataset.math ?? el.textContent ?? '').trim();
      if (!formula) {
        el.setAttribute('data-processed', 'empty');
        return;
      }

      const isDisplay =
        el.classList.contains('display') ||
        el.classList.contains('block') ||
        el.tagName === 'DIV';

      try {
        window.katex.render(formula, el, {
          displayMode: isDisplay,
          throwOnError: true,
          output: 'htmlAndMathml'
        });
        el.setAttribute('data-processed', 'true');
      } catch (err) {
        renderContentError(el, formula, err, {
          messageKey: 'ui.mathError',
          label: 'KaTeX',
          isDisplay,
          classPrefix: 'math'
        });
      }
    });
  };

  return { renderMath };
}
