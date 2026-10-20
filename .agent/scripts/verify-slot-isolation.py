#!/usr/bin/env python3
"""
verify-slot-isolation.py
Static guard for the Slotify Slots framework-isolation contract (SKILL.md §13).

A slot override is plain HTML + <script> authored from the site root. It MUST
react to ambient app state ONLY through the stable contract the theme exposes:
  - ctx  : { siteConfig, route, theme:{name,personality,mode}, t, ...local }
  - events: slotify:slot / slotify:theme / slotify:locale / slotify:route

Reaching past that contract into Vue/Vuetify/router INTERNALS (e.g. reading the
`v-theme--dark` class, calling useTheme(), touching VueRouter) couples the site
to an implementation detail and silently breaks if the framework changes. This
script fails the commit (exit 1) if any slot partial contains such a reference.

Scanned: every *.html under
  layouts/partials/slots/**            (theme defaults)
  exampleSite/layouts/partials/slots/**(demo overrides — the living reference)

NOT flagged: Vuetify `<v-...>` COMPONENT tags in the x-template markup are an
expected, supported way to build slot UI; the ban is on reading framework STATE
in the slot's JS. Comments (HTML <!-- -->, JS /* */ and // ...) are stripped
before scanning, so prose that merely NAMES a forbidden token is fine.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCAN_DIRS = [
    os.path.join(ROOT, 'layouts', 'partials', 'slots'),
    os.path.join(ROOT, 'exampleSite', 'layouts', 'partials', 'slots'),
]

# (regex, human reason). Each targets a framework INTERNAL, never the contract.
FORBIDDEN = [
    (r'v-theme--', "Vuetify mode class — use ctx.theme.mode / the slotify:theme event"),
    (r'\buseTheme\b', "Vuetify theme composable — use ctx.theme / slotify:theme"),
    (r'Vuetify\.', "Vuetify API — slots get state via ctx / slotify:* events"),
    (r'\bVueRouter\b', "router internals — use ctx.route / the slotify:route event"),
    (r'\buseRoute\b', "router internals — use ctx.route / the slotify:route event"),
    (r'\buseRouter\b', "router internals — use ctx.route / the slotify:route event"),
    (r'theme\.global', "Vuetify theme object — use ctx.theme / slotify:theme"),
    (r'__SLOTIFY_THEMES__', "raw palette global — use ctx.theme / slotify:theme"),
]
FORBIDDEN = [(re.compile(rx), why) for rx, why in FORBIDDEN]


def strip_comments(text):
    """Blank out comment text so prose naming a token doesn't false-positive.
    Order matters: HTML, then JS block, then JS line (but NOT protocol `://`,
    so URLs like https://giscus.app survive)."""
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    out = []
    for line in text.split('\n'):
        out.append(re.sub(r'(?<!:)//.*$', '', line))
    return '\n'.join(out)


def html_files():
    for base in SCAN_DIRS:
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, names in os.walk(base):
            for name in names:
                if name.endswith('.html'):
                    yield os.path.join(dirpath, name)


def main():
    print("Verifying slot framework-isolation (SKILL.md section 13)...")
    violations = []
    for path in sorted(html_files()):
        with open(path, 'r', encoding='utf-8') as fh:
            raw = fh.read()
        scanned = strip_comments(raw)
        # Report against ORIGINAL line numbers: scan the stripped text per line.
        for lineno, line in enumerate(scanned.split('\n'), start=1):
            for rx, why in FORBIDDEN:
                if rx.search(line):
                    rel = os.path.relpath(path, ROOT)
                    violations.append((rel, lineno, rx.pattern, why))

    if violations:
        print("\n[ERROR] Slot partials must consume the ctx / slotify:* contract,")
        print("        not Vue/Vuetify/router internals (SKILL.md section 13):\n")
        for rel, lineno, pat, why in violations:
            print(f"  {rel}:{lineno}  matches /{pat}/")
            print(f"      -> {why}")
        return 1

    n = sum(1 for _ in html_files())
    print(f"[check-slot-isolation] OK: {n} slot partial(s) free of framework internals.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
