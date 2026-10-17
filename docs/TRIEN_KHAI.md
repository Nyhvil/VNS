# Đưa VNS lên máy chủ công khai

Tài liệu này hướng dẫn chạy VNS thành một trang web ai cũng mở được, **không cần Lovable và không cần Supabase**. Chỉ có một máy chủ, lo cả ba việc:

```
                    ┌─────────────────────────── máy chủ VNS ───────────────────────────┐
 trình duyệt  ───►  │  giao diện (React)                                                  │
                    │  /functions/v1/analyze-content, submit-feedback, admin-data, scam-chat │
                    │  pipeline phân tích (luật, RAG, LLM, đọc ảnh, mã QR)                │
                    │  dữ liệu: PostgreSQL (hoặc tệp nếu chưa có PostgreSQL)              │
                    └─────────────────────────────────────────────────────────────────────┘
```

Giao diện giữ nguyên như bản Lovable. Khác biệt duy nhất là nó gọi về chính máy chủ này thay vì gọi Supabase.

Bản này **độc lập với trang `vietnamsafe.lovable.app`**: không sửa gì ở đó, và dữ liệu cũng tách riêng. Số liệu thống kê của trang Lovable vẫn nằm ở Lovable; trang mới bắt đầu đếm từ 0.

## Cần chuẩn bị

| Thứ cần có | Bắt buộc? | Lấy ở đâu | Để làm gì |
| --- | --- | --- | --- |
| Tài khoản Render | Có | https://render.com (đăng nhập bằng GitHub) | Nơi chạy máy chủ, có gói miễn phí |
| Khoá Gemini API | Nên có | https://aistudio.google.com/apikey | Lớp LLM: lời giải thích, chatbot, đọc ảnh bằng AI |
| Chuỗi kết nối PostgreSQL | Nên có | https://neon.tech (miễn phí) hoặc nơi khác | Giữ dữ liệu trang admin khi máy chủ khởi động lại |
| Qdrant Cloud + khoá nhúng văn bản | Tuỳ chọn | https://cloud.qdrant.io | Bật lớp RAG (so khớp mẫu lừa đảo) |

Không có khoá Gemini thì trang vẫn chạy: phân tích bằng bộ luật và kho tri thức, đọc ảnh bằng Tesseract (tiếng Việt và tiếng Anh, có sẵn trong repo). Chatbot sẽ báo "Trợ lý chưa được cấu hình".

Đừng dán khoá hay mật khẩu vào mã nguồn hoặc vào chat. Chỉ nhập chúng vào ô biến môi trường của Render.

## Các bước trên Render

1. Vào https://dashboard.render.com, chọn **New → Blueprint**.
2. Kết nối tài khoản GitHub và chọn repo `Nyhvil/VNS` (repo riêng tư vẫn được, Render sẽ xin quyền đọc).
3. Render đọc tệp `render.yaml` và hỏi hai giá trị:
   - `ADMIN_PASSWORD`: mật khẩu trang `/admin`. Đặt mật khẩu dài, không dùng lại mật khẩu khác.
   - `GEMINI_API_KEY`: khoá Gemini.
4. Bấm **Apply** (hoặc **Deploy Blueprint**). Lần build đầu mất vài phút.
5. Khi trạng thái chuyển sang **Live**, Render cho một địa chỉ dạng `https://vns-xxxx.onrender.com`. Đó là trang công khai.

Kiểm tra nhanh sau khi chạy:

- Mở `https://<địa-chỉ>/pipeline/health`, thấy `{"status":"ok",...}` là máy chủ đã lên.
- Mở trang chủ, dán một tin thử, bấm **Phân Tích Ngay**.
- Mở `https://<địa-chỉ>/admin`, nhập mật khẩu, thấy lượt vừa thử.

Mỗi lần push lên nhánh `main`, Render tự build và chạy lại bản mới.

## Giữ dữ liệu lâu dài (nên làm)

Gói miễn phí của Render không có ổ đĩa cố định. Nếu chưa đặt `DATABASE_URL`, dữ liệu trang admin nằm trong tệp và **mất mỗi lần máy chủ khởi động lại**. Để giữ:

1. Tạo một cơ sở dữ liệu PostgreSQL, ví dụ ở Neon: tạo project, chép **connection string** (dạng `postgresql://user:pass@host/dbname`).
2. Trong Render, mở dịch vụ `vns` → **Environment** → thêm biến `DATABASE_URL`, dán chuỗi đó vào, lưu.
3. Render khởi động lại. Máy chủ tự tạo ba bảng `scans`, `mailguard_logs`, `scan_images`.

Bảng và cột trùng tên với bản Supabase của Lovable, nên trang admin và cách tính thống kê không đổi.

Nếu máy chủ báo lỗi chứng chỉ khi kết nối, xem biến `DATABASE_SSL` ở bảng dưới.

## Bật lớp RAG (tuỳ chọn)

Lớp "So khớp mẫu lừa đảo (RAG)" cần một kho vector và một dịch vụ nhúng văn bản:

1. Tạo cluster miễn phí ở Qdrant Cloud, lấy URL và API key.
2. Thêm các biến sau vào **Environment** của dịch vụ:

   ```
   QDRANT_URL=https://<cluster>.cloud.qdrant.io
   QDRANT_API_KEY=<khoá Qdrant>
   EMBEDDING_API_KEY=<khoá Gemini>
   EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
   EMBEDDING_MODEL=gemini-embedding-2
   EMBEDDING_DIMENSIONS=1536
   ```

3. Nạp 32 tin mẫu tuyển chọn vào kho, chạy một lần từ máy của bạn:

   ```
   cd pipeline
   copy .env.example .env      (điền PIPELINE_API_KEY bất kỳ và sáu biến ở trên)
   npm install
   npm run build
   npm run seed
   ```

Chưa bật thì lớp này hiện "không có tín hiệu" và trọng số của nó được chia cho các lớp còn lại.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `WEB_ENABLED` | `false` | `true` để máy chủ phục vụ giao diện và `/functions/v1/*`. `render.yaml` đã bật sẵn. |
| `ADMIN_PASSWORD` | trống | Mật khẩu trang `/admin`. Để trống thì trang admin đóng. |
| `DATABASE_URL` | trống | Chuỗi kết nối PostgreSQL. Trống thì lưu vào tệp trong `DATA_DIR`. |
| `DATABASE_SSL` | `auto` | `auto`: mã hoá với mọi máy chủ không phải máy này, không kiểm tra chứng chỉ. `verify`: có kiểm tra chứng chỉ. `require`, `disable`. |
| `DATA_DIR` | `./var` | Thư mục lưu tệp khi không có PostgreSQL. |
| `STORE_IMAGES` | `true` | Lưu ảnh người dùng tải lên để trang admin xem lại. Đặt `false` nếu không muốn giữ ảnh. |
| `LLM_ENABLED`, `LLM_PROVIDER`, `GEMINI_API_KEY`, `LLM_MODE` | xem `pipeline/.env.example` | Lớp LLM. `render.yaml` đặt Gemini, chế độ `always`. |
| `TRUSTED_PROXY_HOPS` | `0` | Số máy chủ trung gian đứng trước. Xem mục dưới. |
| `RATE_LIMIT_PER_IP` | `20` | Số lượt phân tích một địa chỉ được gửi trong mỗi cửa sổ. |
| `RATE_LIMIT_WINDOW_MS` | `300000` | Độ dài cửa sổ, tính bằng mili giây (mặc định 5 phút). |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | `60` | Tổng số lượt phân tích và câu hỏi chatbot mỗi phút của mọi người cộng lại. `0` để tắt. |
| `PIPELINE_API_KEY` | bắt buộc | Khoá của API `/pipeline/*`. Trang web không dùng khoá này. |
| `ACCOUNTS_ENABLED` | `true` | Tài khoản, giới hạn lượt mỗi ngày và gói trả phí. `false` để quay về trang không có đăng nhập. |
| `GUEST_DAILY_LIMIT_PER_IP` | `20` | Tổng lượt mỗi ngày của mọi khách chưa đăng nhập dùng chung một địa chỉ IP. |
| `PAYMENT_MODE` | `manual` | `manual`: admin xác nhận từng đơn chuyển khoản. `demo`: người mua tự bấm "Thanh toán thử", chỉ dùng khi thuyết trình. |
| `PAYMENT_BANK_NAME`, `PAYMENT_ACCOUNT_NUMBER`, `PAYMENT_ACCOUNT_NAME` | trống | Tài khoản nhận tiền hiện ở trang thanh toán. |

Các biến còn lại (Qdrant, Redis, dịch vụ ML) giống hệt khi chạy pipeline riêng, xem `pipeline/.env.example`.

## Tài khoản, lượt kiểm tra và gói trả phí

| Ai | Lượt kiểm tra mỗi ngày |
| --- | --- |
| Khách chưa đăng nhập | 5 (đếm theo cookie trình duyệt, kèm trần chung theo địa chỉ IP) |
| Tài khoản Miễn phí | 10 |
| Gói Nâng cao (29.000 VND/tháng) | Không giới hạn |
| Gói Gia đình (109.000 VND/tháng) | Không giới hạn, cho chủ gói và tối đa 4 thành viên |

- Lượt được làm mới lúc 00:00 giờ Việt Nam (UTC+7). Chỉ lượt phân tích thành công mới bị trừ.
- Các trang: `/dang-ky`, `/dang-nhap`, `/bang-gia`, `/thanh-toan/<mã đơn>`, `/tai-khoan`.
- Mật khẩu băm bằng scrypt; phiên đăng nhập là cookie HttpOnly, SameSite=Lax, giữ 30 ngày. Một email nhập sai 10 lần bị khoá 15 phút.
- Thanh toán: người mua chọn gói và số tháng, nhận mã đơn dạng `VNSXXXXXX` và thông tin chuyển khoản. Admin đối chiếu nội dung chuyển khoản trong tab **Thanh toán** của `/admin` rồi bấm **Xác nhận**; gói kích hoạt ngay. Mua lại gói đang dùng thì cộng thêm vào sau ngày hết hạn; mua gói khác thì gói mới tính từ lúc xác nhận.
- Gói doanh nghiệp (AI Agent, Website, ERP) không bán trực tiếp: trang bảng giá có form liên hệ, yêu cầu hiện ở tab **Doanh nghiệp** của `/admin`.
- Tab **Người dùng** của `/admin` cho xem gói, lượt hôm nay, và tặng hoặc thu hồi gói cho một tài khoản.
- Tài khoản lưu cùng nơi với dữ liệu kiểm tra: PostgreSQL nếu có `DATABASE_URL`, ngược lại là tệp `accounts.json` trong `DATA_DIR`.
- Chưa có: đặt lại mật khẩu qua email, đăng nhập Google, thanh toán tự động.

Tính năng tài khoản chỉ có ở bản máy chủ tự chạy. Bản Lovable (Supabase) không đổi.

## Giới hạn tần suất

Trang công khai nghĩa là ai cũng gọi được, mà mỗi lượt phân tích tốn một lượt gọi Gemini. Máy chủ có ba lớp chặn:

- Mỗi địa chỉ chỉ được 20 lượt phân tích trong 5 phút.
- Tất cả mọi người cộng lại không quá 60 lượt mỗi phút.
- Trang admin: mỗi địa chỉ thử mật khẩu tối đa 10 lần trong 10 phút, và tất cả mọi người cộng lại chỉ được nhập sai 30 lần trong 10 phút. Người nhập đúng mật khẩu vẫn vào được.

Để đếm đúng địa chỉ người dùng, máy chủ cần biết có bao nhiêu máy chủ trung gian đứng trước nó (`TRUSTED_PROXY_HOPS`). `render.yaml` đặt là `2`, theo mô tả của người dùng Render về cách Render ghi địa chỉ. **Con số này chưa được kiểm chứng trên Render thật.** Nếu đặt sai, hậu quả là giới hạn theo địa chỉ kém chính xác; giới hạn tổng 60 lượt mỗi phút vẫn có tác dụng. Chạy trên VPS không có máy chủ trung gian thì để `0`.

## Dữ liệu người dùng

Giống bản Lovable, máy chủ lưu nguyên văn nội dung người dùng gửi lên (và ảnh, nếu `STORE_IMAGES=true`) để trang admin xem lại. Ảnh đã lưu mở được bằng đường link dạng `/uploads/<mã ngẫu nhiên>`; ai có link thì xem được. Nếu trang được dùng rộng rãi, nhóm nên ghi rõ điều này trên giao diện, hoặc tắt lưu ảnh.

Trước khi nội dung được gửi cho mô hình AI bên ngoài, pipeline che email, số điện thoại, số căn cước và số thẻ.

## Giới hạn của gói miễn phí

- Dịch vụ tự ngủ khi một lúc không ai truy cập. Người vào đầu tiên sau đó phải đợi khoảng một phút để máy chủ thức dậy. Trước khi thuyết trình, hãy mở trang trước vài phút.
- Bộ nhớ 512 MB. Phân tích văn bản thì thoải mái. Đọc ảnh lớn bằng Tesseract có thể chạm giới hạn; có khoá Gemini thì ảnh được đọc bằng AI trước, Tesseract chỉ là phương án dự phòng.
- Không có ổ đĩa cố định, nên cần `DATABASE_URL` để giữ dữ liệu.

## Chạy thử trên máy mình trước

Cần Node.js 20 trở lên.

```
git clone https://github.com/Nyhvil/VNS.git
cd VNS
npm ci --include=dev
npm run build:all
```

Tạo tệp `pipeline/.env` (chép từ `pipeline/.env.example`), đặt tối thiểu:

```
PIPELINE_API_KEY=<chuỗi bất kỳ>
WEB_ENABLED=true
ADMIN_PASSWORD=<mật khẩu admin>
```

Rồi chạy `npm start` và mở http://localhost:3001.

## Nơi khác ngoài Render

Tệp `Dockerfile` ở thư mục gốc đóng gói cả giao diện lẫn pipeline thành một ảnh, dùng được ở bất kỳ nơi nào chạy Docker (VPS, Railway, Fly.io, Hugging Face Spaces). Gắn một ổ đĩa vào `/data` hoặc đặt `DATABASE_URL` để giữ dữ liệu.

## Nối trang Lovable vào máy chủ này (tuỳ chọn, cần Hùng đồng ý)

Máy chủ công khai này vẫn mở API `/pipeline/*` như pipeline thường. Nếu sau này nhóm muốn trang Lovable cũng dùng pipeline, chỉ cần đặt hai secret cho hàm `analyze-content` bên Lovable: `PIPELINE_URL` là địa chỉ máy chủ này, `PIPELINE_API_KEY` là giá trị Render đã sinh (xem trong mục Environment). Việc này thay đổi trang Lovable nên phải do chủ project quyết định.

## Đã kiểm chứng tới đâu

| Phần | Mức độ |
| --- | --- |
| Lệnh build và lệnh chạy trong `render.yaml` | Chạy thật trên máy thử, từ một bản clone sạch |
| Giao diện, phân tích văn bản và ảnh có mã QR, phản hồi, chatbot, trang admin | Chạy thật qua trình duyệt trên máy thử |
| Lưu dữ liệu bằng tệp và bằng PostgreSQL 16, kể cả kết nối mã hoá | Chạy thật |
| Đọc ảnh tiếng Việt bằng Tesseract | Chạy thật |
| Lớp LLM, chatbot, nhúng văn bản | Chạy với dịch vụ AI giả lập, chưa chạy với khoá Gemini thật |
| Triển khai lên Render (tài khoản thật, `render.yaml` được Render đọc) | Chưa chạy |
| Neon, Qdrant Cloud | Chưa chạy |
| `Dockerfile` | Chưa build bằng Docker; các lệnh bên trong đã chạy thử từng bước |
