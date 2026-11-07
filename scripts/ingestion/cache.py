"""Stable fingerprints for the model input and assessment configuration."""

import hashlib
import json

from scripts.intelligence.extractor import SYSTEM_PROMPT
from scripts.intelligence.models import IntelligenceAssessment, ScreeningDecision
from scripts.intelligence.screening import PREVIEW_LIMITS, SCREENING_MAX_TOKENS, SCREENING_PROMPT
from scripts.models import Article


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def article_hash(article: Article) -> str:
    """Include preview metadata so revised titles/descriptions can be screened again."""
    return content_hash(json.dumps({
        "text": article.article_text,
        "title": article.title,
        "meta_description": article.meta_description,
    }, sort_keys=True, ensure_ascii=False))


def assessment_key(model: str, screening_model: str | None = None) -> str:
    """Do not reuse a decision made under a different model, prompt, or schema."""
    configuration = {
        "model": model,
        "prompt": SYSTEM_PROMPT,
        "schema": IntelligenceAssessment.model_json_schema(),
        "screening_model": screening_model if screening_model is not None else model,
        "screening_prompt": SCREENING_PROMPT,
        "screening_schema": ScreeningDecision.model_json_schema(),
        "preview_limits": PREVIEW_LIMITS,
        "screening_max_tokens": SCREENING_MAX_TOKENS,
    }
    return content_hash(json.dumps(configuration, sort_keys=True, ensure_ascii=False))
