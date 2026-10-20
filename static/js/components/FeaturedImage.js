/**
 * FeaturedImage.js
 * Edge-to-edge featured image for content surfaces (PostView, AboutView). Renders
 * nothing when `src` is empty, and always shows a spinner placeholder while the
 * image loads — defined here once so the two views share the same placeholder.
 * max-height stays a prop (article vs page differ slightly).
 */
export default {
  name: 'FeaturedImage',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    maxHeight: { type: [String, Number], default: 450 },
    aspectRatio: { type: [String, Number], default: 1.7778 }
  },
  template: `
    <v-img
      v-if="src"
      :src="src"
      :alt="alt"
      :aspect-ratio="aspectRatio"
      :max-height="maxHeight"
      cover
    >
      <template v-slot:placeholder>
        <div class="d-flex align-center justify-center fill-height">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
      </template>
    </v-img>
  `
};
