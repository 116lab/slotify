#!/usr/bin/env python3
"""
verify-hooks.py
Static guard for the Slotify Slots extension system (SKILL.md section 13).

A "slot" is a path-addressed, overridable mount point:
  layouts/partials/slots/<view>/<position>.html   (the dummy/default + override)
  -> id/namespace  Slotify.slots.<view>.<position>
  -> component     slot-<view>-<position>  (bound to #slot-<view>-<position>-template)
  -> mounted in JS via <slotify-slot name="<view>/<position>" ...>

The directory tree is the human SSOT; data/slots.json is the machine-readable
manifest Hugo ranges to inject the x-templates (os.ReadDir cannot enumerate the
theme's partials from a consuming site, so a manifest + this gate keep the two in
lockstep). This script fails (exit 1) on any drift between the four facets:

  1. MANIFEST     - data/slots.json parses and is a non-empty map.
  2. PARTIALS     - every manifest key has layouts/partials/slots/<key>.html, and
                    that file declares id="slot-<dashed>-template".
  3. MOUNTS       - every manifest key is mounted by exactly-matching
                    <slotify-slot name="<key>"> in static/js, and every such mount
                    refers to a manifest key (no dead slots, no unregistered mounts).
  4. WIRING       - layouts/_default/baseof.html (the SPA shell every page extends)
                    injects window.__SLOTIFY_SLOTS__ from the "slots" data file and
                    ranges the manifest to include partials.

The raw <head> slot (layouts/partials/slots/head.html, ex head-custom.html) is a
TYPE-1 slot: it is NOT a Vue component and MUST NOT appear in the manifest; it is
checked separately (exists + referenced in baseof.html <head>). Note: "head" = the
document <head>, NOT the visual page-header bar (the AppHeader component).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFEST = os.path.join(ROOT, 'data', 'slots.json')
SLOTS_DIR = os.path.join(ROOT, 'layouts', 'partials', 'slots')
# The SPA shell that injects the slot manifest and ranges the partials lives in
# the base template every HTML page extends, not in the home template.
SHELL_HTML = os.path.join(ROOT, 'layouts', '_default', 'baseof.html')
JS_DIR = os.path.join(ROOT, 'static', 'js')
HEAD_PARTIAL = os.path.join(SLOTS_DIR, 'head.html')

# <slotify-slot ... name="view/position" ...> — static names only (skip :name).
MOUNT_RE = re.compile(r'<slotify-slot\b[^>]*?(?<![:\w])name=["\']([^"\']+)["\']')


def fail(errs, msg):
    errs.append(msg)


def load_manifest(errs):
    try:
        with open(MANIFEST, encoding='utf-8') as f:
            manifest = json.load(f)
    except Exception as e:
        fail(errs, f'data/slots.json does not parse: {e}')
        return None
    if not isinstance(manifest, dict) or not manifest:
        fail(errs, 'data/slots.json must be a non-empty object keyed by "<view>/<position>"')
        return None
    if 'head' in manifest:
        fail(errs, 'slots/head.html is a raw <head> slot and MUST NOT be listed in '
                   'data/slots.json (it is not a Vue component)')
    return manifest


def check_partials(errs, manifest):
    for key in manifest:
        path = os.path.join(SLOTS_DIR, *key.split('/')) + '.html'
        if not os.path.isfile(path):
            fail(errs, f'manifest key {key!r} has no partial: '
                       f'layouts/partials/slots/{key}.html')
            continue
        dashed = key.replace('/', '-')
        expected = f'id="slot-{dashed}-template"'
        text = open(path, encoding='utf-8').read()
        if expected not in text:
            fail(errs, f'slots/{key}.html must declare an x-template with {expected}')


def collect_mounts():
    used = set()
    for dp, _, files in os.walk(JS_DIR):
        for f in files:
            if not f.endswith('.js'):
                continue
            text = open(os.path.join(dp, f), encoding='utf-8').read()
            used.update(MOUNT_RE.findall(text))
    return used


def check_mounts(errs, manifest):
    used = collect_mounts()
    keys = set(manifest.keys())
    for key in sorted(keys - used):
        fail(errs, f'manifest slot {key!r} is never mounted '
                   f'(<slotify-slot name="{key}"> not found in static/js)')
    for name in sorted(used - keys):
        fail(errs, f'<slotify-slot name="{name}"> is mounted but {name!r} is not in '
                   f'data/slots.json (add the manifest entry + partial)')


def check_wiring(errs):
    try:
        src = open(SHELL_HTML, encoding='utf-8').read()
    except Exception as e:
        fail(errs, f'cannot read layouts/_default/baseof.html: {e}')
        return
    if '__SLOTIFY_SLOTS__' not in src or '"slots"' not in src:
        fail(errs, 'layouts/_default/baseof.html must inject window.__SLOTIFY_SLOTS__ from the '
                   '"slots" data file')
    if 'slots/%s.html' not in src:
        fail(errs, 'layouts/_default/baseof.html must range the manifest to include each slot '
                   'partial (printf "slots/%s.html" ...)')


def check_head(errs):
    if not os.path.isfile(HEAD_PARTIAL):
        fail(errs, 'layouts/partials/slots/head.html (raw <head> slot) is missing')
        return
    try:
        src = open(SHELL_HTML, encoding='utf-8').read()
    except Exception:
        return
    if 'slots/head.html' not in src:
        fail(errs, 'layouts/_default/baseof.html must inject the <head> slot '
                   '(partial "slots/head.html")')


def main():
    errs = []
    manifest = load_manifest(errs)
    if manifest:
        check_partials(errs, manifest)
        check_mounts(errs, manifest)
    check_wiring(errs)
    check_head(errs)
    if errs:
        print('=' * 60)
        print('[ERROR] Slotify Slots integrity violation (SKILL.md section 13)')
        print('The slot directory, manifest, mounts, and injection must stay 1:1.')
        print('-' * 60)
        for e in errs:
            print(f'  {e}')
        print('=' * 60)
        return 1
    print(f'[check-hooks] OK: {len(manifest)} slot(s) consistent '
          '(manifest <-> partials <-> mounts <-> injection).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
