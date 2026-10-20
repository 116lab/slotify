#!/usr/bin/env python3
"""
check-lifecycle.py
Static guard for the Slotify no-build (raw) Vue architecture (SKILL.md section 10).

In a raw async setup() there is NO SFC compiler / withAsyncContext transform, so
the active component instance context is lost after the first `await`. Any
lifecycle hook (onMounted / onUnmounted / watch / ...) registered AFTER an await
therefore silently never fires (the shipped vue.global.prod.js does not even warn).
This once disabled ALL of PostView's content hydration -> Mermaid never rendered.

This script fails (exit 1) when a lifecycle hook is registered, in the SYNCHRONOUS
execution scope of an `async setup()`, after the first `await` in that scope.

"Synchronous execution scope" means: anywhere inside the setup body at any block
nesting depth (try/catch/if/for/while/{} blocks all count), but NOT inside a
nested function literal (arrow function, function expression, or method body) —
code inside a callback runs later and is a different concern.

Heuristic but robust: strings/comments are blanked before structural analysis;
the scanner tracks brace nesting and skips nested function bodies so an `await`
or hook inside a `try {}` / `if () {}` block is correctly detected (the previous
depth-0-only version produced false negatives for exactly those shapes).
"""
import os
import re
import sys

HOOKS = (
    'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount',
    'onUpdated', 'onBeforeUpdate', 'onActivated', 'onDeactivated',
    'watch', 'watchEffect', 'watchPostEffect', 'watchSyncEffect',
)
HOOK_RE = re.compile(r'\b(' + '|'.join(HOOKS) + r')\s*\(')
AWAIT_RE = re.compile(r'\bawait\b')

# Match the start of an async setup body in its common forms and leave the
# regex end positioned just past the opening `{`:
#   async setup() { ...                       (method shorthand)
#   setup: async function (props) { ...        (function expression)
#   setup: async (props, ctx) => { ...         (arrow with parens)
#   setup: async props => { ...                (arrow without parens)
SETUP_RE = re.compile(
    r'\basync\s+setup\s*\([^)]*\)\s*\{'
    r'|\bsetup\s*:\s*async\s+function\s*\*?\s*\([^)]*\)\s*\{'
    r'|\bsetup\s*:\s*async\s*\([^)]*\)\s*=>\s*\{'
    r'|\bsetup\s*:\s*async\s+[\w$]+\s*=>\s*\{'
)

CONTROL_KW = {'if', 'for', 'while', 'switch', 'catch', 'with'}

JS_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'static', 'js',
)


def blank_noncode(src):
    """Replace string/template/comment CONTENT with spaces, preserving length and
    newlines, so brace/keyword scanning only sees real code."""
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
        # inside a non-code region
        if state == 'line':
            if c == '\n':
                state = 'code'  # keep the newline
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


def matching_brace(code, open_idx, limit):
    """Return the index of the `}` matching the `{` at open_idx (or limit-1)."""
    depth = 0
    j = open_idx
    while j < limit:
        if code[j] == '{':
            depth += 1
        elif code[j] == '}':
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return limit - 1


def _word_before(code, idx):
    """Read the identifier/keyword ending just before idx (skipping whitespace)."""
    j = idx
    while j >= 0 and code[j] in ' \t\r\n':
        j -= 1
    end = j + 1
    while j >= 0 and (code[j].isalnum() or code[j] in '_$'):
        j -= 1
    return code[j + 1:end], j + 1


def is_function_brace(code, brace_idx):
    """True if the `{` at brace_idx opens a function body (arrow / function /
    method) rather than a control block (try/if/for/...) or object literal we
    should descend into. Control blocks return False so their bodies stay in the
    synchronous setup scope."""
    j = brace_idx - 1
    while j >= 0 and code[j] in ' \t\r\n':
        j -= 1
    if j < 1:
        return False
    # Arrow function:  ... => {
    if code[j] == '>' and j >= 1 and code[j - 1] == '=':
        return True
    # Something like `<...>) {` : find the matching '(' and inspect the keyword
    # immediately before it.
    if code[j] == ')':
        depth = 0
        k = j
        while k >= 0:
            if code[k] == ')':
                depth += 1
            elif code[k] == '(':
                depth -= 1
                if depth == 0:
                    break
            k -= 1
        word, word_start = _word_before(code, k - 1)
        if word in CONTROL_KW:
            return False  # if (...) {, for (...) {, catch (...) {, ...
        prevword, _ = _word_before(code, word_start - 1)
        if word == 'function' or prevword == 'function':
            return True  # function () {} or function name() {}
        if word:
            return True  # name() {  -> method / function definition
        return False
    return False


def first_await_and_hooks(code, start, end):
    """Scan the setup body [start, end). Return (first_await_idx, [(hook, idx)])
    where positions inside nested function literals are skipped."""
    first_await = None
    hooks = []
    i = start
    while i < end:
        c = code[i]
        if c == '{':
            if is_function_brace(code, i):
                i = matching_brace(code, i, end) + 1
                continue
            i += 1
            continue
        if c == '}':
            i += 1
            continue
        am = AWAIT_RE.match(code, i)
        if am:
            if first_await is None:
                first_await = i
            i = am.end()
            continue
        hm = HOOK_RE.match(code, i)
        if hm:
            hooks.append((hm.group(1), i))
            i = hm.end()
            continue
        i += 1
    return first_await, hooks


def setup_bodies(code):
    """Yield (body_start_index, body_end_index) for each async setup() body."""
    for m in SETUP_RE.finditer(code):
        brace = m.end() - 1  # the opening '{'
        end = matching_brace(code, brace, len(code))
        yield brace + 1, end


def lineno(src, idx):
    return src.count('\n', 0, idx) + 1


def check_file(path):
    raw = open(path, encoding='utf-8').read()
    code = blank_noncode(raw)
    violations = []
    for start, end in setup_bodies(code):
        first_await, hooks = first_await_and_hooks(code, start, end)
        if first_await is None:
            continue
        for hook, idx in hooks:
            if idx > first_await:
                violations.append((hook, lineno(raw, idx)))
    return violations


def main():
    if not os.path.isdir(JS_ROOT):
        print(f"[check-lifecycle] JS root not found: {JS_ROOT}")
        return 0
    failures = []
    for dirpath, _, files in os.walk(JS_ROOT):
        for f in files:
            if not f.endswith('.js'):
                continue
            path = os.path.join(dirpath, f)
            for hook, ln in check_file(path):
                rel = os.path.relpath(path, os.path.dirname(JS_ROOT))
                failures.append(f"  {rel}:{ln}  {hook}() registered after `await` in async setup()")
    if failures:
        print("=" * 60)
        print("[ERROR] Raw-Vue lifecycle ordering violation (SKILL.md section 10)")
        print("Lifecycle hooks MUST be registered BEFORE any `await` in async")
        print("setup() -- otherwise they silently never fire (no-build Vue loses")
        print("the component instance context across an await).")
        print("-" * 60)
        print("\n".join(failures))
        print("=" * 60)
        return 1
    print("[check-lifecycle] OK: no lifecycle hooks registered after await.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
