# Hướng dẫn chạy

Có ba mức, từ đơn giản đến đầy đủ. Mức sau bao gồm mức trước.

Muốn chạy cả trang web bằng một máy chủ duy nhất, không cần Supabase, hoặc đưa lên một địa chỉ công khai: xem [TRIEN_KHAI.md](TRIEN_KHAI.md).

Trên Windows, thay `cp` bằng `copy`.

## Mức 1: giao diện, như bản Lovable

Cần Node.js 18 trở lên.

```sh
npm install
npm run dev
```

Giao diện gọi các hàm đã triển khai trên Supabase của dự án (địa chỉ nằm trong `.env`). Ở mức này hệ thống chạy chế độ tích hợp sẵn.

Khi đồng bộ mã này lên Lovable, cần triển khai thêm hàm mới `scam-chat` để ô "Hỏi thêm về kết quả này" hoạt động. Hàm dùng lại secret `LOVABLE_API_KEY` sẵn có. Nếu chưa triển khai, phần phân tích vẫn chạy bình thường, chỉ ô hỏi thêm báo lỗi.

## Mức 2: thêm pipeline

Cần Docker Desktop, hoặc tự cài Node.js 20, Qdrant và Redis.

```sh
cp pipeline/.env.example pipeline/.env
```

Mở `pipeline/.env` và điền:

- `PIPELINE_API_KEY`: một chuỗi ngẫu nhiên (trong file có lệnh tạo).
- `OPENAI_API_KEY` nếu muốn lớp RAG và dùng OpenAI làm LLM.
- Hoặc `LLM_PROVIDER=gemini` và `GEMINI_API_KEY` nếu dùng Gemini làm LLM.

Không điền khóa nào thì pipeline vẫn chạy với bộ luật và Tesseract.

```sh
docker compose up -d
```

Kiểm tra: mở http://localhost:3001/pipeline/health, thấy `"status":"ok"` là được.

Lưu ý: `docker-compose.yml` và hai `Dockerfile` chưa được chạy thử lúc viết mã, vì máy viết mã không có Docker. Cách chạy không dùng Docker ngay bên dưới thì đã chạy thật.

Nạp bộ mẫu lừa đảo vào Qdrant (cần khóa embedding), làm một lần:

```sh
docker compose exec pipeline npm run seed
```

Chạy không dùng Docker:

```sh
cd pipeline
npm install
npm run build
npm start          # dịch vụ
npm run seed       # nạp mẫu, làm một lần
npm test           # kiểm thử
```

### Nối pipeline với hàm `analyze-content`

Hàm chạy trên máy chủ của Supabase, nên pipeline phải có địa chỉ công khai dạng HTTPS (triển khai lên một dịch vụ chạy Docker bất kỳ). Trên máy chủ đó đặt `PIPELINE_ALLOWED_IPS=*`; khóa API vẫn bắt buộc.

Thêm hai secret cho các hàm trong Supabase (hoặc phần Secrets của Lovable Cloud):

| Secret | Giá trị |
| --- | --- |
| `PIPELINE_URL` | Địa chỉ pipeline, ví dụ `https://pipeline.example.com` |
| `PIPELINE_API_KEY` | Giống giá trị trong `pipeline/.env` |

Từ lúc đó `analyze-content` và `scam-chat` gửi nội dung sang pipeline. Xóa hai secret là quay về chế độ tích hợp sẵn. Nếu pipeline ngừng hoạt động, hai hàm tự dùng chế độ tích hợp sẵn cho tới khi pipeline trở lại.

## Mức 3: thêm dịch vụ ML

```sh
cp ml-service/.env.example ml-service/.env
```

Điền `ML_SERVICE_API_KEY`, và `PHOBERT_MODEL` khi đã có mô hình (xem `ml-service/README.md`). Trong `pipeline/.env` đặt:

```
ML_SERVICE_URL=http://ml-service:8000
ML_SERVICE_API_KEY=<giống bên ml-service>
```

```sh
docker compose --profile ml up -d
```

Ảnh Docker của dịch vụ này nặng vài GB vì chứa PyTorch và PaddlePaddle. Lần đầu đọc ảnh, PaddleOCR tự tải mô hình về.

## Xem lớp nào đang bật

```sh
curl -H "X-API-Key: <khóa>" http://localhost:3001/pipeline/status
```

Kết quả cho biết từng lớp (luật, ML, RAG, LLM, OCR, hàng đợi) đã được cấu hình hay chưa.

## Khi gặp lỗi

| Hiện tượng | Nguyên nhân thường gặp |
| --- | --- |
| Kết quả không có bảng "Điểm theo từng lớp" | Hàm đang chạy chế độ tích hợp sẵn: chưa đặt hai secret, hoặc pipeline không liên lạc được (xem log của hàm) |
| Pipeline trả 401 | `PIPELINE_API_KEY` hai bên khác nhau |
| Pipeline trả 403 | Địa chỉ gọi không nằm trong `PIPELINE_ALLOWED_IPS` |
| Lớp RAG luôn "không có tín hiệu" | Chưa có khóa embedding, chưa chạy `npm run seed`, hoặc nội dung không giống mẫu nào từ 0,75 trở lên |
| Lớp LLM "không có tín hiệu" | `LLM_ENABLED` chưa bật, thiếu khóa, hoặc tên mô hình trong `LLM_MODEL` không còn được cung cấp |
| Dịch vụ ML trả 503 khi phân loại | Chưa đặt `PHOBERT_MODEL` (tiếng Việt) hoặc `DISTILBERT_MODEL` (tiếng Anh). Pipeline bỏ qua lớp này và phân tích tiếp |
| Đổi mô hình embedding xong thì Qdrant báo lỗi kích thước vector | Collection cũ có kích thước khác. Đặt `QDRANT_COLLECTION` sang tên mới rồi nạp lại mẫu |
