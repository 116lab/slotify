#!/usr/bin/env python3
"""
check-i18n-parity.py — PORTABLE UI-language parity check for a Slotify site.

For CONSUMING SITES. The theme's own locales are guarded at theme-commit time by
verify-i18n.py, but that guard cannot see a language YOU added via
`[[params.locales]]` + your own `static/js/i18n/<code>.json`. A half-translated
language isn't an error at runtime (missing keys fall back to the default
locale's string — the user just sees mixed languages), so nothing flags it. This
script lets you catch it with the SAME rule the theme enforces on itself: every
locale must define EXACTLY the same (nested) keys as the reference locale.

This file is SELF-CONTAINED (only Python stdlib) — copy it into your site and run
it; it has no dependency on the rest of the theme.

Usage:
    python3 check-i18n-parity.py [i18n_dir] [reference_code]

  i18n_dir         folder of <code>.json tables (default: static/js/i18n)
  reference_code   the locale every other must match (default: 'en' if present,
                   else the first file found, alphabetically)

Exit code 0 = all locales share the reference's key set; 1 = a mismatch (the
missing/extra dotted paths are listed per locale). Suitable for CI / pre-commit.
"""
import json
import os
import sys


def leaf_paths(obj, prefix=''):
    """Set of dotted paths to every leaf (non-object) value."""
    paths = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f'{prefix}.{k}' if prefix else k
            if isinstance(v, dict):
                paths |= leaf_paths(v, p)
            else:
                paths.add(p)
    return paths


def main(argv):
    i18n_dir = argv[1] if len(argv) > 1 else 'static/js/i18n'
    if not os.path.isdir(i18n_dir):
        print(f'[check-i18n-parity] not a directory: {i18n_dir}')
        return 1

    codes = sorted(f[:-5] for f in os.listdir(i18n_dir) if f.endswith('.json'))
    if not codes:
        print(f'[check-i18n-parity] no <code>.json files in {i18n_dir}')
        return 1

    # Reference: explicit arg → 'en' if present → first file.
    ref = argv[2] if len(argv) > 2 else ('en' if 'en' in codes else codes[0])
    if ref not in codes:
        print(f'[check-i18n-parity] reference locale {ref!r} has no {ref}.json in {i18n_dir}')
        return 1

    dicts = {}
    errs = []
    for c in codes:
        try:
            dicts[c] = leaf_paths(json.load(open(os.path.join(i18n_dir, f'{c}.json'), encoding='utf-8')))
        except Exception as e:
            errs.append(f'{c}.json does not parse: {e}')

    ref_keys = dicts.get(ref, set())
    for c in codes:
        if c == ref or c not in dicts:
            continue
        missing = sorted(ref_keys - dicts[c])
        extra = sorted(dicts[c] - ref_keys)
        if missing:
            errs.append(f'{c}.json is MISSING keys (present in {ref}.json): {missing}')
        if extra:
            errs.append(f'{c}.json has EXTRA keys (not in {ref}.json): {extra}')

    if errs:
        print('=' * 60)
        print(f'[ERROR] i18n parity violations in {i18n_dir} (reference: {ref}.json)')
        print('-' * 60)
        for e in errs:
            print(f'  {e}')
        print('=' * 60)
        return 1
    print(f'[check-i18n-parity] OK: {len(codes)} locale(s) share {ref}.json\'s key set.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
