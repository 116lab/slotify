export default {
  name: 'AnimatedList',
  props: {
    items: { type: Array, required: true },
    itemKey: { type: String, default: 'url' },
    delayStep: { type: Number, default: 0.1 }
  },
  template: `
    <div class="post-list-feed">
      <div
        v-for="(item, idx) in items"
        :key="item[itemKey]"
        class="fade-up"
        :style="{ animationDelay: (idx * delayStep) + 's' }"
      >
        <slot :item="item" :index="idx"></slot>
      </div>
    </div>
  `
};
