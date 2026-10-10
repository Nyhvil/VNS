"""Decide whether a text is Vietnamese or English, to pick the right model."""
from __future__ import annotations

import re
import unicodedata

# Letters that exist in Vietnamese but not in English.
_VIETNAMESE_LETTERS = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]",
    re.IGNORECASE,
)

# Common Vietnamese words as typed without diacritics (very frequent in SMS).
_VIETNAMESE_PLAIN_WORDS = {
    "khong", "cua", "ban", "toi", "anh", "chi", "em", "tai", "khoan", "ngan", "hang",
    "vui", "long", "duoc", "nhan", "tien", "chuyen", "xac", "minh", "thong", "bao",
    "quy", "khach", "lien", "he", "ngay", "trong", "vong", "nhe", "cho", "voi", "nay",
    "da", "bi", "khoa", "ma", "gui", "nhap", "truy", "cap", "dang", "tra", "phi",
}

_WORD = re.compile(r"[a-zA-Z]+")


def detect_language(text: str) -> str:
    """Return "vi" or "en"."""
    normalized = unicodedata.normalize("NFC", text)

    if _VIETNAMESE_LETTERS.search(normalized):
        return "vi"

    words = [word.lower() for word in _WORD.findall(normalized)]
    if not words:
        return "en"

    vietnamese = sum(1 for word in words if word in _VIETNAMESE_PLAIN_WORDS)
    # A quarter of the words being typical Vietnamese syllables is a clear sign.
    return "vi" if vietnamese / len(words) >= 0.25 else "en"
