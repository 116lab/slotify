/**
 * usePostView.js
 * View-model for the single-post view: bundles content fetching, the image /
 * content lightbox state, and the post-mount content hydration (Mermaid, images,
 * code blocks).
 *
 * Crucially, it registers onMounted here, inside the composable. Because the view
 * calls usePostView() at the very top of its setup() — before `await fetchData()`
 * — the hook is registered synchronously. In this no-build (raw) Vue project the
 * component instance context is lost after the first await, so a hook registered
 * after it would silently never fire. Owning the registration here keeps that
 * ordering correct.
 */
const { ref, onMounted } = Vue;
import { useContentResource } from './useContentResource.js';
import { useContentHydration } from './useContentHydration.js';

export function usePostView(containerId = 'hugo-content') {
  // Single-post data comes straight from the shared content resource. (Scroll-to-
  // top is handled globally by router.afterEach in router.js, so we don't re-scroll.)
  const { pageData, error, fetchData } = useContentResource();
  const { hydrateImages, hydrateMermaid, hydrateMath, hydrateCodeBlocks } = useContentHydration();

  // Lightbox state (image + arbitrary HTML content such as Mermaid diagrams).
  const lightboxOpen = ref(false);
  const lightboxSrc = ref('');
  const contentLightboxOpen = ref(false);
  const lightboxHtmlContent = ref('');

  const openLightbox = (src) => {
    lightboxSrc.value = src;
    lightboxOpen.value = true;
  };

  const openContentLightbox = (html) => {
    lightboxHtmlContent.value = html;
    contentLightboxOpen.value = true;
  };

  // Registered synchronously (the caller awaits fetchData AFTER calling this).
  // The callback still runs after mount — i.e. once the content HTML is in the
  // DOM — so hydration targets real nodes.
  onMounted(() => {
    if (pageData.value?.content) {
      hydrateImages(containerId, openLightbox);
      hydrateMermaid(containerId, openContentLightbox);
      hydrateMath(containerId);
      hydrateCodeBlocks(containerId);
    }
  });

  return {
    pageData,
    error,
    fetchData,
    lightboxOpen,
    lightboxSrc,
    contentLightboxOpen,
    lightboxHtmlContent
  };
}
