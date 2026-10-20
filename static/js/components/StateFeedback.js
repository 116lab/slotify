import { t } from '../i18n.js';
import { paths } from '../config/routes.js';

/**
 * StateFeedback.js
 * Error feedback for a route view. Per-route loading is handled upstream by
 * <Suspense> (App.js holds the current page until the next route's data
 * resolves, with a top progress bar), so this component surfaces the error
 * state only — no skeletons.
 */
export default {
  name: 'StateFeedback',
  props: {
    error: { type: Boolean, default: false }
  },
  template: `
    <v-alert
      v-if="error"
      type="error"
      :title="t('ui.loadingFailed')"
      :text="t('ui.notFoundText')"
      variant="tonal"
      class="mt-4"
    >
      <template v-slot:append>
        <v-btn color="error" variant="text" :to="paths.home()">{{ t('ui.backToHome') }}</v-btn>
      </template>
    </v-alert>
  `,
  setup() {
    return { paths, t };
  }
};
