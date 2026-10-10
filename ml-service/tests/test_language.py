from app.language import detect_language


def test_vietnamese_with_diacritics():
    assert detect_language("Tài khoản của bạn bị khóa") == "vi"


def test_vietnamese_without_diacritics():
    assert detect_language("Tai khoan cua ban da bi khoa, vui long xac minh") == "vi"


def test_english():
    assert detect_language("Your account has been suspended. Verify your password now.") == "en"


def test_text_without_letters_defaults_to_english():
    assert detect_language("123 456 !!!") == "en"
