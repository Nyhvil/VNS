import csv
import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "train" / "prepare_dataset.py"


def test_prepare_dataset_merges_sources(tmp_path):
    samples = tmp_path / "samples.json"
    samples.write_text(
        json.dumps({"samples": [{"pattern": "fake_prize", "text": "Chúc mừng bạn đã trúng thưởng xe máy SH"}]}),
        encoding="utf-8",
    )

    scans = tmp_path / "scans.csv"
    with scans.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["content_text", "risk_level"])
        writer.writerow(["Chiều nay nhóm mình họp ở thư viện nhé", "SAFE"])
        writer.writerow(["Tài khoản bị khóa, nhập mã OTP ngay", "SCAM"])
        writer.writerow(["Nội dung chưa rõ ràng lắm đâu nhé", "SUSPICIOUS"])
        writer.writerow(["ngắn", "SAFE"])
        # Same text as the curated sample: the curated label wins.
        writer.writerow(["chúc mừng bạn đã trúng thưởng xe máy sh", "SAFE"])

    out = tmp_path / "out" / "train.csv"
    result = subprocess.run(
        [sys.executable, "-I", str(SCRIPT), "--samples", str(samples), "--scans", str(scans), "--out", str(out)],
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "fewer than 200" in result.stderr

    with out.open(encoding="utf-8", newline="") as handle:
        rows = {row["text"]: (row["label"], row["source"]) for row in csv.DictReader(handle)}

    assert rows == {
        "Chúc mừng bạn đã trúng thưởng xe máy SH": ("scam", "curated"),
        "Chiều nay nhóm mình họp ở thư viện nhé": ("safe", "scans"),
        "Tài khoản bị khóa, nhập mã OTP ngay": ("scam", "scans"),
    }
