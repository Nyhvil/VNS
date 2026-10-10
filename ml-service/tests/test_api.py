import base64
import io

from fastapi.testclient import TestClient
from PIL import Image

from app.classifier import ScamClassifier
from app.config import Settings
from app.main import create_app
from app.ocr import OcrEngine


def build_client(settings=None, scores=None, ocr_result=None, fail=False):
    settings = settings or Settings(phobert_model="team/phobert-scam", distilbert_model="team/distilbert")
    scores = scores or [{"label": "safe", "score": 0.05}, {"label": "scam", "score": 0.95}]

    def predictor_loader(model_name, max_tokens):
        def predict(text):
            if fail:
                raise RuntimeError("model crashed: secret path /models/x")
            return scores

        return predict

    classifier = ScamClassifier(settings, predictor_loader=predictor_loader, segmenter_loader=lambda: (lambda text: text))
    ocr_engine = OcrEngine(settings, reader_loader=lambda lang: (lambda image: ocr_result if ocr_result is not None else [[[None, ("Xin chào", 0.9)]]]))
    return TestClient(create_app(settings=settings, classifier=classifier, ocr_engine=ocr_engine))


def png_base64() -> str:
    buffer = io.BytesIO()
    Image.new("RGB", (30, 10), "white").save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def test_health_lists_models_without_names():
    response = build_client().get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["models"] == {"phobert": {"configured": True}, "distilbert": {"configured": True}}
    assert "team/phobert-scam" not in response.text


def test_classify_vietnamese():
    response = build_client().post("/classify", json={"text": "Tài khoản bị khóa, nhập mã OTP ngay"})
    assert response.status_code == 200
    assert response.json() == {
        "label": "scam",
        "confidence": 0.95,
        "scam_probability": 0.95,
        "model": "phobert",
        "model_name": "team/phobert-scam",
        "language": "vi",
    }


def test_classify_rejects_empty_text():
    client = build_client()
    assert client.post("/classify", json={"text": ""}).status_code == 422
    assert client.post("/classify", json={"text": "   "}).status_code == 422
    assert client.post("/classify", json={}).status_code == 422


def test_classify_without_model_answers_503():
    client = build_client(settings=Settings())
    response = client.post("/classify", json={"text": "Tài khoản bị khóa"})
    assert response.status_code == 503
    assert "PHOBERT_MODEL" in response.json()["detail"]


def test_classify_hides_internal_errors():
    response = build_client(fail=True).post("/classify", json={"text": "hello there friend"})
    assert response.status_code == 500
    assert response.json() == {"detail": "Classification failed"}


def test_api_key_is_enforced_when_set():
    settings = Settings(api_key="secret-key", distilbert_model="d")
    client = build_client(settings=settings)

    assert client.post("/classify", json={"text": "hello there"}).status_code == 401
    assert client.post("/classify", json={"text": "hello there"}, headers={"X-API-Key": "wrong"}).status_code == 401
    assert client.post("/ocr", json={"image_base64": png_base64()}).status_code == 401
    assert client.post("/classify", json={"text": "hello there"}, headers={"X-API-Key": "secret-key"}).status_code == 200
    # Health stays open so orchestration tools can probe it.
    assert client.get("/health").status_code == 200


def test_ocr_returns_text_and_confidence():
    response = build_client().post("/ocr", json={"image_base64": png_base64()})
    assert response.status_code == 200
    assert response.json() == {"text": "Xin chào", "confidence": 0.9, "lines": [{"text": "Xin chào", "confidence": 0.9}]}


def test_ocr_rejects_bad_image():
    response = build_client().post("/ocr", json={"image_base64": "bm90IGFuIGltYWdl"})
    assert response.status_code == 422


def test_ocr_can_be_disabled():
    client = build_client(settings=Settings(ocr_enabled=False))
    assert client.post("/ocr", json={"image_base64": png_base64()}).status_code == 503
