#!/usr/bin/env python3
"""
verify-theme.py
Static guard for the Color / Palette Single Source of Truth (SKILL.md section 11).

The theme palette is defined ONCE in data/theme-palette.json. Hugo injects it
verbatim into the SPA (window.__SLOTIFY_THEMES__) and builds the pre-paint splash
color map from it — the SAME pipeline that feeds window.__SLOTIFY_CONFIG__ to the
route SSOT. config/themes.js is a CONSUMER that shapes it for Vuetify.

Before this pipeline the palette was copy-pasted in three places (themes.js, the
index.html splash map, mermaid fallbacks) and silently drifted. This script fails
(exit 1) when that single-source property is broken. It checks:

  1. SCHEMA  - data/theme-palette.json parses and every personality has light+dark
               with background/surface/primary/secondary as #RRGGBB.
  2. NO HARDCODED PALETTE IN TEMPLATE - layouts/_default/baseof.html (the SPA
               shell every page extends) contains no color hex at all; the splash
               colors MUST come from the data file via Hugo.
  3. INJECTION WIRING - layouts/_default/baseof.html actually injects the palette
               (window.__SLOTIFY_THEMES__ sourced from the "theme-palette" data
               file). Without this the SPA silently falls back to the vibrant-only
               dev default and every other personality breaks — while every other
               check still passes. This is the gap that makes the pipeline real.
  4. CONSUMER INTEGRITY - config/themes.js reads window.__SLOTIFY_THEMES__ (so it
               can't silently revert to a hardcoded palette), and its small
               dev/test fallback cannot drift: every 'vibrant' value in the data
               file must still appear in themes.js.
  5. BRAND-HEX EXCLUSIVITY - every personality's primary/secondary hue appears
               ONLY in the SSOT (+ the themes.js fallback). Any occurrence in CSS,
               components, utils, or templates is drift (e.g. a re-hardcoded
               mermaid/splash brand color). background/surface are NOT value-checked
               because #FFFFFF and dark slates legitimately recur as neutrals.
  6. WCAG CONTRAST - every primary/secondary clears AA (>= 4.5:1) against BOTH its
               own surface and background, so it stays legible as text/icon. Locks
               in the accessibility pass so a future palette edit can't regress it.
  7. PERSONALITY SET DERIVED - useTheme.js derives the personality set from the
               palette instead of hardcoding it. (This replaced the removed SWITCHER
               PARITY check: presentation (name + icon) is no longer owned by
               theme core.) The palette owns WHICH personalities exist + their order;
               the appHeader slot DECORATES each id (its namespaced i18n supplies
               name + icon) and PersonalityList degrades any undecorated id to a
               capitalized name + mdi-palette. There is therefore no core metadata
               map to keep in 1:1 parity, and a site can localize / re-icon / curate
               the switcher from its slot override without a core fork.
  8. PRIMARY/SECONDARY SEPARATION - within each personality+mode, primary and
               secondary must differ by CIEDE2000 >= MIN_PS_DELTAE so the two accents
               are distinguishable and the mesh gradient is not flat. See MIN_PS_DELTAE
               for why the bar is 18 (not 25) for these intentionally monochromatic
               personalities.
  9. PERSONALITY ORDER - hugo.toml [params] personalityOrder lists every palette
               personality exactly once, and the shell injects the resolved order
               (window.__SLOTIFY_PERSONALITIES__) that config/themes.js consumes.
               Hugo maps lose key order, so the palette cannot carry it itself.
"""
import json
import math
import os
import tomllib
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PALETTE = os.path.join(ROOT, 'data', 'theme-palette.json')
# The SPA shell (splash color script + palette injection) lives in the base
# template that every HTML page extends, not in the home template.
SHELL_HTML = os.path.join(ROOT, 'layouts', '_default', 'baseof.html')
THEMES_JS = os.path.join(ROOT, 'static', 'js', 'config', 'themes.js')
USETHEME_JS = os.path.join(ROOT, 'static', 'js', 'composables', 'useTheme.js')
THEME_TOML = os.path.join(ROOT, 'hugo.toml')

ROLES = ('background', 'surface', 'primary', 'secondary')
HEX6 = re.compile(r'#[0-9A-Fa-f]{6}\b')
ANY_HEX = re.compile(r'#[0-9A-Fa-f]{3,8}\b')
WCAG_AA = 4.5  # minimum contrast for primary/secondary used as text/icon
# Minimum perceptual separation (CIEDE2000) between a personality's primary and
# secondary, so the two accents are distinguishable and the mesh1->mesh2 gradient
# is not flat. 18 — NOT 25 — is deliberate: several personalities are intentionally
# monochromatic (ocean=blues, forest=greens, nordic=slate+cool). Demanding ~25
# between two SAME-family colors that must BOTH clear WCAG AA against the same
# background is infeasible (it forces near-black on light mode or neon on dark, and
# nordic.light has no in-family solution at all). 18 roughly doubles the worst
# prior separation (forest.light was ~11) while keeping every hue in its family.
MIN_PS_DELTAE = 18.0


def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _luminance(hex_str):
    h = hex_str.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast_ratio(a, b):
    la, lb = _luminance(a), _luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _lab(hex_str):
    """sRGB hex -> CIE L*a*b* (D65), for perceptual color-difference math."""
    h = hex_str.lstrip('#')
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    r, g, b = (_lin(c) for c in rgb)  # linearized sRGB (shared with _luminance)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505
    xn, yn, zn = 0.95047, 1.0, 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x / xn), f(y / yn), f(z / zn)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def ciede2000(hex1, hex2):
    """CIEDE2000 perceptual color difference (ΔE00) between two hex colors."""
    l1, a1, b1 = _lab(hex1)
    l2, a2, b2 = _lab(hex2)
    c1, c2 = math.hypot(a1, b1), math.hypot(a2, b2)
    cb = (c1 + c2) / 2
    g = 0.5 * (1 - math.sqrt(cb ** 7 / (cb ** 7 + 25 ** 7))) if cb > 0 else 0
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dlp = l2 - l1
    dcp = c2p - c1p
    dhp = h2p - h1p
    if abs(dhp) > 180:
        dhp -= 360 if dhp > 0 else -360
    dHp = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(dhp) / 2)
    lbp = (l1 + l2) / 2
    cbp = (c1p + c2p) / 2
    hbp = (h1p + h2p) / 2
    if abs(h1p - h2p) > 180:
        hbp += 180
    t = (1 - 0.17 * math.cos(math.radians(hbp - 30))
         + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6))
         - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    sl = 1 + (0.015 * (lbp - 50) ** 2) / math.sqrt(20 + (lbp - 50) ** 2)
    sc = 1 + 0.045 * cbp
    sh = 1 + 0.015 * cbp * t
    dtheta = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    rc = 2 * math.sqrt(cbp ** 7 / (cbp ** 7 + 25 ** 7))
    rt = -rc * math.sin(math.radians(2 * dtheta))
    return math.sqrt((dlp / sl) ** 2 + (dcp / sc) ** 2 + (dHp / sh) ** 2
                     + rt * (dcp / sc) * (dHp / sh))


def fail(errs, msg):
    errs.append(msg)


def check_schema(errs):
    try:
        with open(PALETTE, encoding='utf-8') as f:
            palette = json.load(f)
    except Exception as e:
        fail(errs, f'data/theme-palette.json does not parse: {e}')
        return None
    if not isinstance(palette, dict) or not palette:
        fail(errs, 'data/theme-palette.json must be a non-empty object of personalities')
        return None
    for name, modes in palette.items():
        for mode in ('light', 'dark'):
            roles = (modes or {}).get(mode)
            if not isinstance(roles, dict):
                fail(errs, f'{name}.{mode} is missing or not an object')
                continue
            for role in ROLES:
                val = roles.get(role)
                if not (isinstance(val, str) and HEX6.fullmatch(val)):
                    fail(errs, f'{name}.{mode}.{role} must be a #RRGGBB hex (got {val!r})')
    return palette


def check_shell_html(errs):
    try:
        src = open(SHELL_HTML, encoding='utf-8').read()
    except Exception as e:
        fail(errs, f'cannot read layouts/_default/baseof.html: {e}')
        return
    hits = ANY_HEX.findall(src)
    if hits:
        fail(errs, 'layouts/_default/baseof.html must contain NO color hex — the palette '
                   f'comes from data/theme-palette.json via Hugo. Found: {sorted(set(hits))}')
    # Wiring: the palette MUST actually be injected from the data file. Without
    # this, the SPA silently falls back to the vibrant-only dev default.
    if '__SLOTIFY_THEMES__' not in src:
        fail(errs, 'layouts/_default/baseof.html must inject window.__SLOTIFY_THEMES__ '
                   '(the palette is wired to the SPA here)')
    elif '"theme-palette"' not in src:
        fail(errs, 'layouts/_default/baseof.html injects __SLOTIFY_THEMES__ but not from the '
                   '"theme-palette" data file — it must read `index .Site.Data "theme-palette"`')
    # Site override wiring: the shell MUST deep-merge an optional [params.palette]
    # over the data defaults, so a consuming site can override a single role
    # without restating the whole personality (a data/ file merges only shallowly).
    elif not (re.search(r'\bmerge\b', src) and 'Params.palette' in src):
        fail(errs, 'layouts/_default/baseof.html must DEEP-merge the optional site override '
                   '(`merge (index .Site.Data "theme-palette") (.Site.Params.palette ...)`) so a '
                   'site can override a single role without losing the untouched ones')


def check_brand_exclusivity(errs, palette):
    """Every personality's primary/secondary hue may appear ONLY in the SSOT and
    the documented themes.js fallback. A hit anywhere else is drift."""
    if not palette:
        return
    brand = set()
    for modes in palette.values():
        for mode in ('light', 'dark'):
            roles = (modes or {}).get(mode) or {}
            for role in ('primary', 'secondary'):
                v = roles.get(role)
                if isinstance(v, str):
                    brand.add(v.lower())
    scan_dirs = [
        os.path.join(ROOT, 'static', 'js'),
        os.path.join(ROOT, 'static', 'css'),
        os.path.join(ROOT, 'layouts'),
    ]
    allowed = {os.path.abspath(PALETTE), os.path.abspath(THEMES_JS)}
    for base in scan_dirs:
        for dp, _, files in os.walk(base):
            for f in files:
                if not f.endswith(('.js', '.css', '.html')):
                    continue
                path = os.path.join(dp, f)
                if os.path.abspath(path) in allowed:
                    continue
                try:
                    text = open(path, encoding='utf-8').read().lower()
                except Exception:
                    continue
                for hue in sorted(brand):
                    if hue in text:
                        rel = os.path.relpath(path, ROOT)
                        fail(errs, f'{rel}: hardcoded brand hue {hue} — primary/secondary '
                                   'colors live ONLY in data/theme-palette.json. Use a '
                                   'theme token (var(--v-theme-*)) or a neutral gray.')


def check_consumer(errs, palette):
    try:
        src = open(THEMES_JS, encoding='utf-8').read()
    except Exception as e:
        fail(errs, f'cannot read config/themes.js: {e}')
        return
    if '__SLOTIFY_THEMES__' not in src:
        fail(errs, 'config/themes.js must consume window.__SLOTIFY_THEMES__ '
                   '(the injected palette SSOT), not a hardcoded palette')
    # Dev/test fallback cannot drift: vibrant values from the SSOT must appear.
    if palette and 'vibrant' in palette:
        for mode in ('light', 'dark'):
            for role in ROLES:
                val = palette['vibrant'][mode][role]
                if val not in src:
                    fail(errs, f'config/themes.js dev fallback is stale: vibrant.{mode}.{role} '
                               f'({val}) from the SSOT is not present')


def check_contrast(errs, palette):
    """Every primary/secondary must clear WCAG AA (>= 4.5:1) against BOTH its own
    surface and background, so it is legible as text/icon (not only as a fill)."""
    if not palette:
        return
    for name, modes in palette.items():
        for mode in ('light', 'dark'):
            roles = (modes or {}).get(mode) or {}
            surf, bg = roles.get('surface'), roles.get('background')
            if not (surf and bg):
                continue
            for role in ('primary', 'secondary'):
                val = roles.get(role)
                if not val:
                    continue
                r = min(contrast_ratio(val, surf), contrast_ratio(val, bg))
                if r < WCAG_AA:
                    fail(errs, f'{name}.{mode}.{role} ({val}) contrast {r:.2f}:1 is below '
                               f'WCAG AA {WCAG_AA}:1 vs its surface/background — darken (light) '
                               'or lighten (dark) the hue until it clears AA.')


def check_separation(errs, palette):
    """Every personality's primary and secondary must be perceptually distinct
    (CIEDE2000 >= MIN_PS_DELTAE) so the two accents are tellable apart and the
    mesh1->mesh2 gradient is not flat. See MIN_PS_DELTAE for why the bar is 18."""
    if not palette:
        return
    for name, modes in palette.items():
        for mode in ('light', 'dark'):
            roles = (modes or {}).get(mode) or {}
            p, s = roles.get('primary'), roles.get('secondary')
            if not (p and s):
                continue
            de = ciede2000(p, s)
            if de < MIN_PS_DELTAE:
                fail(errs, f'{name}.{mode}: primary ({p}) and secondary ({s}) are too close — '
                           f'ΔE2000 {de:.1f} < {MIN_PS_DELTAE:.0f}. Spread their lightness/chroma '
                           '(keep the hue family) until they separate; they must also stay WCAG '
                           'AA vs surface/background.')


def check_personality_set_derived(errs, palette):
    """The personality SET + order are owned by the palette. Assert useTheme.js
    still DERIVES the set from config/themes.js (personalityIds / defaultPersonality)
    rather than hardcoding a list or a default name — the only core invariant left
    now that name/icon presentation moved to the appHeader slot."""
    try:
        src = open(USETHEME_JS, encoding='utf-8').read()
    except Exception as e:
        fail(errs, f'cannot read composables/useTheme.js: {e}')
        return
    if 'personalityIds' not in src:
        fail(errs, 'composables/useTheme.js must derive the personality set from '
                   'config/themes.js (personalityIds), not a hardcoded list')
    if 'PERSONALITY_META' in src:
        fail(errs, 'composables/useTheme.js still defines PERSONALITY_META — switcher '
                   'name/icon presentation must live in the appHeader slot '
                   '(layouts/partials/slots/appHeader.html), not theme core.')


def check_personality_order(errs, palette):
    """Hugo maps lose key order and jsonify emits keys alphabetically, so the
    personality order (and the default personality, its first id) is declared by
    [params] personalityOrder in the theme's hugo.toml. Assert that list names
    every palette personality exactly once and nothing else, and that the shell
    injects the resolved order and config/themes.js consumes it."""
    try:
        with open(THEME_TOML, 'rb') as f:
            order = tomllib.load(f).get('params', {}).get('personalityOrder')
    except Exception as e:
        fail(errs, f'cannot read hugo.toml: {e}')
        return
    if not isinstance(order, list) or not order:
        fail(errs, 'hugo.toml [params] personalityOrder must be a non-empty list of '
                   'palette ids (Hugo cannot keep the palette\'s own key order).')
        return
    if palette is not None and (sorted(order) != sorted(palette) or len(set(order)) != len(order)):
        fail(errs, f'hugo.toml personalityOrder {order} must list every personality in '
                   f'data/theme-palette.json exactly once ({sorted(palette)}).')
    for path, token, what in (
        (SHELL_HTML, '__SLOTIFY_PERSONALITIES__', 'inject window.__SLOTIFY_PERSONALITIES__'),
        (SHELL_HTML, 'personalityOrder', 'resolve the order from [params] personalityOrder'),
        (THEMES_JS, '__SLOTIFY_PERSONALITIES__', 'order personalityIds by window.__SLOTIFY_PERSONALITIES__'),
    ):
        try:
            src = open(path, encoding='utf-8').read()
        except Exception as e:
            fail(errs, f'cannot read {os.path.relpath(path, ROOT)}: {e}')
            continue
        if token not in src:
            fail(errs, f'{os.path.relpath(path, ROOT)} must {what}.')


def main():
    errs = []
    palette = check_schema(errs)
    check_shell_html(errs)
    check_consumer(errs, palette)
    check_brand_exclusivity(errs, palette)
    check_contrast(errs, palette)
    check_separation(errs, palette)
    check_personality_set_derived(errs, palette)
    check_personality_order(errs, palette)
    if errs:
        print('=' * 60)
        print('[ERROR] Color/Palette SSOT violation (SKILL.md section 11)')
        print('The palette MUST live only in data/theme-palette.json and flow')
        print('through Hugo (window.__SLOTIFY_THEMES__) to config/themes.js.')
        print('-' * 60)
        for e in errs:
            print(f'  {e}')
        print('=' * 60)
        return 1
    print('[check-theme] OK: palette SSOT intact (data-driven, no hardcoded drift).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
