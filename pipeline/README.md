# Pipeline phân tích của VNS

Dịch vụ Node.js + TypeScript nhận một nội dung (văn bản, email đầy đủ, ảnh) và trả về điểm rủi ro kèm căn cứ. Hàm `analyze-content` của giao diện gọi dịch vụ này khi được cấu hình; chi tiết kiến trúc và cách chấm điểm ở [docs/CONG_NGHE.md](../docs/CONG_NGHE.md).

Đây là dịch vụ nội bộ: mọi đường dẫn `/pipeline/*` (trừ `/pipeline/health`) đều đòi khóa `X-API-Key`.

Với `WEB_ENABLED=true`, dịch vụ này còn làm luôn máy chủ của cả trang web (giao diện, `/functions/v1/*`, lưu dữ liệu), không cần Supabase. Các địa chỉ đó là công khai, không đòi khóa. Xem [docs/TRIEN_KHAI.md](../docs/TRIEN_KHAI.md).

## Chạy

```sh
npm install
cp .env.example .env     # điền PIPELINE_API_KEY, các khóa khác tùy lớp muốn bật
npm run build
npm start
```

Chỉ `PIPELINE_API_KEY` là bắt buộc. Mỗi nhóm biến trong `.env.example` bật thêm một lớp; nhóm nào để trống thì lớp đó được bỏ qua.

| Lớp | Cần gì |
| --- | --- |
| Bộ luật, đọc mã QR, Tesseract (tiếng Việt và tiếng Anh, tệp ngôn ngữ có sẵn) | Không cần gì |
| RAG | Khóa embedding (`OPENAI_API_KEY`) và Qdrant; nạp mẫu bằng `npm run seed` |
| LLM, đọc ảnh bằng mô hình thị giác, chatbot | `LLM_ENABLED=true` và khóa của nhà cung cấp (`OPENAI_API_KEY` hoặc `GEMINI_API_KEY`) |
| Phân loại PhoBERT / DistilBERT, PaddleOCR | `ML_SERVICE_URL` trỏ tới [ml-service](../ml-service) |
| Hàng đợi BullMQ, bộ nhớ đệm dùng chung | `REDIS_URL` |

## API

| Đường dẫn | Tác dụng |
| --- | --- |
| `GET /pipeline/health` | Dịch vụ đã sẵn sàng chưa |
| `GET /pipeline/status` | Lớp nào đang được cấu hình |
| `POST /pipeline/analyze` | Phân tích và trả kết quả |
| `POST /pipeline/jobs` | Đưa yêu cầu vào hàng đợi, trả ngay mã job (cần Redis) |
| `GET /pipeline/jobs/:id` | Trạng thái và kết quả của job |
| `POST /pipeline/chat` | Chatbot RAG trả lời câu hỏi về một nội dung |

Yêu cầu phân tích:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "plain_text",
  "content": "Tài khoản của bạn bị khóa, nhập mã OTP tại http://...",
  "metadata": { "additional_text": "ghi chú gõ kèm ảnh, chỉ dùng với type image" }
}
```

`type` là `plain_text`, `email_text` hoặc `eml_file` (email đầy đủ kèm tiêu đề), hay `image` (ảnh dạng base64).

Các trường chính trong kết quả:

| Trường | Ý nghĩa |
| --- | --- |
| `risk_score`, `risk_level`, `category` | Điểm 0–100, bốn mức, và nhãn nội dung |
| `vns` | Kết luận ba mức SAFE / SUSPICIOUS / SCAM kèm giải thích, lời khuyên bằng tiếng Việt |
| `analysis_path` | `fast_ml` (trả ngay theo mô hình phân loại) hoặc `deep` |
| `layers` | Điểm, trọng số của từng lớp và lớp đó có tín hiệu hay không |
| `formula_score`, `llm_floor_applied` | Điểm theo công thức, và điểm cuối có được nâng lên bằng điểm LLM hay không |
| `ml` | Kết quả mô hình phân loại, nếu có |
| `findings` | Các luật vi phạm |
| `evidence` | Link đã kiểm tra, tổ chức, mẫu lừa đảo khớp, mẫu tương tự, mã QR |

## Kiểm thử

```sh
npm test
REDIS_TEST_URL=redis://127.0.0.1:6379 npm run test:integration   # hàng đợi, cần Redis
DATABASE_TEST_URL=postgres://user:pass@127.0.0.1:5432/vns_test npm run test:integration   # lưu dữ liệu, cần PostgreSQL
```

Bài test với PostgreSQL xoá sạch ba bảng `scans`, `mailguard_logs`, `scan_images` của cơ sở dữ liệu được trỏ tới, nên chỉ dùng cơ sở dữ liệu tạo riêng để thử.

## Cấu trúc

```
src/
  http/          Đường dẫn, kiểm tra khóa, IP và dữ liệu đầu vào
  orchestrator/  Điều phối các bước, luồng nhanh và luồng sâu
  parser/        Đọc email (mailparser), ảnh (chuỗi OCR), mã QR
  knowledge/     Tên miền chính thức, tổ chức thật, 16 mẫu lừa đảo
  features/      Trích link, từ khóa, thông tin email
  rules/         11 luật
  ml/            Gọi dịch vụ ML
  rag/           Embedding, Qdrant, rerank
  llm/           Gọi LLM, che thông tin cá nhân
  scoring/       Công thức 5 lớp, kết luận ba mức
  chat/          Chatbot RAG
  queue/         BullMQ và Redis
  cache/         Bộ nhớ đệm
  scripts/       Nạp bộ mẫu vào Qdrant
data/            Bộ mẫu lừa đảo do nhóm soạn
```

Hai file trong `src/knowledge/` là bản sao của hai file trong `supabase/functions/analyze-content/`. Khi sửa một bên phải sửa cả bên kia; `npm test` sẽ báo nếu chúng lệch nhau.
