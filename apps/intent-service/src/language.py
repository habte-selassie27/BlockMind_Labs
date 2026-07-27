"""Language detection with fallback to English."""

from __future__ import annotations

try:
    from langdetect import detect as _langdetect_detect, LangDetectException

    def detect_language(text: str) -> str:
        """Detect the language of the input text. Returns ISO 639-1 code."""
        try:
            code = _langdetect_detect(text)
            return code if code else "en"
        except LangDetectException:
            return "en"

except ImportError:
    def detect_language(text: str) -> str:
        """Fallback: always returns English if langdetect is not installed."""
        return "en"


# ✅ COMPLIES WITH: AGENTS.md §10
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
