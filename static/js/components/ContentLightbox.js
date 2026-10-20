import BaseLightbox from './BaseLightbox.js';

export default {
  name: 'ContentLightbox',
  components: {
    BaseLightbox
  },
  props: {
    isOpen: { type: Boolean, required: true },
    content: { type: String, required: true }
  },
  emits: ['update:isOpen'],
  template: `
    <base-lightbox 
      :is-open="isOpen" 
      @update:is-open="$emit('update:isOpen', $event)"
    >
      <!-- Scrollable Wrapper for SVG/HTML contents -->
      <div class="lightbox-content-scrollable" @click.stop v-html="content"></div>
    </base-lightbox>
  `
};
