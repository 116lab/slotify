/**
 * PostView.js
 * Catch-all View for single posts/pages. Data is fetched in async setup() so
 * the page is held by <Suspense> until ready; content layout uses ContentShell
 * with a sticky Table of Contents in the aside rail.
 */
const { useRoute } = VueRouter;
import StateFeedback from '../components/StateFeedback.js';
import PostMeta from '../components/PostMeta.js';
import ImageLightbox from '../components/ImageLightbox.js';
import ContentLightbox from '../components/ContentLightbox.js';
import BaseSurface from '../components/BaseSurface.js';
import PageHeader from '../components/PageHeader.js';
import FeaturedImage from '../components/FeaturedImage.js';
import ContentShell from '../components/ContentShell.js';
import { usePostView } from '../composables/usePostView.js';

export default {
  components: {
    StateFeedback,
    PostMeta,
    ImageLightbox,
    ContentLightbox,
    BaseSurface,
    PageHeader,
    FeaturedImage,
    ContentShell
  },
  template: `
    <content-shell>
      <template #header>
        <page-header v-if="!error" icon="mdi-file-document-outline" :title="pageData?.title || ''"></page-header>
      </template>

      <state-feedback :error="error"></state-feedback>

      <!-- Top slot (Slotify.slots.postView.top): anchored above the post BaseSurface -->
      <slotify-slot name="postView/top" :ctx="{ pageData, error }"></slotify-slot>

      <base-surface v-if="!error" :hover-lift="false" class="post-content-surface pa-0 overflow-hidden">
        <!-- Featured Image (Edge-to-edge) -->
        <featured-image :src="pageData.image" :alt="pageData.title" :max-height="450"></featured-image>

        <div class="pa-5 pa-sm-8">
          <div class="py-0">
            <post-meta :page-data="pageData"></post-meta>
            <v-divider class="mb-8"></v-divider>
          </div>

          <!-- Content-top slot (Slotify.slots.postView.contentTop): inside the
               BaseSurface, above the article body (e.g. a disclaimer/notice) -->
          <slotify-slot name="postView/contentTop" :ctx="{ pageData, error }"></slotify-slot>

          <v-card-text
            v-if="pageData.content"
            class="text-body-1 pt-0 px-0 pb-10 min-width-0"
            id="hugo-content"
          >
            <div v-html="pageData.content" class="markdown-body"></div>
          </v-card-text>

          <!-- Content-bottom slot (Slotify.slots.postView.contentBottom): inside
               the BaseSurface, below the article body (e.g. author bio, license,
               CTA) -->
          <slotify-slot name="postView/contentBottom" :ctx="{ pageData, error }"></slotify-slot>
        </div>
      </base-surface>

      <!-- Bottom slot (Slotify.slots.postView.bottom): comments etc., anchored
           below the post BaseSurface. Only for articles with content. The
           slotify-slot wrapper fires slotify:slot events so an SPA comment
           embed can (re)initialize across navigation. -->
      <slotify-slot
        v-if="pageData.content"
        name="postView/bottom"
        :ctx="{ pageData, pageIdentifier: currentRoute }"
      ></slotify-slot>

      <!-- Universal Image Lightbox (teleported dialog; kept inside the shell so
           the view has a single root node, required by the <transition> wrap in
           App.js). -->
      <image-lightbox v-model:isOpen="lightboxOpen" :image-src="lightboxSrc"></image-lightbox>

      <!-- HTML Content Lightbox (For Mermaids, etc) -->
      <content-lightbox v-model:isOpen="contentLightboxOpen" :content="lightboxHtmlContent"></content-lightbox>

      <!-- Left rail slot (Slotify.slots.postView.left); default = Series Navigator -->
      <template #aside-left>
        <slotify-slot name="postView/left" :ctx="{ pageData, error }"></slotify-slot>
      </template>

      <!-- Right rail slot (Slotify.slots.postView.right); default = Table of Contents -->
      <template #aside>
        <slotify-slot name="postView/right" :ctx="{ pageData, error }"></slotify-slot>
      </template>
    </content-shell>
  `,
  async setup() {
    const route = useRoute();

    // usePostView() owns fetching, lightbox state, and registers the post-mount
    // content hydration. Call it here, before the await below, so its internal
    // onMounted registers synchronously (raw Vue loses the instance context
    // after an await).
    const {
      pageData, error, fetchData,
      lightboxOpen, lightboxSrc,
      contentLightboxOpen, lightboxHtmlContent
    } = usePostView('hugo-content');

    // Fetch before render so the page appears only once its data is ready
    // (held by <Suspense>); a fresh component is created per route (keyed by
    // path), so this runs on every post navigation.
    await fetchData(route.path);

    const currentRoute = Vue.computed(() => route.path);

    return {
      pageData, error,
      lightboxOpen, lightboxSrc,
      contentLightboxOpen, lightboxHtmlContent,
      currentRoute
    };
  }
};
