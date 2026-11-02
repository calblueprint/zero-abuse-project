"""Stable fingerprints for the model input and assessment configuration."""

import hashlib
import json

from scripts.intelligence.extractor import SYSTEM_PROMPT
from scripts.intelligence.models import IntelligenceAssessment


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def assessment_key(model: str) -> str:
    """Do not reuse a decision made under a different model, prompt, or schema."""
    configuration = {
        "model": model,
        "prompt": SYSTEM_PROMPT,
        "schema": IntelligenceAssessment.model_json_schema(),
    }
    return content_hash(json.dumps(configuration, sort_keys=True, ensure_ascii=False))
