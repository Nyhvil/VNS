# VNS – VIỆT NAM SAFE

Công cụ dùng AI để kiểm tra một nội dung đáng ngờ (tin nhắn, email, đường link, ảnh chụp màn hình) có dấu hiệu lừa đảo hay không, trước khi người dùng bấm link, cung cấp thông tin hoặc chuyển tiền.

**Bản đang chạy:** https://vietnamsafe.lovable.app

Người dùng không cần đăng nhập và không cần kiến thức về an ninh mạng: dán nội dung hoặc tải ảnh lên, bấm **Phân Tích Ngay**, rồi nhận về mức rủi ro, điểm lừa đảo và lời giải thích bằng tiếng Việt.

## Tính năng

- Phân tích văn bản dán vào và ảnh chụp màn hình (tin nhắn Zalo, Messenger, SMS, email…).
- Trả về ba mức rủi ro kèm điểm lừa đảo từ 0 đến 100.
- Giải thích lý do, nêu các cụm từ nguy hiểm và đưa lời khuyên cụ thể.
- Hiển thị căn cứ: link nào đáng ngờ và vì sao, tổ chức nào được nhắc tới, mẫu lừa đảo nào khớp.
- Người dùng báo lại kết quả đúng hay sai để nhóm cải thiện hệ thống.
- Trang quản trị (có mật khẩu) xem thống kê lượt quét và phản hồi.

| Mức | Điểm lừa đảo |
| --- | --- |
| SAFE (an toàn) | 0–30 |
| SUSPICIOUS (nghi vấn) | 31–70 |
| SCAM (lừa đảo) | 71–100 |

## Cách hệ thống hoạt động

Mỗi lượt phân tích đi qua sáu bước, tất cả nằm trong hàm `analyze-content`:

1. **Đọc ảnh (nếu có).** Gemini 2.5 Flash trích toàn bộ chữ trong ảnh. Một bước chuẩn hóa sửa các lỗi đọc chữ thường gặp, ví dụ `passw0rd` thành `password`.
2. **Kiểm tra đường link.** Mỗi link được so với danh sách tên miền chính thức, rồi xét năm dấu hiệu: đuôi tên miền đáng ngờ, tên nhái thương hiệu, link rút gọn, tên miền là địa chỉ IP, quá nhiều subdomain.
3. **Đối chiếu tổ chức.** Nội dung được so với danh sách tổ chức thật tại Việt Nam, chia 10 nhóm: ngân hàng, ví điện tử, sàn thương mại điện tử, nhà mạng, cơ quan nhà nước, giao hàng, hàng không, công nghệ, đại học, bệnh viện.
4. **So khớp mẫu lừa đảo.** Nội dung được so với 16 mẫu lừa đảo phổ biến tại Việt Nam (giả ngân hàng xin OTP, giả danh công an, trúng thưởng giả, việc nhẹ lương cao, giả mạo VNeID…). Mỗi mẫu có danh sách từ khóa và độ nguy hiểm riêng.
5. **Phân tích bằng mô hình ngôn ngữ.** Kết quả của ba bước trên được ghép vào prompt cùng nội dung gốc và gửi cho Gemini 3 Flash. Mô hình trả về điểm lừa đảo, lời giải thích, các cụm từ nguy hiểm và lời khuyên.
6. **Xếp mức và lưu.** Điểm được quy ra một trong ba mức ở bảng trên. Lượt quét được lưu vào cơ sở dữ liệu để thống kê.

Ý tưởng cốt lõi: mô hình ngôn ngữ không đánh giá "chay" mà được cung cấp căn cứ đã kiểm tra trước. Ví dụ, nếu nội dung nhắc tới một ngân hàng thật nhưng đường link không thuộc tên miền chính thức của ngân hàng đó, khả năng giả mạo là cao.

## Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Giao diện | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Cơ sở dữ liệu và lưu trữ | PostgreSQL và Storage của Supabase |
| AI | Google Gemini 2.5 Flash (đọc ảnh) và Gemini 3 Flash (phân tích), gọi qua Lovable AI Gateway |
| Dữ liệu tri thức | `verified_entities_2026.json` (tổ chức và tên miền chính thức), `vietnam_scam_patterns.json` (16 mẫu lừa đảo) |
| Kiểm thử | Vitest, Playwright |

## Cấu trúc thư mục

```
src/
  pages/Index.tsx            Trang chính: nhập nội dung, hiện kết quả
  pages/Admin.tsx            Trang quản trị
  components/AnalysisResult.tsx   Hiển thị kết quả và nút phản hồi
  components/ImageUpload.tsx      Tải ảnh lên
  integrations/supabase/     Kết nối Supabase
supabase/
  functions/analyze-content/ Hàm phân tích chính và hai file dữ liệu tri thức
  functions/submit-feedback/ Ghi phản hồi đúng hoặc sai của người dùng
  functions/admin-data/      Số liệu cho trang quản trị
  migrations/                Cấu trúc cơ sở dữ liệu
```

## Chạy trên máy

Cần Node.js 18 trở lên.

```sh
git clone https://github.com/Nyhvil/vietnamsafe.git
cd vietnamsafe
npm install
npm run dev
```

Giao diện đọc ba biến trong file `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` và `VITE_SUPABASE_PROJECT_ID`. Đây là các giá trị công khai của Supabase.

Các hàm backend cần thêm ba biến bí mật, đặt trong phần cấu hình của Supabase và không nằm trong repo:

| Biến | Dùng để |
| --- | --- |
| `LOVABLE_API_KEY` | Gọi mô hình Gemini qua Lovable AI Gateway |
| `SUPABASE_SERVICE_ROLE_KEY` | Ghi dữ liệu vào cơ sở dữ liệu từ hàm backend |
| `ADMIN_PASSWORD` | Mật khẩu trang quản trị |

Lệnh khác: `npm run build` để build, `npm test` để chạy kiểm thử.

## Hạn chế hiện tại

- Điểm lừa đảo do mô hình ngôn ngữ đưa ra nên có thể dao động nhẹ giữa các lần phân tích cùng một nội dung.
- Bộ mẫu lừa đảo còn nhỏ (16 mẫu) và được so khớp theo từ khóa.
- Chưa có đăng nhập người dùng; thống kê dựa trên mã ẩn danh lưu trong trình duyệt.
- Bộ kiểm thử tự động còn rất ít.
- Kết quả chỉ mang tính tham khảo; hệ thống không cam kết phát hiện được mọi hình thức lừa đảo.

## Hướng phát triển

- Mô hình phân loại tiếng Việt (PhoBERT / DistilBERT) chạy trước mô hình ngôn ngữ.
- Cơ sở dữ liệu vector cho các tình huống lừa đảo thực tế, kèm tìm kiếm tương đồng và reranking.
- Đọc mã QR và phân tích sâu nội dung website.
- Tiện ích mở rộng cho trình duyệt.
- API cho doanh nghiệp.

## Nhóm thực hiện

Dự án VNS – VIỆT NAM SAFE, dự thi SSExFIC, lĩnh vực Xã hội và môi trường.

[Điền tên các thành viên và thông tin liên hệ của nhóm]
