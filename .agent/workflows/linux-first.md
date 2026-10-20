---
description: Audit and enforce Linux-first (LF) line endings across the repository
---

This workflow MANDATORILY enforces the "Linux-First" line ending standard to prevent cross-platform script and CI/CD failures.

If the user runs `/slash-command enforce-linux-standards`, follow these steps:

## 0. Pre-computation Cognitive Boundary
**CRITICAL**: Before executing this workflow, you MUST read the central architecture standard:
`view_file` -> `.agent/skills/slotify-architecture-standards/SKILL.md`

## 1. Audit Current Status
1. Run `python3 .agent/scripts/enforce-lf.py`.
2. This script recursively scans the project (excluding `static/vendor` and `.git`) and reports any files natively using Windows `CRLF` carriage returns.

## 2. Normalize Files to LF
1. If the audit fails (finds CRLF files), auto-run the fix command: `python3 .agent/scripts/enforce-lf.py --fix`. (// turbo)
2. This rewrites the files at a binary level to use strictly `\n`.
3. To flush git's internal index cache and reflect real working tree statuses, run `git add --renormalize .`.

## 3. Verify `.gitattributes`
1. Use `view_file` to verify `.gitattributes` exists and prominently features `* text eol=lf`.
2. Notify the user that the Linux line-ending standard has been permanently established.
