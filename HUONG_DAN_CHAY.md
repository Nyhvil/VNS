# Hướng dẫn chạy trên máy

Dự án có ba phần chạy riêng: `server` (API, cổng 5000), `pipeline` (phân tích, cổng 3001) và `client` (giao diện, cổng 3000). Ngoài ra cần hai cơ sở dữ liệu: PostgreSQL (có pgvector) và Qdrant.

## Cần có

- Node.js 20 trở lên.
- Docker Desktop, để chạy PostgreSQL và Qdrant. Nếu đã có sẵn hai cơ sở dữ liệu này ở nơi khác (ví dụ Supabase và Qdrant Cloud) thì bỏ qua bước 1 và điền địa chỉ của chúng vào file `.env`.
- Khóa API của OpenAI. Không bắt buộc: thiếu khóa thì hệ thống vẫn chạy, nhưng chỉ còn lớp luật và lớp kiểm tra tiêu đề email. Lớp so khớp mẫu lừa đảo và lớp LLM sẽ không hoạt động.

Trên Windows, thay `cp` bằng `copy`.

## 1. Bật hai cơ sở dữ liệu

```bash
docker compose up -d
```

## 2. Server

```bash
cd server
npm install
cp .env.example .env
```

Mở `server/.env`, điền `JWT_SECRET` và `PIPELINE_API_KEY` (hai chuỗi ngẫu nhiên bất kỳ; trong file có sẵn lệnh tạo). Sau đó:

```bash
npm run db:init
npm run build
npm run start:prod
```

`npm run db:init` tạo toàn bộ bảng và nội dung trang chủ mặc định. Lệnh này chạy lại nhiều lần được.

Kiểm tra: mở http://localhost:5000/api/docs.

## 3. Pipeline

Mở một cửa sổ dòng lệnh khác:

```bash
cd pipeline
npm install
cp .env.example .env
```

Mở `pipeline/.env`, điền `PIPELINE_API_KEY` **giống hệt** giá trị trong `server/.env`, và điền `OPENAI_API_KEY` nếu có. Sau đó:

```bash
npm run build
npm start
```

Kiểm tra: mở http://localhost:3001/pipeline/health, thấy `"status":"ok"` là được. Collection trong Qdrant được tạo tự động ở lần phân tích đầu tiên.

## 4. Client

Mở một cửa sổ dòng lệnh khác:

```bash
cd client
npm install
cp .env.example .env.local
npm run build
npm start
```

Mở http://localhost:3000, bấm **Đăng ký** để tạo tài khoản, rồi dán nội dung cần kiểm tra vào trang Dashboard và bấm **Phân tích ngay**.

## Khi gặp lỗi

| Hiện tượng | Nguyên nhân thường gặp |
| --- | --- |
| `The server does not support SSL connections` | PostgreSQL chạy trên máy không có SSL. Thêm `DATABASE_SSL=false` vào `server/.env`. |
| Phân tích báo `Pipeline analysis failed ... status=401` | `PIPELINE_API_KEY` ở `server/.env` và `pipeline/.env` khác nhau. |
| Phân tích báo `Pipeline analysis failed ... ECONNREFUSED` | Pipeline chưa chạy, hoặc `PIPELINE_URL` sai cổng. |
| Trang web báo lỗi mạng khi đăng nhập | `NEXT_PUBLIC_API_URL` trong `client/.env.local` không trỏ đúng cổng của server. Đổi xong phải `npm run build` lại. |
| Điểm "tương đồng với mẫu lừa đảo" luôn bằng 0 | Chưa điền `OPENAI_API_KEY`, hoặc kho mẫu trong Qdrant còn trống (xem bên dưới). |

## Kho mẫu lừa đảo hoạt động thế nào

Mọi nội dung đã phân tích đều được lưu vào Qdrant kèm nhãn kết luận của nó (`safe`, `suspicious`, `spam`, `phishing`). Khi phân tích nội dung mới, hệ thống chỉ so với các mẫu mang nhãn `phishing`.

Một nội dung chỉ được gắn nhãn `phishing` khi có luật mức cao xác nhận (SPF hoặc DKIM thất bại, link dùng địa chỉ IP). Nội dung bị coi là lừa đảo chỉ vì giống một mẫu có sẵn được lưu với nhãn `phishing_similar` và không dùng để so sánh, để kho mẫu không bị lệch dần.

Trên một bản cài mới, kho mẫu trống, nên lớp này chưa đóng góp điểm cho tới khi hệ thống gặp những nội dung lừa đảo đầu tiên.
