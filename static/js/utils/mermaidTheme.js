/**
 * mermaidTheme.js
 * PURE helpers that translate a Vuetify theme into Mermaid color inputs and the
 * Mermaid initialize() config object. No DOM, no library calls, no i18n — the
 * rendering side effects (mermaid.initialize/render and the error fallback) live
 * in the useMermaid composable (utils/ are pure helper functions).
 */

function normalizeHex(hex, fallback) {
  return /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : fallback;
}

function hexWithAlpha(hex, alpha) {
  const safeHex = normalizeHex(hex, '#64748b');
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${safeHex}${a}`;
}

/**
 * Extract the Mermaid color inputs from a Vuetify theme object. The single place
 * that defines the { primary, secondary, background, surface, dark } shape that
 * mermaidInitConfig() consumes, so the hydration path (useContentHydration) and
 * the theme-switch path (useTheme) cannot drift apart.
 * @param {object} themeObj - a Vuetify theme entry (has `.colors` and `.dark`)
 * @param {boolean} [dark] - explicit dark flag; falls back to themeObj.dark
 */
export function themeColorsForMermaid(themeObj, dark) {
  const colors = (themeObj && themeObj.colors) || {};
  return {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    dark: dark === undefined ? !!(themeObj && themeObj.dark) : !!dark
  };
}

/**
 * Build the Mermaid initialize() config from Slotify theme colors. Pure: returns
 * a plain config object; the caller (useMermaid) applies it to the library.
 * @param {object} colors - { primary, secondary, background, surface, dark }
 */
export function mermaidInitConfig({ primary, secondary, background, surface, dark }) {
  // Brand colors come from the theme (the palette). The fallbacks below are
  // last-resort neutral grays for a degraded/unthemed state only — intentionally
  // not any personality's hue, so they can never drift from the palette table.
  const primaryColor = normalizeHex(primary, dark ? '#9ca3af' : '#6b7280');
  const secondaryColor = normalizeHex(secondary, dark ? '#9ca3af' : '#6b7280');
  const backgroundColor = normalizeHex(background, dark ? '#111827' : '#ffffff');
  const surfaceColor = normalizeHex(surface, dark ? '#1f2937' : '#ffffff');
  // Mermaid-internal text/grid colors (not palette roles — mermaid owns these).
  // Kept off the palette's brand hues so brand hex values stay defined only in
  // the palette and never collide with these.
  const textColor = dark ? '#e2e8f0' : '#1e293b';
  const mutedText = dark ? '#9ca3af' : '#64748b';
  const borderColor = dark
    ? hexWithAlpha(primaryColor, 0.5)
    : hexWithAlpha(primaryColor, 0.6);

  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    themeVariables: {
      primaryColor: hexWithAlpha(primaryColor, 0.12),
      primaryBorderColor: borderColor,
      primaryTextColor: textColor,

      secondaryColor: hexWithAlpha(secondaryColor, 0.10),
      secondaryBorderColor: hexWithAlpha(secondaryColor, 0.4),
      secondaryTextColor: textColor,

      tertiaryColor: backgroundColor,
      tertiaryBorderColor: hexWithAlpha(primaryColor, 0.2),
      tertiaryTextColor: textColor,

      background: backgroundColor,
      mainBkg: surfaceColor,
      nodeBorder: borderColor,
      clusterBkg: hexWithAlpha(primaryColor, 0.06),
      clusterBorder: borderColor,

      titleColor: textColor,
      textColor: textColor,
      labelTextColor: textColor,
      edgeLabelBackground: surfaceColor,
      attributeBackgroundColorEven: surfaceColor,
      attributeBackgroundColorOdd: backgroundColor,

      lineColor: dark ? hexWithAlpha(primaryColor, 0.7) : primaryColor,

      git0: primaryColor,
      git1: secondaryColor,
      git2: hexWithAlpha(primaryColor, 0.6),
      git3: hexWithAlpha(secondaryColor, 0.6),

      actorBkg: surfaceColor,
      actorBorder: borderColor,
      actorTextColor: textColor,
      actorLineColor: borderColor,
      signalColor: textColor,
      signalTextColor: textColor,
      noteBkgColor: hexWithAlpha(secondaryColor, 0.12),
      noteBorderColor: hexWithAlpha(secondaryColor, 0.4),
      noteTextColor: textColor,
      activationBkgColor: hexWithAlpha(primaryColor, 0.12),
      activationBorderColor: borderColor,

      taskBkgColor: hexWithAlpha(primaryColor, 0.15),
      taskBorderColor: borderColor,
      taskTextColor: textColor,
      gridColor: mutedText,
      fillType0: hexWithAlpha(primaryColor, 0.12),
      fillType1: hexWithAlpha(secondaryColor, 0.12),

      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      fontSize: '15px',
    },
  };
}
