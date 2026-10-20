#!/usr/bin/env python3
"""
check-indent.py
Static guard for the mandated 2-space indentation in the Slotify no-build Vue
architecture (SKILL.md section 3, "Formatting").

SKILL.md mandates a strict 2-space indent for every `.js` file (and the HTML
templates embedded in them) under static/js/. There is no build step / linter
in the loop, so without an enforcement gate the standard silently drifts: new
files were written at 2 spaces while older files kept a 4-space unit. This
script fails (exit 1) when a file violates the 2-space rule.

It reports three violation classes on real CODE lines (string/template/comment
content is blanked first, exactly like check-lifecycle.py, so HTML inside a
template literal and prose inside a JSDoc block never produce false positives):

  * TAB indentation     - any leading tab is forbidden (LF + spaces only).
  * Odd indentation     - a code line whose leading-space count is not even.
  * 4-space unit (file) - a file is flagged when it has indented code but NOT a
                          single code line at an indent ≡ 2 (mod 4). A genuine
                          2-space file always has level-1 bodies at 2 (and
                          level-3 at 6); a 4-space file's indents are all ≡ 0
                          (mod 4), so the absence of any ≡ 2 line is a reliable
                          tell. (An even-only file with a 4-space step passes the
                          per-line check but fails here.)

Heuristic but robust: leading whitespace of blanked code is genuine code
indentation; lines living entirely inside a multi-line template literal or block
comment collapse to blanks and are skipped, and a line whose first non-space char
is a backtick (a template-literal delimiter, e.g. the closing `,) is skipped so
its template-aligned indent never masks a 4-space code body.
"""
import os
import sys

JS_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'static', 'js',
)


def blank_noncode(src):
    """Replace string/template/comment CONTENT with spaces, preserving length
    and newlines, so only real code remains for indentation analysis. (Same
    technique as check-lifecycle.py.)"""
    out = list(src)
    i, n = 0, len(src)
    state = 'code'  # code | line | block | sq | dq | tpl
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ''
        if state == 'code':
            if c == '/' and nxt == '/':
                state = 'line'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue
            if c == '/' and nxt == '*':
                state = 'block'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue
            if c == "'":
                state = 'sq'
            elif c == '"':
                state = 'dq'
            elif c == '`':
                state = 'tpl'
            i += 1; continue
        if state == 'line':
            if c == '\n':
                state = 'code'
            else:
                out[i] = ' '
            i += 1; continue
        if state == 'block':
            if c == '*' and nxt == '/':
                out[i] = ' '; out[i + 1] = ' '; state = 'code'; i += 2; continue
            if c != '\n':
                out[i] = ' '
            i += 1; continue
        # string / template literal
        if c == '\\':
            out[i] = ' '
            if i + 1 < n and src[i + 1] != '\n':
                out[i + 1] = ' '
            i += 2; continue
        closer = {'sq': "'", 'dq': '"', 'tpl': '`'}[state]
        if c == closer:
            state = 'code'; i += 1; continue
        if c != '\n':
            out[i] = ' '
        i += 1
    return ''.join(out)


def check_file(path):
    raw = open(path, encoding='utf-8').read()
    code = blank_noncode(raw)
    violations = []
    indents = []
    for ln, line in enumerate(code.split('\n'), start=1):
        stripped = line.lstrip(' ')
        if stripped == '':
            continue  # blank line, or a line that was wholly string/comment
        if stripped[0] == '`':
            continue  # template-literal delimiter (e.g. closing `,) — not code indent
        lead = line[:len(line) - len(stripped)]
        if lead != ' ' * len(lead):
            violations.append((ln, 'tab in indentation'))
            continue
        n = len(lead)
        if n % 2 != 0:
            violations.append((ln, f'{n}-space indent (not even)'))
        elif n > 0:
            indents.append(n)
    # File-level 4-space-unit tell: indented code with no line at indent ≡ 2 (mod 4).
    if indents and not any(n % 4 == 2 for n in indents):
        violations.append((None, '4-space indentation unit (use 2 spaces)'))
    return violations


def main():
    if not os.path.isdir(JS_ROOT):
        print(f"[check-indent] JS root not found: {JS_ROOT}")
        return 0
    failures = []
    for dirpath, _, files in os.walk(JS_ROOT):
        for f in sorted(files):
            if not f.endswith('.js'):
                continue
            path = os.path.join(dirpath, f)
            for ln, why in check_file(path):
                rel = os.path.relpath(path, os.path.dirname(JS_ROOT))
                where = f"{rel}:{ln}" if ln is not None else rel
                failures.append(f"  {where}  {why}")
    if failures:
        print("=" * 60)
        print("[ERROR] Indentation violation (SKILL.md section 3, Formatting)")
        print("Every .js file under static/js/ MUST use strict 2-space indentation")
        print("(no tabs, no 4-space unit). Reflow the offending lines to 2 spaces.")
        print("-" * 60)
        print("\n".join(failures))
        print("=" * 60)
        return 1
    print("[check-indent] OK: all static/js/*.js files use 2-space indentation.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
