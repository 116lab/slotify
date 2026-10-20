/**
 * EmptyState.js
 * Presentational, reusable centred "no results / nothing here" block: an icon +
 * message (+ an optional quoted query echoed back). Surface-agnostic — the caller
 * decides whether to wrap it in a BaseSurface (SearchView) or drop it bare into an
 * existing surface (TaxonomyList's chip filter, already inside a card). The root
 * class falls through, so callers supply their own spacing (e.g. py-12).
 */
export default {
  name: 'EmptyState',
  props: {
    icon: { type: String, default: 'mdi-magnify' },
    iconSize: { type: [String, Number], default: 'large' },
    message: { type: String, required: true },
    // Optional term echoed back in quotes after the message (e.g. the query).
    query: { type: String, default: '' }
  },
  template: `
    <div class="text-center text-medium-emphasis">
      <v-icon :size="iconSize" class="mb-2">{{ icon }}</v-icon>
      <div class="text-body-1">
        {{ message }}<span v-if="query"> "{{ query }}"</span>
      </div>
    </div>
  `
};
