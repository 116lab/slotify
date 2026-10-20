/**
 * SearchField.js
 * The app's single search/filter input primitive. Fixes the shared affordances
 * (magnify icon, localized hint label, outlined + clearable + hide-details) in
 * one place so the search view and the taxonomy filter stay consistent.
 *
 * It renders a single <v-text-field> root, so any extra attributes the caller
 * passes — class (margins), density, :loading, v-if — fall through to it
 * natively. Only v-model is wired explicitly.
 */
import { t } from '../i18n.js';

export default {
  name: 'SearchField',
  props: {
    modelValue: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  template: `
    <v-text-field
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event ?? '')"
      prepend-inner-icon="mdi-magnify"
      :label="t('ui.searchHint')"
      variant="outlined"
      clearable
      hide-details
    ></v-text-field>
  `,
  setup() {
    return { t };
  }
};
