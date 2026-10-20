/**
 * useContentHydration.js
 * Hydrates Markdown content rendered by Hugo and injected through v-html.
 */
import { t } from '../i18n.js';
import { useMermaid, loadMermaid } from './useMermaid.js';
import { useKatex, loadKatex } from './useKatex.js';
const { nextTick, onUnmounted } = Vue;

export function useContentHydration() {
  const theme = Vuetify.useTheme();
  const { renderDiagrams } = useMermaid();
  const { renderMath } = useKatex();

  // Deferred Mermaid render-check timer; cleared on unmount so a fast
  // navigation away from a post doesn't fire a stale warning against a
  // detached container. Registered synchronously (the caller invokes this
  // composable before any await — see usePostView).
  let mermaidCheckTimer = null;
  onUnmounted(() => {
    if (mermaidCheckTimer) {
      clearTimeout(mermaidCheckTimer);
      mermaidCheckTimer = null;
    }
  });

  const hydrateImages = (containerId, onImageClick) => {
    nextTick(() => {
      const contentDiv = document.getElementById(containerId);
      if (!contentDiv) return;

      const images = contentDiv.querySelectorAll('.markdown-body img:not([data-lightbox-bound="true"])');
      images.forEach(img => {
        img.setAttribute('data-lightbox-bound', 'true');

        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-image-wrapper';

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        img.classList.add('cursor-pointer', 'img-hover-zoom');

        if (onImageClick) {
          img.addEventListener('click', () => onImageClick(img.src));
        }
      });
    });
  };

  const hydrateFeature = async ({ containerId, featureFlag, selector, load, render }) => {
    await nextTick();
    const contentDiv = document.getElementById(containerId);
    if (!contentDiv) return;

    // Feature flag guard: skip if feature is explicitly disabled in config
    const features = (window.__SLOTIFY_CONFIG__ || {}).features || {};
    if (features[featureFlag] === false) return;

    // No target elements on this page -> never fetch assets
    const elements = contentDiv.querySelectorAll(selector);
    if (!elements.length) return;

    try {
      await load();
    } catch (err) {
      console.error(err);
      return;
    }

    // Container may have been swapped out during download (fast nav away)
    if (!contentDiv.isConnected) return;
    render(contentDiv, elements);
  };

  const hydrateMermaid = async (containerId, onMermaidClick) => {
    await hydrateFeature({
      containerId,
      featureFlag: 'mermaid',
      selector: '.mermaid',
      load: loadMermaid,
      render: (contentDiv, elements) => {
        renderDiagrams(theme.current.value);

        if (onMermaidClick) {
          elements.forEach(el => {
            el.style.cursor = 'zoom-in';
            el.addEventListener('click', () => {
              const svg = el.querySelector('svg');
              if (svg) onMermaidClick(svg.outerHTML);
            });
          });
        }

        // Diagrams are present; warn if any remain unrendered shortly after
        if (mermaidCheckTimer) clearTimeout(mermaidCheckTimer);
        mermaidCheckTimer = setTimeout(() => {
          mermaidCheckTimer = null;
          const pending = contentDiv.querySelectorAll('.mermaid:not([data-processed])').length;
          if (pending > 0) {
            console.warn('[Slotify] ' + pending + ' Mermaid diagram(s) did not render. ' +
              'Verify content hydration and diagram syntax.');
          }
        }, 1200);
      }
    });
  };

  const hydrateMath = async (containerId) => {
    await hydrateFeature({
      containerId,
      featureFlag: 'math',
      selector: '.math',
      load: loadKatex,
      render: (contentDiv) => {
        renderMath(contentDiv);
      }
    });
  };

  const hydrateCodeBlocks = (containerId) => {
    nextTick(() => {
      const contentDiv = document.getElementById(containerId);
      if (!contentDiv) return;

      const highlightedBlocks = Array.from(contentDiv.querySelectorAll('.highlight'));
      const plainBlocks = Array.from(contentDiv.querySelectorAll('pre'))
        .filter(pre => !pre.closest('.highlight'));
      const codeBlocks = [...highlightedBlocks, ...plainBlocks];

      codeBlocks.forEach(block => {
        if (block.querySelector('.code-copy-btn')) return;

        const codeEl = block.matches('pre') ? block.querySelector('code') : block.querySelector('pre code');
        if (!codeEl) return;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.type = 'button';
        copyBtn.textContent = t('ui.copyCode');
        copyBtn.setAttribute('aria-label', t('ui.copyCode'));

        const showCopied = () => {
          copyBtn.textContent = t('ui.copiedCode');
          copyBtn.setAttribute('aria-label', t('ui.copiedCode'));
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = t('ui.copyCode');
            copyBtn.setAttribute('aria-label', t('ui.copyCode'));
            copyBtn.classList.remove('copied');
          }, 2000);
        };
        const showFailed = (err) => {
          console.error('Failed to copy code: ', err);
          copyBtn.textContent = t('ui.copyCodeFailed');
          copyBtn.setAttribute('aria-label', t('ui.copyCodeFailed'));
        };

        copyBtn.addEventListener('click', () => {
          const textToCopy = codeEl.textContent;
          // navigator.clipboard is undefined outside a secure context (http:// on
          // a non-localhost host) and in older browsers; calling .writeText on it
          // would throw synchronously, before any .catch() could run. Prefer the
          // async API when present, else fall back to a hidden-textarea execCommand,
          // else surface the failure state — the click handler never throws.
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(showCopied).catch(showFailed);
            return;
          }
          try {
            const ta = document.createElement('textarea');
            ta.value = textToCopy;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) showCopied();
            else showFailed(new Error('execCommand copy returned false'));
          } catch (err) {
            showFailed(err);
          }
        });

        block.style.position = 'relative';
        block.appendChild(copyBtn);
      });
    });
  };

  return {
    hydrateImages,
    hydrateMermaid,
    hydrateMath,
    hydrateCodeBlocks
  };
}
