const { useRoute } = VueRouter;
import StateFeedback from '../components/StateFeedback.js';
import BaseSurface from '../components/BaseSurface.js';
import SocialLinks from '../components/SocialLinks.js';
import PageHeader from '../components/PageHeader.js';
import FeaturedImage from '../components/FeaturedImage.js';
import ContentShell from '../components/ContentShell.js';
import { useAbout } from '../composables/useAbout.js';

export default {
  components: {
    StateFeedback,
    BaseSurface,
    SocialLinks,
    PageHeader,
    FeaturedImage,
    ContentShell
  },
  template: `
    <content-shell>
      <template #header>
        <page-header v-if="!error" icon="mdi-information-outline" :title="pageTitle"></page-header>
      </template>

      <state-feedback :error="error"></state-feedback>

      <!-- Top slot (Slotify.slots.aboutView.top): above the About BaseSurface -->
      <slotify-slot name="aboutView/top" :ctx="{ pageData }"></slotify-slot>

      <base-surface v-if="!error" :hover-lift="false" class="pa-0 overflow-hidden">
        <featured-image :src="pageData.image" :alt="pageTitle" :max-height="400"></featured-image>

        <div class="pa-8">
          <!-- Content-top slot (Slotify.slots.aboutView.contentTop): inside the
               BaseSurface, above the About body (e.g. a disclaimer/notice) -->
          <slotify-slot name="aboutView/contentTop" :ctx="{ pageData }"></slotify-slot>

          <!-- About Content -->
          <v-card-text class="text-body-1 pa-0 pb-6">
            <div v-html="pageData.content" class="markdown-body" id="about-content"></div>
          </v-card-text>

          <!-- Content-bottom slot (Slotify.slots.aboutView.contentBottom): inside
               the BaseSurface, below the About body -->
          <slotify-slot name="aboutView/contentBottom" :ctx="{ pageData }"></slotify-slot>
        </div>
      </base-surface>

      <!-- Bottom slot (Slotify.slots.aboutView.bottom): below the About BaseSurface -->
      <slotify-slot name="aboutView/bottom" :ctx="{ pageData }"></slotify-slot>

      <!-- Side rails: mounted unconditionally; the shell always reserves the
           gutter, and an unoverridden slot simply renders empty (whitespace). -->
      <template #aside-left>
        <slotify-slot name="aboutView/left" :ctx="{ pageData }"></slotify-slot>
      </template>
      <template #aside>
        <slotify-slot name="aboutView/right" :ctx="{ pageData }"></slotify-slot>
      </template>
    </content-shell>
  `,
  async setup() {
    const route = useRoute();
    const { pageData, pageTitle, error, siteConfig, fetchData } = useAbout();

    await fetchData(route.path);

    return { pageData, pageTitle, error, siteConfig };
  }
};
