import json
import os
import sys

# Resolve the build output relative to this script, not the caller's cwd.
PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

# The post-card shape is the SPA's core data contract (layouts/partials/func/
# card-data.html): home `posts[]`, list `list[]`, single pages, and search-index
# items all carry it. Keep this in sync with card-data.html if the shape changes;
# the SPA composables (useHome / useTaxonomy / useSearch / usePostView) read these
# fields directly, so a silent drift here surfaces as undefined in the UI.
CARD_TYPES = {
    'title': str,
    'url': str,
    'date': str,
    'summary': str,
    'tags': list,
    'series': list,
    'image': str,
}


def check_card(card, where):
    if not isinstance(card, dict):
        return [f'{where}: expected an object, got {type(card).__name__}']
    errors = []
    for key, typ in CARD_TYPES.items():
        if key not in card:
            errors.append(f'{where}: missing "{key}"')
        elif not isinstance(card[key], typ):
            errors.append(f'{where}: "{key}" should be {typ.__name__}, got {type(card[key]).__name__}')
    return errors


def check_pagination(cfg, where):
    """Validate the pagination cursor a feed/list payload must carry."""
    if not isinstance(cfg, dict):
        return [f'{where}: expected an object']
    mode = cfg.get('paginationMode')
    if mode not in ('client', 'static'):
        return [f'{where}: paginationMode must be "client" or "static", got {mode!r}']
    if mode == 'static':
        return [f'{where}: "{k}" should be int in static mode'
                for k in ('pagerCurrent', 'pagerTotal') if not isinstance(cfg.get(k), int)]
    if not isinstance(cfg.get('paginate'), int):
        return [f'{where}: "paginate" should be int in client mode']
    return []


def check_shape(data, filepath):
    """Validate a payload against the SPA's data contract, classified by its
    distinctive top-level key so the check is independent of the file path.
    Unrecognized JSON (not part of the contract) passes the shape stage — the
    parse / BOM / control-char checks still apply to it.
    """
    # Search index: a top-level array of cards (+ a plain-text `content`).
    if isinstance(data, list):
        errors = []
        for i, item in enumerate(data):
            errors += check_card(item, f'search-index[{i}]')
        return errors

    if not isinstance(data, dict):
        return []

    # Home feed: { posts: [card], config: {... + pagination} }.
    if 'posts' in data:
        errors = []
        if not isinstance(data['posts'], list):
            errors.append('home: "posts" must be a list')
        else:
            for i, card in enumerate(data['posts']):
                errors += check_card(card, f'home posts[{i}]')
        errors += check_pagination(data.get('config'), 'home config')
        return errors

    # List payload: term cloud (title/url/count), a single term's posts, or a
    # section list. Pagination fields live at the top level here.
    if 'list' in data:
        errors = []
        if not isinstance(data['list'], list):
            errors.append('list: "list" must be a list')
        else:
            for i, entry in enumerate(data['list']):
                if isinstance(entry, dict) and 'count' in entry:
                    for key in ('title', 'url'):
                        if key not in entry:
                            errors.append(f'list[{i}] (cloud): missing "{key}"')
                    if not isinstance(entry.get('count'), int):
                        errors.append(f'list[{i}] (cloud): "count" should be int')
                else:
                    errors += check_card(entry, f'list[{i}]')
        errors += check_pagination(data, 'list')
        return errors

    # Single page (post / about): the card shape plus the rendered `content`.
    if 'content' in data:
        errors = check_card(data, 'single')
        sn = data.get('seriesNav')
        if sn is not None and not isinstance(sn, dict):
            errors.append('single: "seriesNav" should be an object')
        return errors

    return []


def check_json(filepath):
    print(f'Checking {filepath}...')
    try:
        with open(filepath, 'rb') as f:
            raw = f.read()

        if raw.startswith(b'\xef\xbb\xbf'):
            print('  ERROR: File has UTF-8 BOM')
            return False

        content = raw.decode('utf-8')
        parsed = json.loads(content)
    except Exception as e:
        print(f'  FAILED: {e}')
        return False

    if has_control_chars(parsed):
        print('  ERROR: JSON contains unescaped control characters')
        return False

    shape_errors = check_shape(parsed, filepath)
    if shape_errors:
        for err in shape_errors:
            print(f'  SCHEMA: {err}')
        return False

    print('  JSON is valid')
    return True


def has_control_chars(value):
    if isinstance(value, str):
        return any(ord(ch) < 32 and ch not in '\r\n\t' for ch in value)
    if isinstance(value, list):
        return any(has_control_chars(item) for item in value)
    if isinstance(value, dict):
        return any(has_control_chars(k) or has_control_chars(v) for k, v in value.items())
    return False


json_files = []
for root, _, files in os.walk(PUBLIC):
    for filename in files:
        if filename.endswith('.json'):
            json_files.append(os.path.join(root, filename))

if not json_files:
    print(f'No JSON files found under {PUBLIC}')
    sys.exit(1)

ok = all(check_json(path) for path in sorted(json_files))
sys.exit(0 if ok else 1)
