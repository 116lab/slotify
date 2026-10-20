/**
 * SocialLinks.js
 * Renders social media buttons based on site configuration.
 */
import { t } from '../i18n.js';

const { computed } = Vue;

// Map social config keys to their Material Design Icon name. Keys whose icon
// name differs from the platform key (or that are not "mdi-<key>") MUST be
// listed here; anything else falls back to `mdi-<key>` (e.g. github -> mdi-github).
const ICON_BY_PLATFORM = {
  email: 'mdi-email',
  mail: 'mdi-email',
  rss: 'mdi-rss',
  website: 'mdi-web',
  web: 'mdi-web',
  mastodon: 'mdi-mastodon',
  youtube: 'mdi-youtube',
  x: 'mdi-alpha-x'
};

const iconFor = (platform) => ICON_BY_PLATFORM[platform] || `mdi-${platform}`;

export default {
  props: {
    siteConfig: { type: Object, required: true },
    variant: { type: String, default: 'full' } // 'full' or 'compact'
  },
  setup(props) {
    const socialLinks = computed(() => {
      const social = props.siteConfig.social || {};
      return Object.entries(social)
        .filter(([, url]) => url && url.trim() !== '')
        .map(([platform, url]) => ({ platform, url, icon: iconFor(platform) }));
    });

    return { socialLinks, t };
  },
  template: `
    <div class="social-links-container d-flex flex-wrap align-center" :class="{ 'justify-center': variant === 'full' }">
      <v-btn
        v-for="link in socialLinks"
        :key="link.platform"
        :icon="link.icon"
        :variant="variant === 'full' ? 'tonal' : 'text'"
        color="primary"
        :class="variant === 'full' ? 'mx-2 my-2 elevation-2 rounded-xl' : 'mr-2'"
        :size="variant === 'full' ? 'large' : 'default'"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        :title="link.platform"
        :aria-label="link.platform"
        class="transition-all hover-scale"
      >
        <v-icon :size="variant === 'full' ? 28 : 24">{{ link.icon }}</v-icon>
      </v-btn>
    </div>
  `
};
