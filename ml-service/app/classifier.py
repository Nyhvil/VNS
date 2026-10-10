"""Scam classifier: PhoBERT for Vietnamese, DistilBERT for English."""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from typing import Callable, Protocol

from .config import Settings
from .language import detect_language

# One prediction: probability for every label of the model.
LabelScores = list[dict]
Predictor = Callable[[str], LabelScores]

_SCAM_LABEL_PATTERN = re.compile(r"phish|scam|spam|fraud|malicious", re.IGNORECASE)


class ModelNotConfigured(Exception):
    """No model is set for the language of the text."""


class Segmenter(Protocol):
    def __call__(self, text: str) -> str: ...


@dataclass(frozen=True)
class Classification:
    label: str  # "scam" | "safe"
    confidence: float  # confidence of `label`, 0-1
    scam_probability: float  # 0-1
    model: str  # "phobert" | "distilbert"
    model_name: str
    language: str  # "vi" | "en"


def is_scam_label(label: str, scam_labels: list[str]) -> bool:
    """Does this label of the model mean "scam"?"""
    if scam_labels:
        return label in scam_labels
    if _SCAM_LABEL_PATTERN.search(label):
        return True
    # Binary models saved without label names: class 1 is the positive class.
    return label.upper() == "LABEL_1"


def scam_probability(scores: LabelScores, scam_labels: list[str]) -> float:
    total = sum(float(item["score"]) for item in scores)
    if total <= 0:
        return 0.0
    scam = sum(float(item["score"]) for item in scores if is_scam_label(str(item["label"]), scam_labels))
    return min(1.0, max(0.0, scam / total))


def load_transformers_predictor(model_name: str, max_tokens: int) -> Predictor:
    """Load a Hugging Face text-classification model. Imported lazily: heavy."""
    from transformers import pipeline  # type: ignore

    classify = pipeline("text-classification", model=model_name, tokenizer=model_name, top_k=None)

    def predict(text: str) -> LabelScores:
        output = classify(text, truncation=True, max_length=max_tokens)
        # top_k=None returns [[{label, score}, ...]] for a single string.
        return output[0] if output and isinstance(output[0], list) else output

    return predict


def load_word_segmenter() -> Segmenter:
    """Vietnamese word segmentation for PhoBERT ("tài khoản" -> "tài_khoản")."""
    from underthesea import word_tokenize  # type: ignore

    return lambda text: word_tokenize(text, format="text")


class ScamClassifier:
    """Routes a text to the model of its language and normalises the answer."""

    def __init__(
        self,
        settings: Settings,
        predictor_loader: Callable[[str, int], Predictor] = load_transformers_predictor,
        segmenter_loader: Callable[[], Segmenter] = load_word_segmenter,
    ) -> None:
        self._settings = settings
        self._predictor_loader = predictor_loader
        self._segmenter_loader = segmenter_loader
        self._predictors: dict[str, Predictor] = {}
        self._segmenter: Segmenter | None = None
        self._lock = threading.Lock()

    def configured_models(self) -> dict[str, str | None]:
        return {"phobert": self._settings.phobert_model, "distilbert": self._settings.distilbert_model}

    def loaded_models(self) -> list[str]:
        return sorted(self._predictors)

    def _predictor(self, model_name: str) -> Predictor:
        with self._lock:
            if model_name not in self._predictors:
                self._predictors[model_name] = self._predictor_loader(model_name, self._settings.max_tokens)
            return self._predictors[model_name]

    def _segment(self, text: str) -> str:
        if not self._settings.phobert_word_segment:
            return text
        with self._lock:
            if self._segmenter is None:
                self._segmenter = self._segmenter_loader()
        return self._segmenter(text)

    def classify(self, text: str) -> Classification:
        language = detect_language(text)

        if language == "vi":
            family, model_name = "phobert", self._settings.phobert_model
        else:
            family, model_name = "distilbert", self._settings.distilbert_model

        if not model_name:
            raise ModelNotConfigured(
                f"No {family} model configured for language '{language}'. "
                f"Set {'PHOBERT_MODEL' if family == 'phobert' else 'DISTILBERT_MODEL'}."
            )

        model_input = self._segment(text) if family == "phobert" else text
        scores = self._predictor(model_name)(model_input)
        probability = scam_probability(scores, self._settings.scam_labels)
        is_scam = probability >= 0.5

        return Classification(
            label="scam" if is_scam else "safe",
            confidence=probability if is_scam else 1.0 - probability,
            scam_probability=probability,
            model=family,
            model_name=model_name,
            language=language,
        )
