"""Exact reviewed content revisions, with the original verification fixtures retained."""

import hashlib
import json
from pathlib import Path


def canonical_digest(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(payload.encode()).hexdigest()


def audited_question_bindings(package):
    revisions = Path(__file__).with_name('reviewed-audit-bindings-20261122.json')
    review = json.loads(revisions.read_text(encoding='utf-8'))[package['key']]
    candidate = review['packageDigests'].get(package['version'])
    if candidate != canonical_digest(package):
        raise ValueError(f"Package differs from the reviewed {package['key']} {package['version']} content")
    corrections = review['questions'] if package['version'] == review['reviewedVersion'] else {}

    def matches(uid, actual, original):
        if uid in corrections:
            return corrections[uid] == [original, actual]
        return actual == original

    return matches
