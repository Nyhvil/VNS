import base64
import io

import pytest
from PIL import Image

from app.config import Settings
from app.ocr import InvalidImage, OcrEngine, decode_image, parse_paddle_result


def png_base64(size=(40, 20)) -> str:
    buffer = io.BytesIO()
    Image.new("RGB", size, "white").save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def test_decode_image_returns_rgb_array():
    array = decode_image(png_base64((40, 20)))
    assert array.shape == (20, 40, 3)


def test_decode_image_accepts_data_url():
    array = decode_image("data:image/png;base64," + png_base64())
    assert array.shape[2] == 3


@pytest.mark.parametrize("payload", ["not base64 !!!", base64.b64encode(b"not an image").decode()])
def test_decode_image_rejects_bad_input(payload):
    with pytest.raises(InvalidImage):
        decode_image(payload)


def test_parse_paddle_2x_result():
    result = [[
        [[[0, 0], [1, 0], [1, 1], [0, 1]], ("Tài khoản bị khóa", 0.98)],
        [[[0, 2], [1, 2], [1, 3], [0, 3]], ("Nhập mã OTP", 0.90)],
    ]]
    assert parse_paddle_result(result) == [
        {"text": "Tài khoản bị khóa", "confidence": 0.98},
        {"text": "Nhập mã OTP", "confidence": 0.90},
    ]


def test_parse_paddle_3x_result():
    result = [{"rec_texts": ["Dòng 1", " ", "Dòng 2"], "rec_scores": [0.9, 0.1, 0.8]}]
    assert parse_paddle_result(result) == [
        {"text": "Dòng 1", "confidence": 0.9},
        {"text": "Dòng 2", "confidence": 0.8},
    ]


@pytest.mark.parametrize("result", [None, [], [None], [[]]])
def test_parse_empty_results(result):
    assert parse_paddle_result(result) == []


def test_engine_joins_lines_and_averages_confidence():
    loads = []

    def loader(lang):
        loads.append(lang)
        return lambda image: [[[None, ("Xin chào", 0.9)], [None, ("Việt Nam", 0.7)]]]

    engine = OcrEngine(Settings(ocr_lang="vi"), reader_loader=loader)
    assert not engine.loaded

    output = engine.read(png_base64())
    engine.read(png_base64())

    assert output.text == "Xin chào\nViệt Nam"
    assert output.confidence == pytest.approx(0.8)
    assert loads == ["vi"]  # the engine is created once
    assert engine.loaded


def test_engine_reports_no_text():
    engine = OcrEngine(Settings(), reader_loader=lambda lang: (lambda image: [None]))
    output = engine.read(png_base64())
    assert (output.text, output.confidence, output.lines) == ("", 0.0, [])
