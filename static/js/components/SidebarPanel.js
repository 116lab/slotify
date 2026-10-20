/**
 * SidebarPanel.js
 * Shared base for collapsible sidebar widgets (Table of Contents, Series
 * Navigator). Owns the structure both widgets share so they stay consistent: the
 * surface shell, the collapsible header row (icon + title + chevron + a11y +
 * collapse state), the expand transition, and the divider.
 *
 * Variation is expressed only through props/slots:
 *   - `accent` ('primary' | 'secondary') drives the icon, chevron, and title color
 *   - `icon` / `title` set the header
 *   - the default slot carries the body (list, links, etc.)
 *
 * So both widgets look like one family from a single header markup + a single
 * `.sidebar-panel-title` rule, rather than two parallel copies to keep aligned.
 */
const { ref } = Vue;
import BaseSurface from './BaseSurface.js';

export default {
  name: 'SidebarPanel',
  components: {
    BaseSurface
  },
  props: {
    // mdi icon name shown in the header
    icon: { type: String, required: true },
    // Header label text
    title: { type: String, required: true },
    // Accent theme color — the ONLY sanctioned visual difference between panels
    accent: { type: String, default: 'primary' },
    // a11y labels for the collapse toggle
    expandLabel: { type: String, default: '' },
    collapseLabel: { type: String, default: '' }
  },
  template: `
    <base-surface
      :hover-lift="false"
      class="sidebar-panel pa-0"
      :class="'sidebar-panel--' + accent"
      role="complementary"
      :aria-label="title"
    >
      <div
        class="sidebar-panel-header d-flex align-center justify-space-between cursor-pointer user-select-none pa-4"
        role="button"
        tabindex="0"
        :aria-expanded="String(!isCollapsed)"
        :aria-label="isCollapsed ? expandLabel : collapseLabel"
        @click="toggleCollapsed"
        @keydown.enter.prevent="toggleCollapsed"
        @keydown.space.prevent="toggleCollapsed"
      >
        <div class="d-flex align-center min-width-0">
          <v-icon size="small" class="mr-2" :color="accent">{{ icon }}</v-icon>
          <span class="sidebar-panel-title">{{ title }}</span>
        </div>
        <v-icon
          size="x-small"
          :color="isCollapsed ? 'medium-emphasis' : accent"
          class="sidebar-panel-chevron"
          :class="{ 'sidebar-panel-chevron-open': !isCollapsed }"
        >
          mdi-chevron-down
        </v-icon>
      </div>

      <v-expand-transition>
        <div v-show="!isCollapsed" class="sidebar-panel-body px-4 pb-6">
          <v-divider class="mb-4 opacity-10"></v-divider>
          <slot></slot>
        </div>
      </v-expand-transition>
    </base-surface>
  `,
  setup() {
    const isCollapsed = ref(false);
    const toggleCollapsed = () => {
      isCollapsed.value = !isCollapsed.value;
    };
    return { isCollapsed, toggleCollapsed };
  }
};
