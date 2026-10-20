const { computed } = Vue;

// Page-button count per Vuetify breakpoint; anything wider than `sm` (≥960px)
// gets the full 7. Vuetify's own width-based auto-fit is bypassed the moment
// `total-visible` is set, so we re-derive a sane count here rather than
// hardcoding 7 (which overflows narrow phones): mobile 3, tablet 5.
const RESPONSIVE_VISIBLE = { xs: 3, sm: 5 };

export default {
  name: 'PaginationControl',
  props: {
    modelValue: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    // null = responsive (default): the count follows the breakpoint.
    // A number pins the count and opts out of responsiveness.
    totalVisible: { type: Number, default: null }
  },
  emits: ['update:modelValue', 'change'],
  setup(props) {
    const { name } = Vuetify.useDisplay();
    const resolvedVisible = computed(() =>
      props.totalVisible != null ? props.totalVisible : (RESPONSIVE_VISIBLE[name.value] ?? 7)
    );
    return { resolvedVisible };
  },
  template: `
    <div v-if="totalPages > 1" class="text-center mt-8">
      <v-pagination
        :model-value="modelValue"
        :length="totalPages"
        :total-visible="resolvedVisible"
        color="primary"
        @update:modelValue="$emit('update:modelValue', $event); $emit('change', $event)"
      ></v-pagination>
    </div>
  `
};
