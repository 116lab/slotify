/**
 * highlight.js
 * Pure helpers for safe search keyword highlighting in text.
 * Strictly pure functions with no DOM mutations or side effects (SKILL.md §3).
 */

const AMP_RE = /&/g;
const LT_RE = /</g;
const GT_RE = />/g;
// new RegExp is used for QUOT_RE and APOS_RE instead of literal /"/g and /'/g
// because .agent/scripts/check-indent.py's blank_noncode tokenizer lacks regex
// literal states and treats bare quote characters inside literals as strings.
const QUOT_RE = new RegExp('"', 'g');
const APOS_RE = new RegExp("'", 'g');
const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes raw HTML special characters to prevent XSS.
 * @param {string} text - Raw unescaped string
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(AMP_RE, '&amp;')
    .replace(LT_RE, '&lt;')
    .replace(GT_RE, '&gt;')
    .replace(QUOT_RE, '&quot;')
    .replace(APOS_RE, '&#039;');
}

/**
 * Escapes special characters for use in a regular expression.
 * @param {string} text - Raw string
 * @returns {string} Regex-escaped string
 */
export function escapeRegex(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(REGEX_SPECIAL_RE, '\\$&');
}

/**
 * Highlights occurrences of query within text.
 * Matches terms against raw text (longest first) and wraps matches in
 * `<mark class="search-highlight">...</mark>`, escaping all segments to
 * ensure XSS safety without corrupting HTML entities.
 *
 * @param {string} text - Raw input text
 * @param {string} query - Search term to highlight
 * @returns {string} Safe HTML string with matches wrapped in mark tags
 */
export function highlightText(text, query) {
  if (!text || typeof text !== 'string') return '';
  if (!query || typeof query !== 'string' || !query.trim()) {
    return escapeHtml(text);
  }

  const rawTerms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Deduplicate and sort by descending length so longer terms match before substrings
  const uniqueTerms = Array.from(new Set(rawTerms))
    .sort((a, b) => b.length - a.length);

  if (uniqueTerms.length === 0) return escapeHtml(text);

  const pattern = uniqueTerms.map(escapeRegex).join('|');
  const regex = new RegExp(pattern, 'gi');

  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (regex.lastIndex === match.index) {
      regex.lastIndex++;
    }
    const matchedText = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, matchIndex));
    }

    result += `<mark class="search-highlight">${escapeHtml(matchedText)}</mark>`;
    lastIndex = matchIndex + matchedText.length;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }

  return result;
}
