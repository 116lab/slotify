#!/usr/bin/env python3
"""
verify-vendor.py
Offline integrity assertion for the local vendor directory.

Compares the sha256 of EVERY file under static/vendor/ against the pinned
hashes in data/vendor-lock.json. This is fully offline: it never contacts a
CDN, so it works in air-gapped environments, never produces false failures
from upstream churn or network hiccups, and detects tampering against the
exact bytes that were vetted at download time (trust-on-first-download, then
pin) rather than against "whatever the CDN serves today".

To (re)generate the lockfile, run download-vendor.py.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from vendor_utils import VENDOR_DIR, iter_vendor_files, sha256_path, load_lock

def main():
    print("Verifying vendor files against the pinned lockfile (offline)...")

    lock = load_lock()
    if not lock:
        print("[FAIL] Missing data/vendor-lock.json. Run download-vendor.py to generate it.")
        sys.exit(1)

    present = set(iter_vendor_files())
    locked = set(lock.keys())
    success = True

    # Files that should exist but don't.
    for rel in sorted(locked - present):
        print(f"[FAIL] Missing: {rel}")
        success = False

    # Files present on disk but not pinned (unexpected additions).
    for rel in sorted(present - locked):
        print(f"[FAIL] Untracked (not in lockfile): {rel}")
        success = False

    # Files present in both: assert byte-for-byte integrity.
    for rel in sorted(locked & present):
        actual = sha256_path(os.path.join(VENDOR_DIR, rel))
        if actual != lock[rel]:
            print(f"[FAIL] Modified: {rel}")
            success = False
        else:
            print(f"[ OK ] Verified: {rel}")

    if success:
        print(f"\nSuccess! All {len(locked)} vendor files match their pinned hashes exactly.")
        sys.exit(0)
    else:
        print("\nError: One or more vendor files were modified, removed, or added")
        print("outside the managed download flow. To update dependencies, edit")
        print("data/vendor.json and run .agent/scripts/download-vendor.py.")
        sys.exit(1)

if __name__ == '__main__':
    main()
