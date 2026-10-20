---
description: Verify local vendor dependencies offline against the pinned lockfile for CI/CD pipelines
---

This workflow MANDATORILY implements an assertion step to verify that every local vendor file matches the SHA-256 pinned in `data/vendor-lock.json`. The check is **fully offline** (no CDN access), so it is deterministic and air-gapped-safe. This is a non-negotiable requirement for CI/CD pipelines.

**CRITICAL CI/CD NOTE**: This skill (`vendor-verify`) is an ASSERTION and is safe to run anywhere. It does not overwrite files and never contacts the network.

If the user runs `/slash-command vendor-verify`, follow these steps precisely:

## 0. Pre-computation Cognitive Boundary
**CRITICAL**: Before executing this workflow, you MUST read the central architecture standard:
`view_file` -> `.agent/skills/slotify-architecture-standards/SKILL.md`

## 1. Verification Script and Git Protections
1. The verification script lives at `.agent/scripts/verify-vendor.py`.
2. This script MUST (current behavior — do not regress it):
   - Load the pinned hashes from `data/vendor-lock.json` via `.agent/scripts/vendor_utils.py` (fail if the lockfile is missing).
   - Hash **every** file under `static/vendor/` (not only entries listed in `data/vendor.json`) with SHA-256, fully offline — NO network access.
   - Report `[FAIL]` for any modified, missing, or untracked file, and `[ OK ]` per matching file.
   - Exit with code `1` (`sys.exit(1)`) if any discrepancy is found.
   - To (re)generate the lockfile, the user edits `data/vendor.json` and runs `python3 .agent/scripts/download-vendor.py`.
3. Auto-run the script. (`python3 .agent/scripts/verify-vendor.py`) (// turbo)
4. Create or append to a `.gitattributes` file to lock line endings and prevent false-positives across OS environments:
   ```text
   static/vendor/** -text
   ```

## 2. CI/CD Integration
1. If requested by the user, integrate `python3 .agent/scripts/verify-vendor.py` into the project's CI/CD configurations (e.g., GitHub Actions).
2. Notify the user of successful verification and pipeline integrity.
