"""
Build the training file for train_phobert.py.

Sources (any combination):

  --samples   pipeline/data/scam_samples.vi.json
              Curated scam messages. All labelled "scam".

  --scans     A CSV exported from the `scans` table of the VNS database
              (Supabase > Table editor > scans > Export to CSV). Uses the
              columns `content_text` and `risk_level`:
                  SCAM -> scam,  SAFE -> safe,  SUSPICIOUS -> skipped
              These labels were given by the system itself, not by a person.
              Review the output before training on it.

  --extra     Any CSV with the columns `text` and `label` (scam / safe),
              for data the team labelled by hand.

Output: a CSV with the columns `text`, `label`, `source`, duplicates removed.

    python train/prepare_dataset.py \
        --samples ../pipeline/data/scam_samples.vi.json \
        --scans scans_export.csv \
        --out data/train.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

RISK_LEVEL_TO_LABEL = {"SCAM": "scam", "SAFE": "safe"}
MIN_TEXT_LENGTH = 15


def normalize(text: str) -> str:
    return " ".join(str(text).split())


def read_samples(path: Path) -> list[tuple[str, str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [(normalize(item["text"]), "scam", "curated") for item in data.get("samples", [])]


def read_scans(path: Path) -> list[tuple[str, str, str]]:
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            label = RISK_LEVEL_TO_LABEL.get((row.get("risk_level") or "").strip().upper())
            text = normalize(row.get("content_text") or "")
            if label and text:
                rows.append((text, label, "scans"))
    return rows


def read_extra(path: Path) -> list[tuple[str, str, str]]:
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            label = (row.get("label") or "").strip().lower()
            text = normalize(row.get("text") or "")
            if label in {"scam", "safe"} and text:
                rows.append((text, label, "labelled"))
    return rows


def build(rows: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    """Drop short texts and duplicates. Hand-labelled rows win over the others."""
    priority = {"labelled": 0, "curated": 1, "scans": 2}
    best: dict[str, tuple[str, str, str]] = {}
    for text, label, source in rows:
        if len(text) < MIN_TEXT_LENGTH:
            continue
        key = text.lower()
        if key not in best or priority[source] < priority[best[key][2]]:
            best[key] = (text, label, source)
    return list(best.values())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--samples", type=Path)
    parser.add_argument("--scans", type=Path)
    parser.add_argument("--extra", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rows: list[tuple[str, str, str]] = []
    if args.samples:
        rows += read_samples(args.samples)
    if args.scans:
        rows += read_scans(args.scans)
    if args.extra:
        rows += read_extra(args.extra)

    dataset = build(rows)
    if not dataset:
        print("No usable rows found.", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["text", "label", "source"])
        writer.writerows(dataset)

    counts = Counter(label for _, label, _ in dataset)
    print(f"Wrote {len(dataset)} rows to {args.out}: {dict(counts)}")
    if min(counts.get("scam", 0), counts.get("safe", 0)) < 200:
        print(
            "Warning: fewer than 200 examples of one class. A model trained on this "
            "will not be reliable; collect and label more data first.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
