/**
 * useMermaid.js
 * Owns every Mermaid DOM + library side effect: applying the theme config and
 * rendering each .mermaid diagram from its text source, plus the visible error
 * fallback. utils/mermaidTheme.js stays pure (color + config computation); this
 * composable performs the mermaid.initialize()/render() calls and DOM mutation
 * (DOM/side-effect logic belongs in composables, not utils).
 */
import { themeColorsForMermaid, mermaidInitConfig } from '../utils/mermaidTheme.js';
import { loadLazyLibrary } from './useLazyLibrary.js';
import { renderContentError } from './useContentError.js';

export function loadMermaid() {
  return loadLazyLibrary({
    globalKey: 'mermaid',
    lazyKey: 'mermaid',
    label: 'Mermaid'
  });
}

export function useMermaid() {
  const renderError = (el, source, err) => {
    renderContentError(el, source, err, {
      messageKey: 'ui.mermaidError',
      label: 'Mermaid',
      isDisplay: true,
      classPrefix: 'mermaid'
    });
  };

  /**
   * Apply Slotify theme colors to Mermaid and (re-)render every .mermaid diagram
   * on the page from its text-only source.
   * @param {object} themeObj - a Vuetify theme entry (has `.colors` and `.dark`)
   * @param {boolean} [dark] - explicit dark flag; falls back to themeObj.dark
   */
  const renderDiagrams = (themeObj, dark) => {
    if (typeof mermaid === 'undefined') return;

    mermaid.initialize(mermaidInitConfig(themeColorsForMermaid(themeObj, dark)));

    const nodes = document.querySelectorAll('.mermaid');
    if (!nodes.length) return;

    // Render each diagram in isolation rather than via a single mermaid.run():
    // run() rejects globally on the first malformed diagram, so one bad block of
    // source would leave every other diagram on the page unrendered. Per-node
    // render() lets a syntax error fail to a visible fallback (renderError) while
    // its neighbours still render.
    //
    // Source: `data-graph`, set verbatim by the Hugo render hook
    // (render-codeblock-mermaid.html) from the author's raw fence content. We
    // read it directly — never from rendered DOM/textContent — so the diagram
    // source survives jsonify + Vue v-html + the browser's entity decoding
    // intact, and a re-render on theme switch always reads the original text
    // rather than a previously rendered SVG. textContent is a defensive fallback
    // for any node not produced by the render hook.
    let seq = 0;
    nodes.forEach((el) => {
      const source = (el.dataset.graph ?? el.textContent ?? '').trim();
      el.removeAttribute('data-processed');
      el.classList.remove('mermaid--error');

      const renderId = `mermaid-${seq++}`;
      mermaid.render(renderId, source)
        .then(({ svg, bindFunctions }) => {
          el.innerHTML = svg;
          if (typeof bindFunctions === 'function') bindFunctions(el);
          el.setAttribute('data-processed', 'true');
        })
        .catch((err) => renderError(el, source, err));
    });
  };

  return { renderDiagrams };
}
