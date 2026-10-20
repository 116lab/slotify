import { t } from '../i18n.js';

export default {
  name: 'BaseLightbox',
  props: {
    isOpen: { type: Boolean, required: true }
  },
  emits: ['update:isOpen'],
  setup() {
    return { t };
  },
  template: `
    <v-dialog 
      :model-value="isOpen" 
      @update:model-value="$emit('update:isOpen', $event)" 
      width="auto"
      transition="fade-transition"
      content-class="lightbox-dialog"
    >
      <!-- Close on backdrop click only (@click.self): clicks on the injected
           content (image / diagram) do NOT close, so it stays interactive. -->
      <div class="lightbox-content" @click.self="$emit('update:isOpen', false)">
        <!-- Close Button (Outside/Above the injected content) -->
        <v-btn
          icon="mdi-close"
          size="small"
          variant="flat"
          class="lightbox-close-btn"
          :aria-label="t('ui.close')"
          @click.stop="$emit('update:isOpen', false)"
        >
        </v-btn>

        <!-- Slot for injecting Image or Content markup -->
        <slot></slot>
      </div>
    </v-dialog>
  `
};
