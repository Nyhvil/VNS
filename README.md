# VNS – VIỆT NAM SAFE

Công cụ dùng AI để kiểm tra một nội dung đáng ngờ (tin nhắn, email, đường link, ảnh chụp màn hình) có dấu hiệu lừa đảo hay không, trước khi người dùng bấm link, cung cấp thông tin hoặc chuyển tiền.

**Bản đang chạy:** https://vietnamsafe.lovable.app

Người dùng không cần đăng nhập và không cần kiến thức về an ninh mạng: dán nội dung hoặc tải ảnh lên, bấm **Phân Tích Ngay**, rồi nhận về mức rủi ro, điểm lừa đảo và lời giải thích bằng tiếng Việt.

## Vì sao cần VNS

Theo khảo sát của [Hiệp hội An ninh mạng Quốc gia (NCA)](https://nhandan.vn/nca-nam-2024-uoc-tinh-nguoi-viet-mat-18900-ty-dong-do-lua-dao-truc-tuyen-post850801.html), năm 2024 người Việt mất khoảng 18.900 tỷ đồng vì lừa đảo trực tuyến, và cứ 220 người dùng điện thoại thông minh thì có 1 người là nạn nhân.

Cảnh báo về lừa đảo có rất nhiều, nhưng lúc nhận được một tin nhắn lạ, người dùng phổ thông vẫn khó tự trả lời câu hỏi: "Tôi có nên tin và làm theo nội dung này không?". Tự kiểm tra thì mất thời gian và cần kiến thức về an toàn thông tin.

VNS giải quyết đúng thời điểm đó, với ba khác biệt:

- **Kiểm tra trước khi hành động.** Người dùng hỏi VNS trước khi bấm link, cung cấp thông tin hoặc chuyển tiền, thay vì phát hiện sau khi đã mất tiền.
- **Nhìn vào nội dung, không chỉ đường link.** Hệ thống xét cả lời lẽ thúc ép, tổ chức bị giả danh và yêu cầu cung cấp thông tin, thay vì chỉ so link với danh sách đen.
- **Giải thích vì sao.** Kết quả nêu rõ dấu hiệu nào đáng ngờ, để người dùng dần tự nhận ra lừa đảo.

Mục tiêu dài hạn của dự án là "Protect citizens in cyberspace": hình thành thói quen kiểm tra trước khi tin.

## Dành cho ai

- Sinh viên và người trẻ, thường gặp tin tuyển dụng, việc làm thêm, học bổng và link không rõ nguồn gốc.
- Nhân viên văn phòng và người hay giao dịch trực tuyến, thường nhận email hoặc tin nhắn giả danh ngân hàng, đối tác, cơ quan nhà nước.
- Người trung niên và người lớn tuổi, cần một công cụ đơn giản, không đòi hỏi kiến thức kỹ thuật.
- Về sau: doanh nghiệp và hộ kinh doanh cần kiểm tra lượng lớn email, tin nhắn.

VNS miễn phí cho người dùng cá nhân và hoạt động theo mô hình phi lợi nhuận.

## Tính năng

- Phân tích văn bản dán vào và ảnh chụp màn hình (tin nhắn Zalo, Messenger, SMS, email…).
- Trả về ba mức rủi ro kèm điểm lừa đảo từ 0 đến 100.
- Giải thích lý do, nêu các cụm từ nguy hiểm và đưa lời khuyên cụ thể.
- Hiển thị căn cứ: link nào đáng ngờ và vì sao, tổ chức nào được nhắc tới, mẫu lừa đảo nào khớp.
- Ô "Hỏi thêm về kết quả này": trợ lý AI trả lời câu hỏi tiếp theo của người dùng về nội dung vừa kiểm tra.
- Người dùng báo lại kết quả đúng hay sai để nhóm cải thiện hệ thống.
- Trang quản trị (có mật khẩu) xem thống kê lượt quét và phản hồi.
- Khi bật pipeline: đọc mã QR trong ảnh, kiểm tra tiêu đề email (SPF, DKIM), hiện điểm của từng lớp phân tích và mẫu lừa đảo tương tự.

| Mức | Điểm lừa đảo |
| --- | --- |
| SAFE (an toàn) | 0–30 |
| SUSPICIOUS (nghi vấn) | 31–70 |
| SCAM (lừa đảo) | 71–100 |

## Cách hệ thống hoạt động

Hệ thống có hai chế độ. Chế độ nào chạy là do cấu hình, không phải sửa mã.

### Chế độ tích hợp sẵn

Đây là chế độ bản tại vietnamsafe.lovable.app đang chạy. Mọi việc nằm trong hàm `analyze-content`:

1. **Đọc ảnh (nếu có).** Gemini 2.5 Flash trích toàn bộ chữ trong ảnh. Một bước chuẩn hóa sửa các lỗi đọc chữ thường gặp, ví dụ `passw0rd` thành `password`.
2. **Kiểm tra đường link.** Mỗi link được so với danh sách tên miền chính thức, rồi xét năm dấu hiệu: đuôi tên miền đáng ngờ, tên nhái thương hiệu, link rút gọn, tên miền là địa chỉ IP, quá nhiều subdomain.
3. **Đối chiếu tổ chức.** Nội dung được so với danh sách tổ chức thật tại Việt Nam, chia 10 nhóm: ngân hàng, ví điện tử, sàn thương mại điện tử, nhà mạng, cơ quan nhà nước, giao hàng, hàng không, công nghệ, đại học, bệnh viện.
4. **So khớp mẫu lừa đảo.** Nội dung được so với 16 mẫu lừa đảo phổ biến tại Việt Nam (giả ngân hàng xin OTP, giả danh công an, trúng thưởng giả, việc nhẹ lương cao, giả mạo VNeID…).
5. **Phân tích bằng mô hình ngôn ngữ.** Kết quả ba bước trên được gửi cùng nội dung gốc cho Gemini 3 Flash. Mô hình trả về điểm lừa đảo, lời giải thích, các cụm từ nguy hiểm và lời khuyên.
6. **Xếp mức và lưu.** Điểm được quy ra một trong ba mức. Lượt quét được lưu vào cơ sở dữ liệu để thống kê.

### Chế độ pipeline

Khi hàm `analyze-content` được cấu hình địa chỉ của dịch vụ `pipeline/`, nội dung đi qua một quy trình nhiều lớp:

1. **Đọc đầu vào**: văn bản, email đầy đủ (mail-parser), hoặc ảnh (PaddleOCR, rồi mô hình thị giác, rồi Tesseract; kèm đọc mã QR).
2. **Bộ luật**: 11 luật, gồm kiểm tra SPF/DKIM của email và các luật dựa trên dữ liệu Việt Nam ở trên.
3. **Mô hình phân loại** PhoBERT (tiếng Việt) hoặc DistilBERT (tiếng Anh). Nếu mô hình tin cậy từ 90% trở lên, kết quả được trả ngay.
4. **RAG**: tìm các mẫu lừa đảo giống nhất trong Qdrant, rồi rerank.
5. **LLM** (Gemini hoặc OpenAI) đánh giá nội dung dựa trên căn cứ của các lớp trước.
6. **Chấm điểm** theo công thức năm lớp: RAG 35%, luật 25%, tiêu đề email 20%, ảnh 10%, LLM 10%.

Yêu cầu được xếp hàng bằng BullMQ trên Redis. Nếu pipeline không liên lạc được, hàm tự quay về chế độ tích hợp sẵn.

Chi tiết, cách chấm điểm và bảng đối chiếu từng công nghệ: [docs/CONG_NGHE.md](docs/CONG_NGHE.md).

Ý tưởng chung của cả hai chế độ: mô hình ngôn ngữ không đánh giá "chay" mà được cung cấp căn cứ đã kiểm tra trước. Ví dụ, nếu nội dung nhắc tới một ngân hàng thật nhưng đường link không thuộc tên miền chính thức của ngân hàng đó, khả năng giả mạo là cao.

## Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Giao diện | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend của giao diện | Supabase Edge Functions (Deno) |
| Cơ sở dữ liệu và lưu trữ | PostgreSQL và Storage của Supabase |
| AI ở chế độ tích hợp sẵn | Google Gemini 2.5 Flash (đọc ảnh) và Gemini 3 Flash (phân tích), gọi qua Lovable AI Gateway |
| Pipeline | Node.js, TypeScript, Express, zod, mailparser, tesseract.js, jsQR |
| Mô hình phân loại và OCR | Dịch vụ FastAPI: PhoBERT / DistilBERT (transformers), PaddleOCR |
| RAG | Qdrant (dùng được Qdrant Cloud), embedding của OpenAI hoặc Gemini, rerank |
| LLM của pipeline | Gemini hoặc OpenAI |
| Hàng đợi và bộ nhớ đệm | Redis, BullMQ |
| Dữ liệu tri thức | `verified_entities_2026.json` (tổ chức và tên miền chính thức), `vietnam_scam_patterns.json` (16 mẫu lừa đảo), 32 mẫu tin lừa đảo soạn sẵn |
| Kiểm thử | Vitest, Playwright, Jest, pytest |

Không phải mọi thứ trong bảng đều đã chạy với dịch vụ thật: chưa có mô hình PhoBERT đã huấn luyện, và các khóa OpenAI, Gemini, Qdrant Cloud chưa được thử. [docs/CONG_NGHE.md](docs/CONG_NGHE.md) ghi rõ từng mục đã kiểm chứng tới đâu.

## Kết quả thử nghiệm

Nhóm bắt đầu nghiên cứu từ tháng 12/2025 và đưa bản demo ra thử nghiệm thực tế từ tháng 4/2026. Số liệu tại thời điểm lập hồ sơ dự thi, lấy từ trang quản trị (bản chạy chế độ tích hợp sẵn):

| Chỉ số | Kết quả |
| --- | --- |
| Người dùng (đếm theo mã ẩn danh của trình duyệt) | 295 |
| Lượt kiểm tra | 586 |
| Số ký tự nội dung đã xử lý | 338.790 |
| Phản hồi của người dùng về kết quả | 74 đúng, 4 sai |

## Cấu trúc thư mục

```
src/                           Giao diện React
  pages/Index.tsx              Trang chính: nhập nội dung, hiện kết quả
  pages/Admin.tsx              Trang quản trị
  components/AnalysisResult.tsx  Hiển thị kết quả và nút phản hồi
  components/LayerBreakdown.tsx  Điểm từng lớp (chế độ pipeline)
  components/ScamChat.tsx      Ô hỏi thêm
supabase/
  functions/analyze-content/   Hàm phân tích: gọi pipeline hoặc tự phân tích
  functions/scam-chat/         Hàm trả lời câu hỏi thêm
  functions/submit-feedback/   Ghi phản hồi đúng hoặc sai của người dùng
  functions/admin-data/        Số liệu cho trang quản trị
  migrations/                  Cấu trúc cơ sở dữ liệu
pipeline/                      Dịch vụ phân tích nhiều lớp (Node.js)
ml-service/                    Dịch vụ PhoBERT / DistilBERT và PaddleOCR (FastAPI)
docs/                          Kiến trúc, đối chiếu công nghệ, hướng dẫn chạy
docker-compose.yml             Qdrant, Redis, pipeline, dịch vụ ML
```

## Chạy trên máy

Chạy giao diện, cần Node.js 18 trở lên:

```sh
git clone https://github.com/Nyhvil/VNS.git
cd VNS
npm install
npm run dev
```

Giao diện đọc ba biến trong file `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` và `VITE_SUPABASE_PROJECT_ID`. Đây là các giá trị công khai của Supabase.

Các hàm backend dùng các biến bí mật sau, đặt trong phần cấu hình của Supabase và không nằm trong repo:

| Biến | Dùng để |
| --- | --- |
| `LOVABLE_API_KEY` | Gọi mô hình Gemini qua Lovable AI Gateway |
| `SUPABASE_SERVICE_ROLE_KEY` | Ghi dữ liệu vào cơ sở dữ liệu từ hàm backend |
| `ADMIN_PASSWORD` | Mật khẩu trang quản trị |
| `PIPELINE_URL`, `PIPELINE_API_KEY` | Không bắt buộc. Có hai biến này thì hệ thống chạy chế độ pipeline |

Chạy pipeline và dịch vụ ML: xem [docs/HUONG_DAN_CHAY.md](docs/HUONG_DAN_CHAY.md).

Lệnh khác: `npm run build` để build, `npm test` để chạy kiểm thử của giao diện.

## Hạn chế hiện tại

- Bản đang chạy công khai vẫn ở chế độ tích hợp sẵn; chế độ pipeline cần nơi triển khai và các khóa dịch vụ.
- Chưa có mô hình PhoBERT đã huấn luyện, nên lớp phân loại chưa hoạt động cho tới khi nhóm có đủ dữ liệu gán nhãn.
- Kho mẫu lừa đảo ban đầu nhỏ (16 hình thức, 32 mẫu tin).
- Chưa có đăng nhập người dùng; thống kê dựa trên mã ẩn danh lưu trong trình duyệt. Các hàm chưa giới hạn số lượt gọi.
- Hệ thống chỉ xét địa chỉ link, chưa mở trang web ra đọc nội dung.
- Kết quả chỉ mang tính tham khảo; hệ thống không cam kết phát hiện được mọi hình thức lừa đảo.

## Hướng phát triển

- Thu thập và gán nhãn dữ liệu để huấn luyện mô hình PhoBERT.
- Mở rộng kho mẫu lừa đảo, thêm chức năng cho cộng đồng gửi báo cáo, có kiểm duyệt.
- Phân tích nội dung website mà link dẫn tới.
- Thông báo rõ cho người dùng về mục đích thu thập và sử dụng dữ liệu.
- Giới hạn số lượt gọi các hàm phân tích và trợ lý.
- Tiện ích mở rộng cho trình duyệt.
- API cho doanh nghiệp.

## Nhóm thực hiện

Dự án VNS – VIỆT NAM SAFE, dự thi cuộc thi GenD.

| Thành viên | Đơn vị |
| --- | --- |
| Nguyễn Tiến Hùng (trưởng nhóm) | Trường ĐH Văn Lang |
| Nguyễn Ngọc Hà | Trường ĐH Kinh Tế |
| Nguyễn Thị Thuỳ Trang | Trường ĐH Kinh Tế |
| Huỳnh Hoàng Quân | Trường ĐH Kinh Tế |
| Lý Trí Vĩnh | Trường ĐH Công Nghệ Kỹ Thuật |
