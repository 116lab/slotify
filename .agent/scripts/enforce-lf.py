import os
import sys

# Directory paths (relative to project root, POSIX-style) to ignore during
# line-ending checks: vendor bytes, git internals, build output, tool caches.
# Matched by path PREFIX on normalized relative paths so a substring like
# '.git' no longer accidentally excludes '.github/', and '.agent' no longer
# matches an unrelated path that merely contains that substring.
EXCLUDES = ['.git', 'node_modules', 'static/vendor', 'exampleSite/public', 'exampleSite/resources', '.agent', '.gemini']


def is_excluded(rel_path):
    """True if rel_path is, or lives under, one of the EXCLUDES directories.
    Compares path COMPONENTS, not substrings."""
    parts = rel_path.split('/')
    for excl in EXCLUDES:
        excl_parts = excl.split('/')
        if parts[:len(excl_parts)] == excl_parts:
            return True
    return False

def is_text_file(filepath):
    # Quick heuristic to ignore binary files like images/fonts
    if filepath.endswith(('.png', '.jpg', '.jpeg', '.webp', '.woff2', '.ttf', '.pdf', '.exe', '.zip')):
        return False
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except UnicodeDecodeError:
        return False
    except Exception:
        return False

def main(fix=False):
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    crlf_files = []

    print(f"Scanning for CRLF (Windows) line endings in {project_root} ...\n")

    for root, dirs, files in os.walk(project_root):
        # Mutate dirs in-place to skip excluded directories (component match)
        dirs[:] = [
            d for d in dirs
            if not is_excluded(os.path.relpath(os.path.join(root, d), project_root).replace('\\', '/'))
        ]

        for file in files:
            filepath = os.path.join(root, file)

            if is_text_file(filepath):
                with open(filepath, 'rb') as f:
                    content = f.read()
                
                if b'\r\n' in content:
                    rel_path = os.path.relpath(filepath, project_root)
                    crlf_files.append(rel_path)
                    
                    if fix:
                        content_lf = content.replace(b'\r\n', b'\n')
                        with open(filepath, 'wb') as f:
                            f.write(content_lf)
                        print(f"[FIXED] {rel_path}")
                    else:
                        print(f"[CRLF DETECTED] {rel_path}")

    if not fix:
        if crlf_files:
            print(f"\n[FAIL] Found {len(crlf_files)} files with non-compliant CRLF line endings.")
            print("Run 'python .agent/scripts/enforce-lf.py --fix' to normalize them.")
            sys.exit(1)
        else:
            print("\n[OK] All text files comply with Linux-first (LF) line endings.")
            sys.exit(0)
    else:
        print(f"\n[OK] Normalized {len(crlf_files)} files to LF line endings.")
        sys.exit(0)

if __name__ == '__main__':
    fix_mode = '--fix' in sys.argv
    main(fix=fix_mode)
