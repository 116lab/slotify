---
description: Perform a comprehensive codebase audit to ensure SSOT and architectural integrity
---

This workflow performs a strict architectural audit on the project to ensure that the "Single Source of Truth" (SSOT) and proper script separation principles are not violated. 

If the user runs `/slash-command audit-codebase`, follow these steps:

## 0. Pre-computation Cognitive Boundary
**CRITICAL**: Before executing this workflow, you MUST read the central architecture standard:
`view_file` -> `.agent/skills/slotify-architecture-standards/SKILL.md`

## 1. Audit Single Source of Truth (SSOT)
1. Use the `grep_search` tool on the HTML templates (especially `layouts/index.html`) to search for hardcoded `http://` or `https://` script/style URLs related to core dependencies.
2. If any hardcoded CDN URLs (e.g., `unpkg.com`, `jsdelivr.net`, `fonts.googleapis.com`) are found inside HTML templates instead of being dynamically generated via standard data loops (e.g., `range .Site.Data.vendor`), report this as an **SSOT Violation**.

## 2. Audit Vendor Directory Immutability
1. Execute `python3 .agent/scripts/verify-vendor.py` (or equivalent verification script) to ensure that the local `static/vendor/` directory has not been manually altered by developers.
2. If the command returns a failure, report this as an **Immutability Violation**.

## 3. Audit Git Protections
1. Use `view_file` to read `.gitattributes`.
2. Ensure that the vendor directory is protected against CRLF line-ending mutations (e.g., `static/vendor/** -text`).
3. If this rule is missing, report a **Git Integrity Violation**.

## 4. Audit Visual & Logic Harmony
1. **Geometric Consistency**: Search all CSS and JavaScript files for hardcoded `border-radius` values (other than `50%` or `0`). Report any values that do not use the `--radius-*` variable system as a **Geometric Violation**.
2. **Component Purity**: Inspect View components (e.g., `PostView.js`) for direct DOM manipulation inside `watch` or `mounted` hooks. If logic related to content hydration (e.g., Lightboxes, image wrapping) is found within the View instead of using a Composable (e.g., `useContentHydration`), report as an **Architectural Smell**.
3. **Surface Uniformity**: Verify that list-style components (like the `list` variant of `PostCard`) utilize `BaseSurface` and provide appropriate `:hover-lift` feedback.
4. **Raw-Vue Lifecycle Ordering**: Execute `python3 .agent/scripts/check-lifecycle.py`. If it reports any lifecycle hook (`onMounted`/`onUnmounted`/`watch`/...) registered after an `await` in an `async setup()`, report a **Lifecycle Ordering Violation** (SKILL §10) — in no-build Vue such hooks silently never fire.
5. **Indentation Discipline**: Execute `python3 .agent/scripts/check-indent.py`. If it reports any `.js` file under `static/js/` using a tab or a non-2-space indent, report a **Formatting Violation** (SKILL §3).
6. **Color/Palette SSOT**: Execute `python3 .agent/scripts/verify-theme.py`. If it reports a malformed palette, hardcoded hex in `layouts/index.html`, a `config/themes.js` that no longer consumes `window.__SLOTIFY_THEMES__`, or a `useTheme.js` `PERSONALITY_META` that drifts from the palette personalities, report a **Palette SSOT Violation** (SKILL §11). The theme palette MUST live only in `data/theme-palette.json`.
7. **UI-language Key Parity**: Execute `python3 .agent/scripts/verify-i18n.py`. If it reports a locale JSON with missing/extra keys, or a `LOCALES` registry that doesn't match the `static/js/i18n/<code>.json` files, report an **i18n Parity Violation** (SKILL §12).
8. **Slotify Slots Integrity**: Execute `python3 .agent/scripts/verify-hooks.py`. If it reports any drift between `data/slots.json`, the `layouts/partials/slots/**` partials, the `<slotify-slot name="…">` mounts in `static/js`, and the `__SLOTIFY_SLOTS__` injection (or a `header` entry wrongly placed in the manifest), report a **Slots Integrity Violation** (SKILL §13).

## 5. Report & Resolve
1. If any violations are found, the agent MUST use `task_boundary` to automatically plan and execute the necessary refactoring to fix them.
2. If no violations are found, the agent SHALL notify the user that the project "Passes the Premium Architecture & Visual Harmony Audit".

