import pytest

from app.classifier import ModelNotConfigured, ScamClassifier, is_scam_label, scam_probability
from app.config import Settings


def make_classifier(settings, scores_by_model, calls=None):
    """A classifier whose models are replaced by canned scores."""
    calls = calls if calls is not None else []

    def loader(model_name, max_tokens):
        def predict(text):
            calls.append((model_name, text))
            return scores_by_model[model_name]

        return predict

    return ScamClassifier(settings, predictor_loader=loader, segmenter_loader=lambda: (lambda text: text.replace("tài khoản", "tài_khoản")))


SETTINGS = Settings(phobert_model="team/phobert-scam", distilbert_model="team/distilbert-phish")


def test_scam_label_detection():
    assert is_scam_label("scam", [])
    assert is_scam_label("phishing_url", [])
    assert is_scam_label("LABEL_1", [])
    assert not is_scam_label("LABEL_0", [])
    assert not is_scam_label("legitimate_email", [])
    # An explicit list replaces the guessing.
    assert is_scam_label("bad", ["bad"])
    assert not is_scam_label("phishing_url", ["bad"])


def test_scam_probability_sums_scam_labels():
    scores = [
        {"label": "legitimate_email", "score": 0.1},
        {"label": "phishing_url", "score": 0.6},
        {"label": "legitimate_url", "score": 0.1},
        {"label": "phishing_url_alt", "score": 0.2},
    ]
    assert scam_probability(scores, []) == pytest.approx(0.8)
    assert scam_probability([], []) == 0.0


def test_vietnamese_text_goes_to_phobert_word_segmented():
    calls = []
    classifier = make_classifier(
        SETTINGS,
        {"team/phobert-scam": [{"label": "safe", "score": 0.03}, {"label": "scam", "score": 0.97}]},
        calls,
    )

    result = classifier.classify("Thông báo: tài khoản bị khóa, nhập mã OTP")

    assert (result.label, result.model, result.language) == ("scam", "phobert", "vi")
    assert result.scam_probability == pytest.approx(0.97)
    assert result.confidence == pytest.approx(0.97)
    assert calls == [("team/phobert-scam", "Thông báo: tài_khoản bị khóa, nhập mã OTP")]


def test_english_text_goes_to_distilbert_unsegmented():
    calls = []
    classifier = make_classifier(
        SETTINGS,
        {"team/distilbert-phish": [{"label": "LABEL_0", "score": 0.92}, {"label": "LABEL_1", "score": 0.08}]},
        calls,
    )

    result = classifier.classify("Hi team, the meeting moved to 3pm tomorrow.")

    assert (result.label, result.model, result.language) == ("safe", "distilbert", "en")
    assert result.scam_probability == pytest.approx(0.08)
    assert result.confidence == pytest.approx(0.92)
    assert calls[0][1] == "Hi team, the meeting moved to 3pm tomorrow."


def test_segmentation_can_be_switched_off():
    calls = []
    settings = Settings(phobert_model="m", phobert_word_segment=False)
    classifier = make_classifier(settings, {"m": [{"label": "scam", "score": 1.0}]}, calls)

    classifier.classify("tài khoản bị khóa")

    assert calls == [("m", "tài khoản bị khóa")]


def test_missing_model_is_reported():
    classifier = make_classifier(Settings(distilbert_model="d"), {})
    with pytest.raises(ModelNotConfigured, match="PHOBERT_MODEL"):
        classifier.classify("Tài khoản bị khóa")


def test_model_is_loaded_once():
    loads = []

    def loader(model_name, max_tokens):
        loads.append(model_name)
        return lambda text: [{"label": "safe", "score": 1.0}]

    classifier = ScamClassifier(Settings(distilbert_model="d"), predictor_loader=loader)
    classifier.classify("hello there")
    classifier.classify("hello again")

    assert loads == ["d"]
    assert classifier.loaded_models() == ["d"]
