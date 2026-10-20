/**
 * contentFields.js
 * Pure helpers + constants for Hugo content-card fields, so the sentinel and
 * field-precedence rules live in one place instead of being re-derived in every
 * card component (PostCard, both 'feed' and 'list' variants). No DOM — pure
 * functions.
 */

/**
 * Hugo emits this sentinel date for content with no `date` set. It must be
 * treated as "no date" rather than rendered as a real (year 1) timestamp.
 */
export const ZERO_DATE = '0001-01-01';

/** True when an item has a real (non-sentinel) publish date worth displaying. */
export function hasDisplayDate(item) {
  return !!(item && item.date && item.date !== ZERO_DATE);
}

/**
 * Canonical card description. `summary` is the field produced by
 * func/card-data.html; `description` is an optional front-matter fallback.
 * Returns '' when neither exists, so callers can append a localized
 * "read more" fallback in the template.
 */
export function cardSummary(item) {
  return (item && (item.summary || item.description)) || '';
}

/**
 * Resolves the display text for a card summary, falling back to a localized
 * string when no summary or description exists.
 */
export function cardSummaryText(item, fallback = '') {
  return cardSummary(item) || fallback;
}

/** True when an item has series terms worth rendering. */
export function hasSeries(item) {
  return !!(item && item.series && item.series.length);
}

/** True when an item has tag terms worth rendering. */
export function hasTags(item) {
  return !!(item && item.tags && item.tags.length);
}

/** True when an item has taxonomy terms (series or tags) worth rendering. */
export function hasTaxonomy(item) {
  return hasSeries(item) || hasTags(item);
}
