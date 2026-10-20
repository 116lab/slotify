const { computed } = Vue;
import { slugify } from '../utils/slugify.js';
import { paths } from '../config/routes.js';

export default {
  name: 'BaseChip',
  props: {
    type: { type: String, required: true, validator: v => ['tag', 'series'].includes(v) },
    title: { type: String, required: true },
    icon: { type: String, default: null },
    to: { type: String, default: null },
    size: { type: String, default: null },
    // Selected state: marks this chip as the taxonomy term currently being
    // viewed. Renders filled, non-navigating, with a check — so re-clicking
    // the term you're already on can't sit there doing nothing ("broken").
    active: { type: Boolean, default: false }
  },
  emits: ['chip-click'],
  template: `
    <v-chip
      v-bind="chipProps"
      :to="active ? null : targetUrl"
      :ripple="!active"
      :aria-current="active ? 'page' : null"
      @click="handleClick"
    >
      <v-icon start :icon="displayIcon" :size="type === 'tag' ? 'x-small' : 'small'"></v-icon>
      {{ type === 'tag' ? '#' + title : title }}
      <v-icon v-if="active" end icon="mdi-check" size="x-small" class="ml-1"></v-icon>
      <slot name="append"></slot>
    </v-chip>
  `,
  setup(props, { emit }) {
    const chipProps = computed(() => {
      const isSeries = props.type === 'series';
      return {
        size: props.size || 'small',
        color: isSeries ? 'secondary' : 'primary',
        // Filled when selected, tonal otherwise — same color language.
        variant: props.active ? 'flat' : 'tonal',
        class: isSeries ? 'font-weight-bold px-3' : 'font-weight-medium'
      };
    });

    const displayIcon = computed(() => {
      if (props.icon) return props.icon;
      return props.type === 'series' ? 'mdi-bookshelf' : 'mdi-tag-outline';
    });

    const targetUrl = computed(() => {
      if (props.to) return props.to;
      const taxonomy = props.type === 'series' ? 'series' : 'tags';
      return paths.taxonomy(taxonomy, slugify(props.title));
    });

    const handleClick = (event) => {
      if (props.active) {
        // The selected chip is not a link, but it sits inside a clickable
        // card (<a>). stopPropagation alone won't stop the browser from
        // following that ancestor anchor on click — that fires a
        // full-page navigation (→ "page not found" in the SPA). Cancel
        // the default action too, so the current term is truly inert.
        event?.preventDefault?.();
        event?.stopPropagation?.();
        return;
      }
      if (!props.to) {
        emit('chip-click', { type: props.type, title: props.title, url: targetUrl.value });
      }
    };

    return { chipProps, displayIcon, targetUrl, handleClick };
  }
};
