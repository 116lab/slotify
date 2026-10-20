/**
 * BaseSurface.js
 * The shared container primitive for content surfaces: it owns the glassmorphism,
 * border-radius, depth, and the hover-lift interaction so every card looks and
 * behaves the same.
 *
 * When `to` is set, the whole card becomes a single navigation target via a
 * stretched-link overlay rather than an <a> wrapping the content — this avoids
 * nested anchors (which fall through to a full-page reload). Interactive children
 * (chips, buttons) are lifted above the overlay so they stay independently clickable.
 */
import { prefetchContentData } from '../services/api.js';

export default {
  name: 'BaseSurface',
  props: {
    // If provided, the whole card becomes a router link (stretched overlay).
    to: { type: String, default: null },
    // Accessible name for the stretched link (usually the post title).
    linkLabel: { type: String, default: '' },
    // Enable the standard lift+shadow hover animation
    hoverLift: { type: Boolean, default: true },
    // Custom elevation if needed (default 0 for glass style)
    elevation: { type: [Number, String], default: 0 },
    // Surface color (usually 'surface')
    color: { type: String, default: 'surface' },
    // Custom padding classes
    padding: { type: String, default: '' }
  },
  setup(props) {
    const prefetch = () => {
      if (props.to) {
        prefetchContentData(props.to);
      }
    };
    return { prefetch };
  },
  template: `
    <v-card
      :elevation="elevation"
      :color="color"
      class="base-surface base-surface-root"
      :class="[
        hoverLift ? 'v-card--hover-lift' : 'glass-panel',
        padding,
        { 'base-surface--link': to }
      ]"
    >
      <slot></slot>

      <!-- Whole-card navigation without nested anchors: one stretched link
           overlays the entire surface (hit area via CSS inset:0). Interactive
           children (chips/buttons) are lifted above it (z-index) so they remain
           independently clickable and never fall through. -->
      <router-link
        v-if="to"
        :to="to"
        class="base-surface__stretched"
        :aria-label="linkLabel || undefined"
        @mouseenter="prefetch"
        @focus="prefetch"
      ></router-link>
    </v-card>
  `
};
