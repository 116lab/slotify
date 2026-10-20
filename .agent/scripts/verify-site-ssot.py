#!/usr/bin/env python3
"""
verify-site-ssot.py
Guards the build-time-injection boundary for site config (SKILL.md §13).

Slotify's ambient SSOTs (palette, slots, taxonomies, base) are all BUILT by Hugo
and INJECTED as `window.__SLOTIFY_*__`, then consumed synchronously by the SPA.
Site config (title/social/menu/…) is the same kind of build-time data, so it MUST
travel the same inject-and-consume path — NEVER a runtime fetch. (A runtime fetch
left ctx.siteConfig empty on a direct deep-link; this gate stops that regressing.)

Fails the commit (exit 1) unless:
  1. partials/func/site-config.html exists (the single source that BUILDS config).
  2. baseof.html injects window.__SLOTIFY_SITE__ FROM that partial.
  3. home.json builds its `config` FROM that same partial (DRY — no second copy).
  4. main.js CONSUMES window.__SLOTIFY_SITE__.
  5. site config is NOT fetched at runtime: no fetchSiteData in services/api.js or
     anywhere under static/js (the negative half of the boundary).
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PARTIAL = os.path.join(ROOT, 'layouts', 'partials', 'func', 'site-config.html')
BASEOF = os.path.join(ROOT, 'layouts', '_default', 'baseof.html')
HOME_JSON = os.path.join(ROOT, 'layouts', 'home.json')
MAIN_JS = os.path.join(ROOT, 'static', 'js', 'main.js')
API_JS = os.path.join(ROOT, 'static', 'js', 'services', 'api.js')
JS_DIR = os.path.join(ROOT, 'static', 'js')

PARTIAL_CALL = re.compile(r'partial\s+"func/site-config\.html"')


def read(path):
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            return fh.read()
    except OSError:
        return None


def main():
    print("Verifying build-time site-config SSOT (SKILL.md section 13)...")
    errors = []

    if read(PARTIAL) is None:
        errors.append("missing SSOT partial: layouts/partials/func/site-config.html")

    baseof = read(BASEOF)
    if baseof is None:
        errors.append("missing layouts/_default/baseof.html")
    else:
        if 'window.__SLOTIFY_SITE__' not in baseof:
            errors.append("baseof.html must inject window.__SLOTIFY_SITE__")
        elif not PARTIAL_CALL.search(baseof):
            errors.append("baseof.html must build __SLOTIFY_SITE__ via partial \"func/site-config.html\"")

    home = read(HOME_JSON)
    if home is None:
        errors.append("missing layouts/home.json")
    elif not PARTIAL_CALL.search(home):
        errors.append("home.json must build `config` via partial \"func/site-config.html\" (DRY — do not inline it)")

    main_js = read(MAIN_JS)
    if main_js is None:
        errors.append("missing static/js/main.js")
    elif 'window.__SLOTIFY_SITE__' not in main_js and '__SLOTIFY_SITE__' not in main_js:
        errors.append("main.js must consume window.__SLOTIFY_SITE__ (synchronous siteConfig)")

    # Negative half: site config must not be fetched at runtime.
    api = read(API_JS)
    if api and 'fetchSiteData' in api:
        errors.append("services/api.js must NOT expose fetchSiteData — site config is injected, not fetched")
    for dirpath, _dirs, names in os.walk(JS_DIR):
        for name in names:
            if not name.endswith('.js'):
                continue
            p = os.path.join(dirpath, name)
            if p == API_JS:
                continue
            src = read(p) or ''
            # ignore matches inside comments is overkill here; fetchSiteData is a
            # removed symbol, so ANY occurrence (even a comment) is stale and worth flagging.
            if 'fetchSiteData' in src:
                errors.append(f"{os.path.relpath(p, ROOT)} references removed fetchSiteData (site config is injected)")

    if errors:
        print("\n[ERROR] Site-config SSOT / build-time boundary violated:\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("[check-site-ssot] OK: site config is built once and injected (__SLOTIFY_SITE__), never fetched.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
