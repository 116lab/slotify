#!/usr/bin/env python3
"""
verify-slot-ctx.py
Static guard for the slot `ctx` contract (SKILL.md §13, utils/slotCtx.js).

`ctx` is the ambient object every slot receives (and that rides on slotify:slot
event detail). Its reserved/ambient half — siteConfig, route, theme, t — is owned
by the theme and assembled in ONE place (buildSlotCtx). Two implicit risks are
gated here:

  CHECK 1 (R1 — no shadowing): a <slotify-slot :ctx="{ … }"> mount MUST NOT pass a
    reserved key. Because buildSlotCtx merges local ctx UNDER the reserved keys,
    a colliding local key is silently dropped — so it is almost certainly a bug.
    (Equally, before the reserved-last fix it would have CLOBBERED the ambient
    value.) Scanned across static/js/**.

  CHECK 2 (R4 — SSOT intact): utils/slotCtx.js must declare RESERVED_CTX_KEYS with
    exactly the four ambient keys and export buildSlotCtx, and components/Slot.js
    must assemble ctx THROUGH buildSlotCtx (not a hand-rolled object literal). This
    pins the ambient set and keeps assembly centralized.

Exit 1 on any violation. Vuetify <v-…> components and local keys (pageData,
pageIdentifier, …) are fine; only reserved-key collisions and SSOT drift fail.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JS_DIR = os.path.join(ROOT, 'static', 'js')
SLOTCTX = os.path.join(JS_DIR, 'utils', 'slotCtx.js')
SLOT_COMPONENT = os.path.join(JS_DIR, 'components', 'Slot.js')

# The reserved ambient keys. MUST match RESERVED_CTX_KEYS in utils/slotCtx.js
# (Check 2 asserts that file declares the same set, keeping this in lockstep).
RESERVED = ['siteConfig', 'route', 'theme', 't']

# Match :ctx="{ ... }" — the attribute value is double-quoted, so the object
# literal inside never contains a double quote: [^"]* is a safe, exact capture.
CTX_MOUNT = re.compile(r':ctx="(\{[^"]*\})"')


def top_level_keys(obj_literal):
    """Top-level keys of a flat JS object literal string `{ a, b: c(x,y), ... }`.
    Depth-aware over (){}[] so a value like `f(a, b)` doesn't split as two keys."""
    body = obj_literal.strip()[1:-1]  # drop outer { }
    keys, depth, token = [], 0, ''
    for ch in body:
        if ch in '({[':
            depth += 1
        elif ch in ')}]':
            depth -= 1
        if ch == ',' and depth == 0:
            keys.append(token)
            token = ''
        else:
            token += ch
    keys.append(token)
    out = []
    for part in keys:
        part = part.strip()
        if not part:
            continue
        # shorthand `name` or `name: value` or `name:value` -> the name before ':'
        name = part.split(':', 1)[0].strip()
        if name:
            out.append(name)
    return out


def js_files():
    for dirpath, _dirs, names in os.walk(JS_DIR):
        for name in names:
            if name.endswith('.js'):
                yield os.path.join(dirpath, name)


def check_mounts():
    violations = []
    for path in sorted(js_files()):
        with open(path, 'r', encoding='utf-8') as fh:
            for lineno, line in enumerate(fh, start=1):
                for m in CTX_MOUNT.finditer(line):
                    for key in top_level_keys(m.group(1)):
                        if key in RESERVED:
                            rel = os.path.relpath(path, ROOT)
                            violations.append((rel, lineno, key))
    return violations


def check_ssot():
    errors = []
    try:
        with open(SLOTCTX, 'r', encoding='utf-8') as fh:
            src = fh.read()
    except OSError:
        return [f"missing SSOT module: {os.path.relpath(SLOTCTX, ROOT)}"]

    if 'export function buildSlotCtx' not in src and 'buildSlotCtx =' not in src:
        errors.append("utils/slotCtx.js must export buildSlotCtx")

    m = re.search(r'RESERVED_CTX_KEYS\s*=\s*\[([^\]]*)\]', src)
    if not m:
        errors.append("utils/slotCtx.js must declare RESERVED_CTX_KEYS = [...]")
    else:
        declared = set(re.findall(r"['\"]([A-Za-z_$][\w$]*)['\"]", m.group(1)))
        if declared != set(RESERVED):
            errors.append(
                f"RESERVED_CTX_KEYS {sorted(declared)} != expected {sorted(RESERVED)} "
                f"(keep this gate's RESERVED list in sync)"
            )

    try:
        with open(SLOT_COMPONENT, 'r', encoding='utf-8') as fh:
            slot_src = fh.read()
    except OSError:
        return errors + [f"missing {os.path.relpath(SLOT_COMPONENT, ROOT)}"]
    if 'buildSlotCtx(' not in slot_src:
        errors.append("components/Slot.js must assemble ctx via buildSlotCtx (the SSOT)")
    return errors


def main():
    print("Verifying slot ctx contract (SKILL.md section 13)...")
    failed = False

    mounts = check_mounts()
    if mounts:
        failed = True
        print("\n[ERROR] A <slotify-slot :ctx> mount passes a RESERVED ambient key")
        print("        (owned by the theme; local ctx is merged UNDER it and dropped):\n")
        for rel, lineno, key in mounts:
            print(f"  {rel}:{lineno}  reserved key '{key}' in :ctx")

    ssot = check_ssot()
    if ssot:
        failed = True
        print("\n[ERROR] ctx SSOT drift (utils/slotCtx.js / components/Slot.js):\n")
        for msg in ssot:
            print(f"  {msg}")

    if failed:
        return 1
    print(f"[check-slot-ctx] OK: reserved keys {RESERVED} are exclusive and centralized.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
