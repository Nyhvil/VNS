"""Settings, read from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return None
    return value.strip()


def _env_bool(name: str, default: bool) -> bool:
    value = _env(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_list(name: str) -> list[str]:
    value = _env(name)
    if value is None:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # Shared secret the pipeline sends in X-API-Key. Empty = no check (local use only).
    api_key: str | None = None

    # Sequence-classification model fine-tuned from PhoBERT for Vietnamese scam
    # detection: a Hugging Face model id or a local directory (see train/).
    phobert_model: str | None = None
    # PhoBERT expects word-segmented input ("tài_khoản bị khóa").
    phobert_word_segment: bool = True

    # Sequence-classification model fine-tuned from DistilBERT, for English content.
    distilbert_model: str | None = None

    # Label names that mean "scam". When empty, a label counts as scam if its
    # name contains phish/scam/spam/fraud/malicious, or is LABEL_1.
    scam_labels: list[str] = field(default_factory=list)

    max_tokens: int = 256

    # PaddleOCR language. "vi" reads Vietnamese and Latin text.
    ocr_lang: str = "vi"
    ocr_enabled: bool = True

    @staticmethod
    def from_env() -> "Settings":
        return Settings(
            api_key=_env("ML_SERVICE_API_KEY"),
            phobert_model=_env("PHOBERT_MODEL"),
            phobert_word_segment=_env_bool("PHOBERT_WORD_SEGMENT", True),
            distilbert_model=_env("DISTILBERT_MODEL"),
            scam_labels=_env_list("SCAM_LABELS"),
            max_tokens=int(_env("MAX_TOKENS") or 256),
            ocr_lang=_env("OCR_LANG") or "vi",
            ocr_enabled=_env_bool("OCR_ENABLED", True),
        )
