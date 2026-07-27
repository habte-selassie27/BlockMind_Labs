"""Injection / adversarial-input detection — AGENTS.md §11.7.

A flagged intent is never executed. Detection runs before classification.
"""

from __future__ import annotations

import re

# Patterns that indicate prompt-injection or adversarial input
_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?prior", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"override\s+safety", re.IGNORECASE),
    re.compile(r"reveal\s+(your|the)\s+system\s+prompt", re.IGNORECASE),
    re.compile(r"drop\s+table", re.IGNORECASE),
    re.compile(r";\s*(SELECT|INSERT|UPDATE|DELETE|DROP)", re.IGNORECASE),
    re.compile(r"UNION\s+SELECT", re.IGNORECASE),
    re.compile(r"<script>", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"exec\s*\(", re.IGNORECASE),
    re.compile(r"eval\s*\(", re.IGNORECASE),
    re.compile(r"__import__", re.IGNORECASE),
    re.compile(r"subprocess", re.IGNORECASE),
    re.compile(r"os\.system", re.IGNORECASE),
]

# Patterns that indicate SQL injection attempts in slot values
_SQL_SLOT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"'\s*OR\s+'", re.IGNORECASE),
    re.compile(r"'\s*OR\s+1\s*=\s*1", re.IGNORECASE),
    re.compile(r"OR\s+'?\d+'?\s*=\s*'?1'?", re.IGNORECASE),
    re.compile(r"--\s*$"),
    re.compile(r"'\s*;\s*--"),
]


def detect_injection(text: str) -> bool:
    """Return True if the input matches known injection patterns."""
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def detect_slot_injection(slots: dict[str, str | float | None]) -> bool:
    """Check extracted slot values for SQL injection patterns."""
    for value in slots.values():
        if isinstance(value, str):
            for pattern in _SQL_SLOT_PATTERNS:
                if pattern.search(value):
                    return True
    return False


# ✅ COMPLIES WITH: AGENTS.md §11.7
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
