#!/usr/bin/env python3
import os
import shutil
import sys

def main():
    print("Installing strict pre-commit hooks...")

    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    hooks_dir = os.path.join(root_dir, '.git', 'hooks')
    pre_commit_src = os.path.join(root_dir, '.agent', 'scripts', 'pre-commit')
    pre_commit_dest = os.path.join(hooks_dir, 'pre-commit')

    if not os.path.exists(hooks_dir):
        print("Error: '.git/hooks' directory not found. Please ensure you are running this in the root of the git repository.")
        sys.exit(1)

    try:
        # Prefer a symlink on POSIX so edits to the source-of-truth hook
        # (.agent/scripts/pre-commit) are reflected without re-installing.
        # Fall back to a copy on Windows or when symlinks are unavailable.
        if os.path.lexists(pre_commit_dest):
            os.remove(pre_commit_dest)

        linked = False
        if os.name != 'nt':
            try:
                os.symlink(os.path.relpath(pre_commit_src, hooks_dir), pre_commit_dest)
                linked = True
            except (OSError, NotImplementedError):
                linked = False

        if not linked:
            shutil.copy2(pre_commit_src, pre_commit_dest)
            if os.name != 'nt':
                os.chmod(pre_commit_dest, 0o755)

        method = "symlinked" if linked else "copied"
        print(f"[OK] Successfully installed pre-commit hook ({method}).")
        print("Every `git commit` will now run the full architecture audit")
        print("(see .agent/scripts/pre-commit for the authoritative check list)")
        print("before allowing the commit.")
        if not linked:
            print("Note: hook was copied, not symlinked — re-run this script after editing")
            print(".agent/scripts/pre-commit to pick up changes.")
    except Exception as e:
        print(f"[FAIL] Failed to install pre-commit hook: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
