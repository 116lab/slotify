import json
import os
import sys

# Resolve the build output relative to this script, not the caller's cwd.
PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')


def fail(message):
    print(f'JSON INVALID: {message}')
    sys.exit(1)


try:
    with open(os.path.join(PUBLIC, 'index.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    fail(e)

posts = data.get('posts')
if not isinstance(posts, list):
    fail('index.json is missing a posts array')
if len(posts) == 0:
    fail('index.json has no posts')

config = data.get('config')
if not isinstance(config, dict):
    fail('index.json is missing a config object')

print('JSON VALID')
print(f'Post count: {len(posts)}')
