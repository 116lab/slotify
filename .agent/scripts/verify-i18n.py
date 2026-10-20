#!/usr/bin/env python3
"""
verify-i18n.py
Static guard for the UI-language tables (SKILL.md section 12).

The UI strings live in per-locale JSON files (static/js/i18n/<code>.json). The
locale registry — which languages exist + their order — is OWNED BY DATA in
`data/locales.json` (Hugo injects it as `window.__SLOTIFY_LOCALES__`, the same
inject-and-consume pipeline as the palette); `static/js/i18n.js` is a CONSUMER.
The FIRST entry is the default/fallback + key-parity reference (mirrors the
palette's first key — no `default: true` flag). This script fails (exit 1) when
the theme's OWN language tables are incomplete or inconsistent — so a missing key
can never reach production and silently fall back to the default locale.

Scope: like verify-theme.py, this guards the THEME's shipped locales only. A
consuming site that adds a language via `[[params.locales]]` owns its own table's
completeness; it can self-check with the portable `check-i18n-parity.py`.

Checks:
  1. REGISTRY <-> FILES - every code in data/locales.json has a matching <code>.json,
     and every <code>.json has a registry entry (no orphan files, no dangling
     codes that would 404 at loadLocales()).
  2. CONSUMER INTEGRITY - i18n.js consumes `window.__SLOTIFY_LOCALES__` (the injected
     SSOT) rather than hardcoding the registry, so the locale set can't silently
     diverge from data/locales.json.
  3. KEY PARITY - every locale defines EXACTLY the same set of (nested) keys as the
     first (reference) locale. Missing or extra keys fail, with the offending
     dotted paths listed per locale.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
I18N_DIR = os.path.join(ROOT, 'static', 'js', 'i18n')
I18N_JS = os.path.join(ROOT, 'static', 'js', 'i18n.js')
LOCALES_JSON = os.path.join(ROOT, 'data', 'locales.json')


def registry_codes():
    """Read the locale codes from data/locales.json, in declared order."""
    try:
        data = json.load(open(LOCALES_JSON, encoding='utf-8'))
    except Exception:
        return None
    codes = []
    for entry in data if isinstance(data, list) else []:
        code = (entry or {}).get('code') if isinstance(entry, dict) else None
        if code:
            codes.append(code)
    return codes or None


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


def main():
    errs = []
    codes = registry_codes()
    if not codes:
        print('[check-i18n] ERROR: could not read the locale set from data/locales.json '
              '(expected a non-empty ordered list of { "code", "label" }).')
        return 1

    files = {f[:-5] for f in os.listdir(I18N_DIR) if f.endswith('.json')} \
        if os.path.isdir(I18N_DIR) else set()

    # 1. Registry <-> files consistency
    for c in codes:
        if c not in files:
            errs.append(f"data/locales.json has '{c}' but static/js/i18n/{c}.json is missing")
    for f in sorted(files - set(codes)):
        errs.append(f"static/js/i18n/{f}.json has no matching entry in data/locales.json")

    # 2. Consumer integrity: i18n.js must consume the injected SSOT, not hardcode it.
    try:
        js = open(I18N_JS, encoding='utf-8').read()
        if '__SLOTIFY_LOCALES__' not in js:
            errs.append('static/js/i18n.js must consume window.__SLOTIFY_LOCALES__ '
                        '(the injected locale SSOT from data/locales.json), not a hardcoded list')
    except Exception as e:
        errs.append(f'cannot read static/js/i18n.js: {e}')

    # The first declared locale is the default/fallback + key-parity reference.
    ref = codes[0]

    # 3. Key parity vs the default (reference) locale
    dicts = {}
    for c in codes:
        path = os.path.join(I18N_DIR, f'{c}.json')
        if not os.path.exists(path):
            continue
        try:
            dicts[c] = leaf_paths(json.load(open(path, encoding='utf-8')))
        except Exception as e:
            errs.append(f'static/js/i18n/{c}.json does not parse: {e}')

    if ref in dicts:
        ref_keys = dicts[ref]
        for c in codes:
            if c == ref or c not in dicts:
                continue
            missing = sorted(ref_keys - dicts[c])
            extra = sorted(dicts[c] - ref_keys)
            if missing:
                errs.append(f"{c}.json is MISSING keys (present in {ref}.json): {missing}")
            if extra:
                errs.append(f"{c}.json has EXTRA keys (not in {ref}.json): {extra}")

    if errs:
        print('=' * 60)
        print('[ERROR] UI-language table violation (SKILL.md section 12)')
        print('Every locale MUST define the same keys as the reference locale, and')
        print('the LOCALES registry MUST match the <code>.json files exactly.')
        print('-' * 60)
        for e in errs:
            print(f'  {e}')
        print('=' * 60)
        return 1
    print(f'[check-i18n] OK: {len(codes)} locale(s) share an identical key set.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
