#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import re
from vendor_utils import (
    VENDOR_DIR, load_vendor_config, download_file, get_all_vendor_files,
    build_lock, save_lock,
)

def main():
    print("Downloading standard vendor files...")
    failed = []

    # Ensure directories exist
    for d in ['js', 'css', 'fonts']:
        os.makedirs(os.path.join(VENDOR_DIR, d), exist_ok=True)

    config = load_vendor_config()
    files_to_download = get_all_vendor_files(config)
    expected_explicit = {file_info['dest'] for file_info in files_to_download}

    # Vendor filenames can change across upstream major versions (for example,
    # Fuse.js 7's browser-ready ESM bundle moved from .js to .mjs). Remove stale
    # explicitly-managed files before re-syncing so build_lock() never preserves
    # orphaned vendor assets that are no longer declared in data/vendor.json.
    for subdir in ('js', 'css', 'fonts'):
        dirpath = os.path.join(VENDOR_DIR, subdir)
        if not os.path.isdir(dirpath):
            continue
        for filename in os.listdir(dirpath):
            rel = f"{subdir}/{filename}"
            if rel == 'css/google-fonts.css':
                continue
            if subdir == 'fonts' and filename.startswith('google-font-') and filename.endswith('.woff2'):
                continue
            if rel not in expected_explicit:
                os.remove(os.path.join(dirpath, filename))

    for file_info in files_to_download:
        dest_path = os.path.join(VENDOR_DIR, file_info['dest'])
        print(f"Downloading {file_info['url']}...")
        # Validate declarative transformations before download
        for rw in file_info.get('rewrites', []):
            if not isinstance(rw, dict) or not rw.get('from') or not rw.get('to'):
                raise ValueError(f"Malformed rewrite rule in vendor.json for {file_info.get('dest')}: {rw}")

        try:
            content = download_file(file_info['url'])
            # Apply any declarative transformations defined in vendor.json
            for rw in file_info.get('rewrites', []):
                from_bytes = rw['from'].encode('utf-8')
                to_bytes = rw['to'].encode('utf-8')
                content = content.replace(from_bytes, to_bytes)

            with open(dest_path, 'wb') as f:
                f.write(content)
        except Exception as e:
            print(f"Failed to download {file_info['dest']}: {e}")
            failed.append(file_info['dest'])

    print("Fetching Google Fonts CSS...")
    font_css_url = config.get('google_fonts_url')
    if font_css_url:
        try:
            css_content = download_file(font_css_url).decode('utf-8')

            fonts_dir = os.path.join(VENDOR_DIR, 'fonts')

            # Clear previously-generated Google font files so a re-sync is
            # deterministic and never leaves orphans from an earlier run.
            for old in os.listdir(fonts_dir):
                if old.startswith('google-font-') and old.endswith('.woff2'):
                    os.remove(os.path.join(fonts_dir, old))

            # One local file per UNIQUE upstream URL. Google reuses a subset's
            # woff2 across weights, so the CSS references the same URL multiple
            # times; deduping avoids downloading identical bytes repeatedly and
            # leaving unreferenced copies. `replace` rewrites every occurrence.
            seen = {}
            for font_url in re.findall(r'url\((https://[^)]+\.woff2)\)', css_content):
                if font_url in seen:
                    continue
                font_filename = f"google-font-{len(seen) + 1}.woff2"
                seen[font_url] = font_filename
                print(f"Downloading font file: {font_url}")
                font_content = download_file(font_url)
                with open(os.path.join(fonts_dir, font_filename), 'wb') as f:
                    f.write(font_content)
                css_content = css_content.replace(font_url, f"../fonts/{font_filename}")

            css_dest = os.path.join(VENDOR_DIR, 'css', 'google-fonts.css')
            with open(css_dest, 'w', encoding='utf-8', newline='\n') as f:
                f.write(css_content)
        except Exception as e:
            print(f"Failed to process Google Fonts: {e}")
            failed.append('css/google-fonts.css')

    if failed:
        print("\n[FAIL] One or more vendor assets failed to download:")
        for dest in failed:
            print(f"  - {dest}")
        print("Lockfile NOT updated (partial sync). Re-run after fixing the cause.")
        sys.exit(1)

    # Pin the exact bytes we just fetched so verify-vendor.py can assert
    # integrity offline (no network, no re-download).
    save_lock(build_lock())
    print("\n[OK] Vendor files downloaded and lockfile (data/vendor-lock.json) updated.")

if __name__ == '__main__':
    main()
