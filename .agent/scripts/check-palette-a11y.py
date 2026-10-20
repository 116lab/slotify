#!/usr/bin/env python3
"""
check-palette-a11y.py — PORTABLE accessibility self-check for a Slotify palette.

For CONSUMING SITES. The theme's own palette is guarded at theme-commit time by
verify-theme.py, but that guard cannot see your site's `[params.palette]`
overrides (they live in YOUR repo). Once you recolor, the accessibility of those
colors is yours to own — this script lets you check them with the SAME rules the
theme enforces on itself:

  • WCAG AA (>= 4.5:1) for every primary/secondary against BOTH its own surface
    and background, so accent text/icons stay legible.
  • CIEDE2000 >= 18 between each personality's primary and secondary, so the two
    accents (and the mesh1->mesh2 gradient) don't collapse into one color.

This file is SELF-CONTAINED (only Python stdlib) — copy it into your site and run
it; it has no dependency on the rest of the theme.

Usage:
    python3 check-palette-a11y.py [palette.json]

`palette.json` is the FINAL palette you ship — i.e. theme defaults with your
overrides already merged. Quickest way to produce it from a built site:
    hugo --quiet && python3 -c "import json;print(open('public/index.html').read())"
... or simply point it at a `data/theme-palette.json` if you override via the
data file. Defaults to ./data/theme-palette.json.

Exit code 0 = all clear; 1 = at least one violation (suitable for CI / pre-commit).
"""
import json
import math
import re
import sys

WCAG_AA = 4.5
MIN_PS_DELTAE = 18.0
ROLES = ('background', 'surface', 'primary', 'secondary')
HEX6 = re.compile(r'^#[0-9A-Fa-f]{6}$')


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
    """sRGB hex -> CIE L*a*b* (D65)."""
    h = hex_str.lstrip('#')
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    r, g, b = (_lin(c) for c in rgb)
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


def main(argv):
    path = argv[1] if len(argv) > 1 else 'data/theme-palette.json'
    try:
        palette = json.load(open(path, encoding='utf-8'))
    except Exception as e:
        print(f'[check-palette-a11y] cannot read {path}: {e}')
        return 1

    errs = []
    for name, modes in (palette or {}).items():
        for mode in ('light', 'dark'):
            roles = (modes or {}).get(mode) or {}
            missing = [r for r in ROLES if not roles.get(r)]
            if missing:
                errs.append(f'{name}.{mode}: missing role(s) {missing}')
                continue
            bad = [f'{r}={roles[r]!r}' for r in ROLES if not HEX6.match(str(roles[r]))]
            if bad:
                errs.append(f'{name}.{mode}: role(s) must be #RRGGBB hex — got {bad}')
                continue
            surf, bg = roles['surface'], roles['background']
            for role in ('primary', 'secondary'):
                val = roles[role]
                r = min(contrast_ratio(val, surf), contrast_ratio(val, bg))
                if r < WCAG_AA:
                    errs.append(f'{name}.{mode}.{role} ({val}) contrast {r:.2f}:1 '
                                f'< WCAG AA {WCAG_AA}:1 vs its surface/background — '
                                'darken (light) or lighten (dark) the hue until it clears AA.')
            de = ciede2000(roles['primary'], roles['secondary'])
            if de < MIN_PS_DELTAE:
                errs.append(f'{name}.{mode}: primary ({roles["primary"]}) and secondary '
                            f'({roles["secondary"]}) too close — ΔE2000 {de:.1f} < {MIN_PS_DELTAE:.0f}. '
                            'Spread their lightness/chroma (keep the hue family).')

    if errs:
        print('=' * 60)
        print(f'[ERROR] palette accessibility violations in {path}')
        print('-' * 60)
        for e in errs:
            print(f'  {e}')
        print('=' * 60)
        return 1
    n = len(palette or {})
    print(f'[check-palette-a11y] OK: {n} personalit{"y" if n == 1 else "ies"} '
          'clear WCAG AA + CIEDE2000.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
