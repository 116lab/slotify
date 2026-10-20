import os
import json
import hashlib
import urllib.request

# Global Constants
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
VENDOR_DIR = os.path.join(PROJECT_ROOT, 'static', 'vendor')
VENDOR_JSON_PATH = os.path.join(PROJECT_ROOT, 'data', 'vendor.json')
# Offline integrity anchor: sha256 of every file under static/vendor/, written
# by download-vendor.py and asserted (without network) by verify-vendor.py.
VENDOR_LOCK_PATH = os.path.join(PROJECT_ROOT, 'data', 'vendor-lock.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def load_vendor_config():
    """Loads the vendor.json configuration file."""
    if not os.path.exists(VENDOR_JSON_PATH):
        raise FileNotFoundError(f"Vendor configuration not found at {VENDOR_JSON_PATH}")
    with open(VENDOR_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def download_file(url):
    """Downloads a file from a URL using urllib."""
    req = urllib.request.Request(url, headers=HEADERS)
    response = urllib.request.urlopen(req)
    return response.read()

def get_all_vendor_files(config):
    """Returns a flat list of all explicitly-listed vendor files (js, css, fonts)
    from the config. NOTE: this does NOT include the Google Fonts CSS or its
    generated woff2 files (those are driven by `google_fonts_url`); use the
    lockfile (sha256 of the whole vendor dir) for complete integrity coverage."""
    files = []
    for section in ('js', 'css', 'fonts'):
        files.extend(config.get(section, []))
    return files

def sha256_bytes(data):
    """Return the hex sha256 digest of a bytes object."""
    return hashlib.sha256(data).hexdigest()

def sha256_path(path):
    """Return the hex sha256 digest of a file's contents."""
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def iter_vendor_files():
    """Yield every file under VENDOR_DIR as a POSIX-style relative path
    (e.g. 'js/vue.global.prod.js'), sorted for deterministic output."""
    rels = []
    for dirpath, _, files in os.walk(VENDOR_DIR):
        for name in files:
            abspath = os.path.join(dirpath, name)
            rel = os.path.relpath(abspath, VENDOR_DIR).replace(os.sep, '/')
            rels.append(rel)
    return sorted(rels)

def build_lock():
    """Compute the sha256 of every file currently in VENDOR_DIR."""
    return {rel: sha256_path(os.path.join(VENDOR_DIR, rel)) for rel in iter_vendor_files()}

def load_lock():
    """Load the persisted vendor lockfile (dict: relpath -> sha256), or None."""
    if not os.path.exists(VENDOR_LOCK_PATH):
        return None
    with open(VENDOR_LOCK_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_lock(lock):
    """Persist the vendor lockfile with stable key ordering."""
    with open(VENDOR_LOCK_PATH, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(lock, f, indent=2, sort_keys=True)
        f.write('\n')
