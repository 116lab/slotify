/**
 * TableOfContents.js
 * Renders an elegant sticky sidebar outline of h2 and h3 headings in the article.
 * Tracks reading position via IntersectionObserver and highlights the active heading.
 *
 * Labels (title / expand / collapse) are passed in as props, so the component is
 * i18n-agnostic: its strings live in the slot namespace that mounts it
 * (Slotify.slots.postView.right), keeping that slot self-contained.
 */
import { anchors } from '../config/routes.js';
import SidebarPanel from './SidebarPanel.js';
import { useTableOfContents } from '../composables/useTableOfContents.js';

export default {
  name: 'TableOfContents',
  components: {
    SidebarPanel
  },
  props: {
    content: {
      type: String,
      default: ''
    },
    containerId: {
      type: String,
      default: 'hugo-content'
    },
    title: { type: String, default: '' },
    expandLabel: { type: String, default: '' },
    collapseLabel: { type: String, default: '' }
  },
  template: `
    <sidebar-panel
      v-if="headings.length > 0"
      icon="mdi-format-list-bulleted"
      :title="title"
      accent="primary"
      :expand-label="expandLabel"
      :collapse-label="collapseLabel"
    >
      <ul class="toc-list sidebar-panel-list">
        <li v-for="heading in headings" :key="heading.id" class="toc-item">
          <a
            :href="anchors.hash(heading.id)"
            class="toc-link sidebar-panel-link"
            :class="[
              heading.level === 'H3' ? 'toc-depth-h3' : 'toc-depth-h2',
              { 'toc-active': activeId === heading.id }
            ]"
            @click.prevent="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </a>
        </li>
      </ul>
    </sidebar-panel>
  `,
  setup(props) {
    // All DOM / observer / scroll logic lives in the composable; this component
    // only renders the outline and forwards click + active state.
    const { headings, activeId, scrollToHeading } = useTableOfContents(
      props.containerId,
      () => props.content
    );

    return {
      headings,
      activeId,
      scrollToHeading,
      anchors
    };
  }
};
