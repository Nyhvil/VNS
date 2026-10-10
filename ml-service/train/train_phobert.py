"""
Fine-tune PhoBERT to tell Vietnamese scam messages from safe ones.

    pip install -r requirements-train.txt
    python train/train_phobert.py --data data/train.csv --out models/phobert-scam

The data file is a CSV with the columns `text` and `label` (scam / safe), see
prepare_dataset.py. The result is a folder the ML service can load:

    PHOBERT_MODEL=./models/phobert-scam

The script holds back part of the data and prints accuracy, precision, recall
and F1 on it. Read those numbers before putting the model to use: recall is
the share of scams the model catches, precision the share of its alarms that
are right.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

LABELS = ["safe", "scam"]
LABEL_TO_ID = {label: index for index, label in enumerate(LABELS)}


def read_rows(path: Path) -> tuple[list[str], list[int]]:
    texts, labels = [], []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            label = (row.get("label") or "").strip().lower()
            text = " ".join((row.get("text") or "").split())
            if label in LABEL_TO_ID and text:
                texts.append(text)
                labels.append(LABEL_TO_ID[label])
    return texts, labels


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--base-model", default="vinai/phobert-base-v2")
    parser.add_argument("--epochs", type=float, default=4)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--max-tokens", type=int, default=256)
    parser.add_argument("--eval-share", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-word-segment", action="store_true", help="skip Vietnamese word segmentation")
    args = parser.parse_args()

    # Heavy imports after argument parsing, so --help is instant.
    import numpy as np
    from datasets import Dataset
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support
    from sklearn.model_selection import train_test_split
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
    )

    texts, labels = read_rows(args.data)
    if len(set(labels)) < 2:
        raise SystemExit("The data must contain both scam and safe examples.")

    if not args.no_word_segment:
        # PhoBERT was pre-trained on word-segmented text; the service segments
        # the same way at prediction time (PHOBERT_WORD_SEGMENT=true).
        from underthesea import word_tokenize

        texts = [word_tokenize(text, format="text") for text in texts]

    train_texts, eval_texts, train_labels, eval_labels = train_test_split(
        texts, labels, test_size=args.eval_share, random_state=args.seed, stratify=labels
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=len(LABELS),
        id2label=dict(enumerate(LABELS)),
        label2id=LABEL_TO_ID,
    )

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=args.max_tokens)

    train_set = Dataset.from_dict({"text": train_texts, "label": train_labels}).map(tokenize, batched=True)
    eval_set = Dataset.from_dict({"text": eval_texts, "label": eval_labels}).map(tokenize, batched=True)

    def compute_metrics(prediction):
        predicted = np.argmax(prediction.predictions, axis=-1)
        precision, recall, f1, _ = precision_recall_fscore_support(
            prediction.label_ids, predicted, average="binary", pos_label=LABEL_TO_ID["scam"], zero_division=0
        )
        return {
            "accuracy": accuracy_score(prediction.label_ids, predicted),
            "precision": precision,
            "recall": recall,
            "f1": f1,
        }

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=str(args.out / "checkpoints"),
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            per_device_eval_batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            weight_decay=0.01,
            eval_strategy="epoch",
            save_strategy="epoch",
            save_total_limit=2,
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            seed=args.seed,
            report_to=[],
        ),
        train_dataset=train_set,
        eval_dataset=eval_set,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    metrics = trainer.evaluate()

    args.out.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(args.out))
    tokenizer.save_pretrained(str(args.out))
    (args.out / "eval_metrics.json").write_text(
        json.dumps(
            {
                "base_model": args.base_model,
                "train_examples": len(train_texts),
                "eval_examples": len(eval_texts),
                "word_segmented": not args.no_word_segment,
                **{key: value for key, value in metrics.items() if key.startswith("eval_")},
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Model saved to {args.out}")
    print(json.dumps({key: round(value, 4) for key, value in metrics.items() if key.startswith("eval_")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
