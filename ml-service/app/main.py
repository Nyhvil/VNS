"""HTTP API of the ML service."""
from __future__ import annotations

import hmac
import logging

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .classifier import ModelNotConfigured, ScamClassifier
from .config import Settings
from .ocr import InvalidImage, OcrEngine

logger = logging.getLogger("vns.ml")


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class ClassifyResponse(BaseModel):
    label: str
    confidence: float
    scam_probability: float
    model: str
    model_name: str
    language: str


class OcrRequest(BaseModel):
    # About 15 MB of image once decoded.
    image_base64: str = Field(min_length=1, max_length=20_000_000)


class OcrLine(BaseModel):
    text: str
    confidence: float


class OcrResponse(BaseModel):
    text: str
    confidence: float
    lines: list[OcrLine]


def create_app(
    settings: Settings | None = None,
    classifier: ScamClassifier | None = None,
    ocr_engine: OcrEngine | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    classifier = classifier or ScamClassifier(settings)
    ocr_engine = ocr_engine or OcrEngine(settings)

    app = FastAPI(title="VNS ML service", version="1.0.0")

    def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
        if not settings.api_key:
            return
        if not x_api_key or not hmac.compare_digest(x_api_key, settings.api_key):
            raise HTTPException(status_code=401, detail="Unauthorized")

    @app.get("/health")
    def health() -> dict:
        return {
            "status": "ok",
            "models": {
                name: {"configured": bool(model)}
                for name, model in classifier.configured_models().items()
            },
            "loaded_models": len(classifier.loaded_models()),
            "ocr": {"enabled": settings.ocr_enabled, "lang": settings.ocr_lang, "loaded": ocr_engine.loaded},
        }

    @app.post("/classify", response_model=ClassifyResponse, dependencies=[Depends(require_api_key)])
    def classify(request: ClassifyRequest) -> ClassifyResponse:
        if not request.text.strip():
            raise HTTPException(status_code=422, detail="text is empty")

        try:
            result = classifier.classify(request.text)
        except ModelNotConfigured as error:
            # The pipeline treats this as "classifier not available" and carries on.
            raise HTTPException(status_code=503, detail=str(error)) from error
        except Exception as error:  # model failed to load or to run
            logger.exception("classification failed")
            raise HTTPException(status_code=500, detail="Classification failed") from error

        return ClassifyResponse(
            label=result.label,
            confidence=result.confidence,
            scam_probability=result.scam_probability,
            model=result.model,
            model_name=result.model_name,
            language=result.language,
        )

    @app.post("/ocr", response_model=OcrResponse, dependencies=[Depends(require_api_key)])
    def ocr(request: OcrRequest) -> OcrResponse:
        if not settings.ocr_enabled:
            raise HTTPException(status_code=503, detail="OCR is disabled")

        try:
            output = ocr_engine.read(request.image_base64)
        except InvalidImage as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except Exception as error:
            logger.exception("OCR failed")
            raise HTTPException(status_code=500, detail="OCR failed") from error

        return OcrResponse(
            text=output.text,
            confidence=output.confidence,
            lines=[OcrLine(**line) for line in output.lines],
        )

    return app


app = create_app()
