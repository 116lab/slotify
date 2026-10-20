# Slot contract
format: 1
subject: static/js/components/Slot.js
subject: static/js/composables/useSlotBridge.js
subject: static/js/utils/slotCtx.js
subject: tests/slots.spec.js

## Commitments
- The slot ctx and the `slotify:slot` detail (`{ id, phase, ctx, el }`) are a public API:
  consuming sites annotate their slot overrides against it, so fields are only added,
  never renamed or removed, or those sites break.
  - `a deep-linked post mounts postView/bottom with a complete ctx`
- `slotify:theme` carries the semantic `{ name, personality, mode }`, so site widgets
  re-theme from the event instead of depending on framework internals.
  - `theme and locale changes broadcast semantic slotify:* events`

## Judgment
- ctx is complete at a slot's first mount because siteConfig is injected synchronously
  rather than hydrated asynchronously, so a slot needs no readiness gate and
  `slotify:slot` fires only on the slot's own lifecycle.
  - `a deep-linked post mounts postView/bottom with a complete ctx`
- `slotify:locale` is emitted from a watch on the locale state rather than from a setter,
  so every path that changes the locale broadcasts without coupling to a specific setter.
  - `slotify:locale follows the locale state, not a specific setter`

## Rejected
- Slots watching Vuetify's `v-theme--*` class for light/dark: it couples every override
  to an implementation detail.
