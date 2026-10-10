# Dịch vụ ML của VNS

Dịch vụ Python (FastAPI) chạy hai thứ mà pipeline không tự chạy được:

- **Mô hình phân loại lừa đảo**: PhoBERT cho tiếng Việt, DistilBERT cho tiếng Anh.
- **PaddleOCR**: đọc chữ trong ảnh.

Pipeline gọi dịch vụ này khi có `ML_SERVICE_URL`. Dịch vụ không chạy hoặc chưa có mô hình thì pipeline bỏ qua lớp này và phân tích tiếp bằng các lớp khác.

## Tình trạng hiện tại

- **Chưa có mô hình PhoBERT nào được huấn luyện cho bài toán này.** Mã để nạp và gọi mô hình đã có, script huấn luyện đã có; thứ còn thiếu là dữ liệu có nhãn và một lần huấn luyện.
- Phần mã đã được chạy thử với một mô hình BERT rất nhỏ tự tạo (không phải PhoBERT), vì máy viết mã không tải được mô hình từ Hugging Face. Lần đầu chạy với PhoBERT thật cần kiểm tra lại.
- PaddleOCR chưa được chạy thử với mô hình thật, cũng vì lý do tải mô hình.

## Chạy

```sh
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Cài đặt nặng (PyTorch, PaddlePaddle), cần vài GB ổ đĩa.

| Đường dẫn | Tác dụng |
| --- | --- |
| `GET /health` | Mô hình nào đã cấu hình, đã nạp |
| `POST /classify` `{ "text": "..." }` | Trả nhãn `scam` hoặc `safe`, độ tin cậy, xác suất lừa đảo, mô hình đã dùng |
| `POST /ocr` `{ "image_base64": "..." }` | Trả chữ đọc được và độ tin cậy |

Khi `ML_SERVICE_API_KEY` được đặt, hai đường dẫn `POST` đòi khóa đó trong tiêu đề `X-API-Key`.

Văn bản tiếng Việt (có dấu, hoặc không dấu nhưng nhiều âm tiết tiếng Việt) đi tới PhoBERT; còn lại đi tới DistilBERT. Ngôn ngữ nào chưa có mô hình thì `/classify` trả 503.

## Huấn luyện PhoBERT

Cần một file CSV có hai cột `text` và `label` (`scam` hoặc `safe`).

```sh
pip install -r requirements-train.txt

# Gộp các nguồn dữ liệu thành một file
python train/prepare_dataset.py \
    --samples ../pipeline/data/scam_samples.vi.json \
    --scans scans_export.csv \
    --extra du_lieu_tu_gan_nhan.csv \
    --out data/train.csv

# Huấn luyện
python train/train_phobert.py --data data/train.csv --out models/phobert-scam
```

Rồi đặt `PHOBERT_MODEL=./models/phobert-scam` trong `.env`.

Về dữ liệu:

- `--samples`: 32 tin lừa đảo do nhóm soạn. Chỉ có nhãn `scam`.
- `--scans`: file xuất từ bảng `scans` của Supabase. Nhãn ở đây do chính hệ thống gán (SCAM thành `scam`, SAFE thành `safe`, bỏ qua SUSPICIOUS), không phải người gán. Cần người xem lại trước khi dùng.
- `--extra`: dữ liệu nhóm tự gán nhãn. Đây là nguồn đáng tin nhất.

Script huấn luyện giữ lại 20% dữ liệu để đánh giá và in ra accuracy, precision, recall, F1. Với vài trăm mẫu, các con số này dao động mạnh và mô hình chưa đáng tin; nên có ít nhất vài nghìn mẫu mỗi nhãn, trong đó phần `safe` phải là tin nhắn thật của người Việt, đủ đa dạng.

Cho tới khi có mô hình tốt, đừng đặt `PHOBERT_MODEL`: một mô hình kém mà tự tin trên 90% sẽ trả sai kết quả qua đường nhanh.

## Kiểm thử

```sh
pip install -r requirements-dev.txt
pytest
```

Bộ test thay mô hình và PaddleOCR bằng bản giả lập, nên không cần cài PyTorch hay PaddlePaddle để chạy.
