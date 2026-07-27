"""Main intent parser — ties together classifier, slots, safety, language, ambiguity."""

from __future__ import annotations

from .ambiguity import detect_ambiguities
from .classifier import classify_intent
from .language import detect_language
from .models import ParsedIntent
from .safety import detect_injection, detect_slot_injection
from .slots import extract_slots


def parse_intent(raw_input: str) -> ParsedIntent:
    """Parse a raw NL user input into a structured ParsedIntent.

    Pipeline:
    1. Injection detection (safety first)
    2. Language detection
    3. Intent classification
    4. Slot extraction
    5. Slot injection check
    6. Ambiguity detection
    """
    # Step 1: Injection detection
    is_flagged = detect_injection(raw_input)

    # Step 2: Language detection
    language = detect_language(raw_input)

    # Step 3: Intent classification
    intent_class, confidence = classify_intent(raw_input)

    # Step 4: Slot extraction
    slots = extract_slots(raw_input, intent_class)

    # Step 5: Check slots for injection patterns
    if not is_flagged:
        is_flagged = detect_slot_injection(slots)

    # Step 6: If flagged, override to unknown with zero confidence
    if is_flagged:
        intent_class = "unknown"
        confidence = 0.0
        slots = {}
        ambiguities: list[str] = ["Input flagged as potentially adversarial"]
        suggested_clarification: str | None = (
            "I can't process that request. Please rephrase."
        )
    else:
        # Step 7: Ambiguity detection
        ambiguities, suggested_clarification = detect_ambiguities(
            intent_class, slots
        )
        # If too many ambiguities, lower confidence
        if len(ambiguities) > 2:
            confidence = round(confidence * 0.7, 2)

    return ParsedIntent(
        intent_class=intent_class,
        confidence=confidence,
        slots=slots,
        ambiguities=ambiguities,
        suggested_clarification=suggested_clarification,
        raw_input=raw_input,
        language_detected=language,
        is_flagged=is_flagged,
    )


# ✅ COMPLIES WITH: AGENTS.md §10, §11.7
# ✅ SERVICE: intent-service
# ✅ ARCHITECT SPEC: P1-04 NLP intent parsing module
