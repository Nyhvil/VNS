"""Read the text of an image with PaddleOCR."""
from __future__ import annotations

import base64
import binascii
import io
import threading
from dataclasses import dataclass
from typing import Any, Callable

from .config import Settings


class InvalidImage(Exception):
    """The request did not contain a decodable image."""


@dataclass(frozen=True)
class OcrOutput:
    text: str
    confidence: float  # mean confidence of the recognised lines, 0-1
    lines: list[dict]  # [{"text": ..., "confidence": ...}]


def decode_image(image_base64: str) -> Any:
    """base64 (with or without a data: prefix) -> RGB numpy array."""
    import numpy as np  # type: ignore
    from PIL import Image, UnidentifiedImageError  # type: ignore

    payload = image_base64.split(",", 1)[1] if image_base64.startswith("data:") else image_base64
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as error:
        raise InvalidImage("image_base64 is not valid base64") from error

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidImage("image_base64 is not a readable image") from error

    return np.array(image)


def parse_paddle_result(result: Any) -> list[dict]:
    """
    Turn PaddleOCR output into [{"text", "confidence"}], top to bottom.

    Two shapes are handled:
    - PaddleOCR 2.x `ocr()`:      [[ [box, (text, score)], ... ]]
    - PaddleOCR 3.x `predict()`:  [ {"rec_texts": [...], "rec_scores": [...]} ]
    """
    lines: list[dict] = []
    if not result:
        return lines

    for page in result:
        if page is None:
            continue

        # 3.x: a dict-like result per page
        rec_texts = None
        if isinstance(page, dict):
            rec_texts, rec_scores = page.get("rec_texts"), page.get("rec_scores")
        elif hasattr(page, "get") and not isinstance(page, (list, tuple)):
            rec_texts, rec_scores = page.get("rec_texts"), page.get("rec_scores")

        if rec_texts is not None:
            scores = list(rec_scores) if rec_scores is not None else []
            for index, text in enumerate(rec_texts):
                score = float(scores[index]) if index < len(scores) else 0.0
                if str(text).strip():
                    lines.append({"text": str(text).strip(), "confidence": score})
            continue

        # 2.x: a list of [box, (text, score)]
        for item in page:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            recognised = item[1]
            if isinstance(recognised, (list, tuple)) and len(recognised) >= 2:
                text, score = str(recognised[0]).strip(), float(recognised[1])
                if text:
                    lines.append({"text": text, "confidence": score})

    return lines


def load_paddle_reader(lang: str) -> Callable[[Any], Any]:
    """Create the PaddleOCR engine. Imported lazily: heavy, downloads models on first use."""
    from paddleocr import PaddleOCR  # type: ignore

    engine = PaddleOCR(lang=lang)

    def read(image: Any) -> Any:
        if hasattr(engine, "predict"):  # PaddleOCR 3.x
            return engine.predict(image)
        return engine.ocr(image)  # PaddleOCR 2.x

    return read


class OcrEngine:
    def __init__(self, settings: Settings, reader_loader: Callable[[str], Callable[[Any], Any]] = load_paddle_reader) -> None:
        self._settings = settings
        self._reader_loader = reader_loader
        self._reader: Callable[[Any], Any] | None = None
        self._lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        return self._reader is not None

    def read(self, image_base64: str) -> OcrOutput:
        image = decode_image(image_base64)

        with self._lock:
            if self._reader is None:
                self._reader = self._reader_loader(self._settings.ocr_lang)
            reader = self._reader

        lines = parse_paddle_result(reader(image))
        if not lines:
            return OcrOutput(text="", confidence=0.0, lines=[])

        confidence = sum(line["confidence"] for line in lines) / len(lines)
        return OcrOutput(
            text="\n".join(line["text"] for line in lines),
            confidence=min(1.0, max(0.0, confidence)),
            lines=lines,
        )
