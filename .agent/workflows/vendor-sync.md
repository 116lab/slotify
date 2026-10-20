---
description: Download and sync external CDN dependencies into a local vendor directory
---

This workflow helps you migrate a web project that relies on external CDN links into a secure, privacy-compliant "Zero External Dependencies" architecture by downloading all assets locally.

**CRITICAL CI/CD NOTE**: This skill (`vendor-sync`) is a MUTATOR and MUST ONLY be run locally by a developer to bump versions. It MUST NEVER be run in a CI pipeline. For CI checks, use the `vendor-verify` skill.

If the user runs `/slash-command vendor-sync`, follow these steps precisely:

## 0. Pre-computation Cognitive Boundary
**CRITICAL**: Before executing this workflow, you MUST read the central architecture standard to understand the Zero External Dependencies mandate:
`view_file` -> `.agent/skills/slotify-architecture-standards/SKILL.md`

## 1. Analyze and Establish Single Source of Truth
1. Scan the project's main HTML entry points (e.g., `index.html`) to find all external `<script src="https://...">` and `<link href="https://...">` tags.
2. Compile a list of all external dependencies.
3. Create a central `data/vendor.json` file to store these dependencies. This acts as the Single Source of Truth (SSOT).

## 2. Create the Architecture and Download Script
1. Create a `.agent/scripts/vendor_utils.py` to handle shared path and JSON loading logic.
2. Create a Python script named `.agent/scripts/download-vendor.py`.
3. This script MUST:
   - Read from `data/vendor.json` using the utility module.
   - Iterate through the dependencies and download them using Python's `urllib.request`.
   - Parse any downloaded CSS files for `@font-face` rules using `re` (Regex), download the actual font files (like `.woff2`), and rewrite the `url()` paths in the local CSS to point to the local font copies.
   - On success, record the SHA-256 of every file under `static/vendor/` into `data/vendor-lock.json` (the offline integrity anchor asserted by `verify-vendor.py`). On any download failure, abort with a non-zero exit and do NOT update the lockfile.
4. Auto-run the script to download all assets. (`python3 .agent/scripts/download-vendor.py`) (// turbo)

## 3. Rewrite Application Entry Points
1. Modify the HTML entry points identified in Step 1.
2. Utilize the template engine (e.g., Hugo's `range`) to dynamically render the `<script>` and `<link>` tags directly from `data/vendor.json`. Do not hardcode paths.

## 4. Finalize
1. Update project documentation to STRICTLY PROHIBIT manual edits inside the vendor directory.
2. Notify the user of successful sync.
