import os
import json
import time

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def save(couid, info, complaints):
    _ensure_dir()
    ts = time.strftime('%Y%m%d_%H%M%S')
    filename = f'{couid}_{ts}.json'
    filepath = os.path.join(DATA_DIR, filename)
    data = {
        'couid': couid,
        'timestamp': ts,
        'info': info,
        'complaints': complaints
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


def load_all():
    _ensure_dir()
    results = []
    for name in sorted(os.listdir(DATA_DIR)):
        if name.endswith('.json'):
            with open(os.path.join(DATA_DIR, name), 'r', encoding='utf-8') as f:
                results.append(json.load(f))
    return results


def load_one(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)
