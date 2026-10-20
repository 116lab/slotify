/**
 * slugify.js
 * Convert a taxonomy term into the same path segment Hugo normally generates,
 * so client-built chip links resolve to real {term}/index.json endpoints.
 *
 * Mirrors Hugo's UnicodeSanitize for the realistic term set: lowercased,
 * whitespace collapsed to a single "-", and Unicode letters/numbers plus
 * "._~+-" preserved. This matches Hugo for examples like:
 * "Node.js" -> "node.js", "ASP.NET Core" -> "asp.net-core", "C++" -> "c++".
 *
 * Not matched: custom front-matter slugs, or characters like "#" that are
 * fragment delimiters in History-mode SPA routing.
 */
export function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._~+-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
