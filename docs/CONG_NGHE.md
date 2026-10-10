# Kiến trúc và công nghệ

Tài liệu này mô tả cách hệ thống phân tích một nội dung, và đối chiếu từng công nghệ nêu trong báo cáo công nghệ và hồ sơ dự thi với vị trí của nó trong mã nguồn.

## Hai chế độ chạy

Giao diện và hàm `analyze-content` chạy được theo hai chế độ. Chế độ nào được dùng là do cấu hình, không cần sửa mã.

| | Chế độ tích hợp sẵn | Chế độ pipeline |
| --- | --- | --- |
| Khi nào | Không đặt `PIPELINE_URL`, hoặc pipeline không liên lạc được | Hàm `analyze-content` có hai secret `PIPELINE_URL` và `PIPELINE_API_KEY` |
| Ai phân tích | Chính hàm `analyze-content`: kiểm tra link, tổ chức, mẫu lừa đảo, rồi Gemini cho điểm | Dịch vụ `pipeline/`: nhiều lớp, điểm tính theo công thức |
| Cần thêm gì | Không cần gì ngoài Supabase và Lovable AI | Nơi chạy dịch vụ pipeline; tùy lớp mà cần Qdrant, Redis, khóa OpenAI hoặc Gemini, dịch vụ ML |
| Giao diện hiện | Kết quả, căn cứ, lời khuyên, ô hỏi thêm | Như bên trái, thêm điểm từng lớp, mẫu lừa đảo tương tự, kết quả mô hình phân loại |

Bản tại https://vietnamsafe.lovable.app đang chạy chế độ tích hợp sẵn. Mã trong repo này chạy được cả hai chế độ.

## Luồng xử lý ở chế độ pipeline

```
Người dùng ── giao diện React ── hàm analyze-content (Supabase)
                                        │  X-API-Key
                                        ▼
                                 pipeline (Node.js)
   1. Đọc đầu vào      văn bản │ email đầy đủ (mailparser) │ ảnh (OCR + mã QR)
   2. Che thông tin cá nhân trước khi gửi ra dịch vụ ngoài
   3. Bộ luật          6 luật email/link + 5 luật theo dữ liệu Việt Nam
   4. Mô hình phân loại (dịch vụ ML: PhoBERT tiếng Việt, DistilBERT tiếng Anh)
          ├─ tin cậy từ 90% ──► trả kết quả ngay (đường nhanh)
          └─ thấp hơn ────────► phân tích sâu
   5. RAG              embedding ► Qdrant lấy 20 mẫu ► rerank còn 5
   6. LLM              Gemini hoặc OpenAI, nhận căn cứ từ các bước trên
   7. Chấm điểm        công thức 5 lớp ► mức SAFE / SUSPICIOUS / SCAM
   8. Lưu mẫu          vào Qdrant kèm nhãn, qua hàng đợi BullMQ
```

Yêu cầu phân tích đi qua hàng đợi BullMQ trên Redis khi có `REDIS_URL`; không có thì chạy thẳng trong tiến trình.

## Cách chấm điểm

Điểm rủi ro (0–100) là trung bình có trọng số của năm lớp:

| Lớp | Trọng số | Điểm của lớp là gì | Lớp có tín hiệu khi |
| --- | --- | --- | --- |
| RAG | 35% | Độ giống với mẫu lừa đảo gần nhất, nhân 100 | Có mẫu giống từ 0,75 trở lên |
| Rule | 25% | Mức nặng nhất trong các luật vi phạm (15, 40, 75, 100), cộng 5 cho mỗi vi phạm, tối đa cộng 25 | Có ít nhất một luật vi phạm |
| Header | 20% | SPF hỏng 40, DKIM hỏng 40, người gửi khác địa chỉ trả lời 20 | Email có ít nhất một lỗi trên |
| Image | 10% | Mã QR dẫn tới link đáng ngờ 90, tới tên miền lạ 50, không phải link 30 | Ảnh có mã QR không dẫn về tên miền chính thức |
| LLM | 10% | Điểm mô hình ngôn ngữ đưa ra | Mô hình trả lời được |

Hai quy tắc đi kèm công thức:

1. **Chỉ lớp có tín hiệu mới tham gia.** Trọng số được chuẩn hóa trên các lớp có tín hiệu. Lý do: "không giống mẫu nào" hay "không luật nào vi phạm" không chứng minh nội dung an toàn, nên không được kéo điểm xuống.
2. **Điểm cuối không thấp hơn điểm của LLM.** LLM đọc toàn bộ nội dung cùng căn cứ của các lớp khác. Nếu nó thấy nguy hiểm thì các lớp khác không được làm loãng kết luận đó. Các lớp khác vẫn có thể đẩy điểm lên cao hơn LLM.

Ví dụ: tin giả danh ngân hàng có link nhái, khớp một mẫu đã biết ở mức 0,88, luật cho 100, LLM cho 80. Điểm = (0,35 × 88 + 0,25 × 100 + 0,10 × 80) / 0,70 = 91, mức SCAM.

Ba mức hiển thị cho người dùng: SAFE 0–30, SUSPICIOUS 31–70, SCAM 71–100. Pipeline còn trả bốn mức low / medium / high / critical (ngưỡng 30, 60, 85) cho các hệ thống khác dùng.

### Khác gì so với công thức trong báo cáo ban đầu

Báo cáo mô tả công thức của MailGuard: cộng thẳng năm lớp, lớp nào không có gì thì tính 0 điểm. Chạy thật thì cách đó cho điểm quá thấp: một tin lừa đảo rõ ràng có link dùng địa chỉ IP chỉ được 20/100. Ba điểm đã đổi:

- Thêm quy tắc "chỉ lớp có tín hiệu mới tham gia" (quy tắc 1 ở trên).
- Thêm sàn LLM (quy tắc 2 ở trên).
- Điểm lớp Image trước đây là độ rõ của ảnh khi đọc chữ, tức ảnh càng rõ càng bị cộng điểm rủi ro. Nay là rủi ro của mã QR trong ảnh.

Trọng số 35 / 25 / 20 / 10 / 10 giữ nguyên.

## Kho mẫu lừa đảo

- Bộ mẫu ban đầu: 32 tin nhắn do nhóm soạn theo 16 hình thức lừa đảo, nạp bằng `npm run seed`.
- Mỗi nội dung đã phân tích được lưu lại kèm nhãn kết luận. Khi so khớp, hệ thống chỉ tìm trong các mẫu nhãn `phishing`.
- Một nội dung chỉ được nhãn `phishing` khi có luật mức cao xác nhận. Nội dung bị coi là lừa đảo chỉ vì giống mẫu có sẵn, hoặc chỉ do mô hình phân loại, được lưu dưới nhãn khác và không dùng để so sánh. Nhờ vậy kho mẫu không bị lệch dần.
- Thông tin cá nhân (email, số điện thoại, số CCCD, số thẻ) được che trước khi tạo embedding và trước khi lưu.
- Người dùng chỉ được xem nội dung của các mẫu do nhóm soạn. Mẫu học từ nội dung người khác gửi có tham gia chấm điểm nhưng không hiển thị cho ai.

## Đối chiếu công nghệ

Cột "Đã kiểm chứng thế nào" ghi đúng mức đã thử tại thời điểm viết mã:

- **Chạy thật**: đã chạy với chính công nghệ đó.
- **Giả lập**: mã đã chạy trọn luồng, nhưng dịch vụ bên ngoài được thay bằng máy chủ giả lập cùng giao thức, vì không có khóa API hoặc máy thử không tải được mô hình.
- **Chưa chạy**: đã viết mã và có test cho phần xử lý, nhưng chưa chạy được với công nghệ thật.

### Công nghệ trong hồ sơ dự thi

| Công nghệ trong hồ sơ | Ở đâu trong mã | Đã kiểm chứng thế nào |
| --- | --- | --- |
| Gemini (hồ sơ ghi 1.5 Flash) | Chế độ tích hợp sẵn: `supabase/functions/analyze-content`. Pipeline: `LLM_PROVIDER=gemini`, `pipeline/src/llm` | Chế độ tích hợp sẵn chạy thật trên Lovable. Pipeline gọi Gemini: giả lập. Google không còn cung cấp bản 1.5 Flash, nên mặc định là `gemini-3.8-flash`, đổi được bằng `LLM_MODEL` |
| PaddleOCR | `ml-service/app/ocr.py`, gọi từ `pipeline/src/parser/ocr-processor.ts` | Chưa chạy: máy thử không tải được mô hình PaddleOCR. Đã chạy thật phần chuyển sang công cụ đọc ảnh kế tiếp khi PaddleOCR lỗi |
| Mail-parser | `pipeline/src/parser/email-parser.ts` (thư viện `mailparser`) | Chạy thật: dán nguyên email có tiêu đề, hệ thống tự nhận ra và kiểm tra SPF, DKIM |
| PhoBERT / DistilBERT | `ml-service/app/classifier.py`, huấn luyện bằng `ml-service/train/` | Chưa chạy với PhoBERT: máy thử không tải được mô hình gốc, và nhóm chưa có mô hình đã huấn luyện. Phần nạp mô hình, tách từ tiếng Việt và script huấn luyện đã chạy thật với một mô hình BERT thử nghiệm rất nhỏ |
| Luồng lai: tin cậy trên 90% thì trả ngay | `pipeline/src/orchestrator/analysis-orchestrator.ts` | Chạy thật với mô hình thử nghiệm nói trên, hạ ngưỡng xuống 0,7 để kích hoạt |
| Qdrant Cloud | `pipeline/src/rag/qdrant-client.ts` | Chạy thật với Qdrant 1.17 cài tại máy. Qdrant Cloud dùng cùng API nhưng chưa thử trực tiếp |
| RAG | `pipeline/src/rag/` | Chạy thật phần Qdrant; embedding là giả lập |
| Reranking | `pipeline/src/rag/reranker.ts` | Chạy thật. Đây là rerank kết hợp độ giống vector với số từ trùng, chưa phải mô hình rerank riêng |
| Chatbot RAG + LLM | `pipeline/src/chat/`, `supabase/functions/scam-chat`, `src/components/ScamChat.tsx` | Chạy thật phần truy xuất; LLM là giả lập |
| ReactJS | `src/` (React 18, Vite) | Chạy thật |
| Next.js | Không dùng | Giao diện đang chạy là React + Vite do Lovable dựng; không cần thêm một giao diện thứ hai |
| Node.js | `pipeline/` | Chạy thật |
| FastAPI | `ml-service/` | Chạy thật |
| PostgreSQL | Supabase | Chạy thật trên Lovable; ở máy thử thay bằng máy chủ giả lập |
| Redis | `pipeline/src/queue/redis.ts`, `pipeline/src/cache/shared-cache.ts` | Chạy thật với Redis 7 |
| Redis / BullMQ | `pipeline/src/queue/analysis-queue.ts` | Chạy thật |
| Đầu vào: văn bản, email, link, ảnh chụp màn hình | Pipeline và hàm `analyze-content` | Chạy thật |
| Đầu vào: mã QR | `pipeline/src/parser/qr-decoder.ts` | Chạy thật |
| Đầu ra: Scam / Suspicious / Safe, Risk Score, giải thích | `pipeline/src/scoring/` | Chạy thật |
| Phân tích nội dung website | Chưa có | Hệ thống chỉ xét địa chỉ link, không mở trang ra đọc |
| Community Scam Database | Một phần | Có kho mẫu tự lớn dần từ nội dung đã phân tích. Chưa có chức năng cho cộng đồng gửi báo cáo |
| Browser Extension, API cho doanh nghiệp | Chưa có | Hướng phát triển |

### Công nghệ trong báo cáo công nghệ (kiến trúc MailGuard)

| Công nghệ trong báo cáo | Ở đâu trong mã | Đã kiểm chứng thế nào |
| --- | --- | --- |
| Pipeline Node.js + TypeScript + Express, kiểm tra đầu vào bằng zod | `pipeline/src/main.ts`, `pipeline/src/http/` | Chạy thật |
| Công thức 5 lớp 35/25/20/10/10 | `pipeline/src/scoring/` | Chạy thật, có ba điểm đổi nêu ở trên |
| Bốn mức LOW / MEDIUM / HIGH / CRITICAL | `pipeline/src/scoring/risk-level-mapper.ts` | Chạy thật; giao diện dùng ba mức |
| Sáu luật (SPF, DKIM, lệch tên miền, link IP, link rút gọn, từ khóa) | `pipeline/src/rules/` | Chạy thật, thêm năm luật theo dữ liệu Việt Nam |
| OpenAI: gpt-4o-mini, text-embedding-3-small | `LLM_PROVIDER=openai`, `pipeline/src/rag/embedding-client.ts` | Giả lập |
| Tesseract | `pipeline/src/parser/ocr-processor.ts` | Chạy thật (đọc ảnh chữ tiếng Anh; chưa có dữ liệu tiếng Việt) |
| Qdrant: lấy 5 mẫu, ngưỡng 0,75 | `pipeline/src/rag/` | Chạy thật, nay lấy 20 mẫu rồi rerank còn 5 |
| LLM chỉ gọi khi điểm sơ bộ từ 15 đến dưới 75 | `LLM_MODE=gray_zone` | Chạy thật. Với VNS nên đặt `LLM_MODE=always` để luôn có lời giải thích |
| Bộ nhớ đệm 5 phút, bộ nhớ đệm OCR 24 giờ | `pipeline/src/cache/` | Chạy thật, có thêm lựa chọn lưu trên Redis |
| Giới hạn thời gian 30 giây cho pipeline, 10 giây cho LLM | `pipeline/src/config/config.ts` | Chạy thật |
| Khóa `X-API-Key`, danh sách IP được phép | `pipeline/src/http/middleware/` | Chạy thật |
| Che thông tin cá nhân trước khi gửi LLM | `pipeline/src/llm/pii-sanitizer.ts` | Chạy thật, thêm số điện thoại và CCCD Việt Nam, áp dụng cả trước khi tạo embedding |
| Giao diện Next.js | Không mang sang | Giao diện React của bản đang chạy đảm nhiệm |
| Máy chủ NestJS, đăng nhập JWT, bcrypt | Không mang sang | Supabase đảm nhiệm phần lưu trữ và API; bản đang chạy không yêu cầu đăng nhập |

## Giới hạn cần biết

- **Chưa có mô hình PhoBERT.** Lớp phân loại chỉ hoạt động khi nhóm huấn luyện xong một mô hình. 32 mẫu soạn sẵn cộng vài trăm lượt quét là quá ít; `ml-service/README.md` nói rõ cần gì.
- **Chưa thử với khóa thật.** OpenAI, Gemini (qua pipeline) và Qdrant Cloud đều chưa được gọi thật. Lần đầu cấu hình cần thử lại từng lớp.
- **Rerank còn đơn giản**, chưa dùng mô hình rerank chuyên dụng.
- **Kho mẫu ban đầu nhỏ** (32 mẫu), nên lớp RAG chỉ nhận ra những tin giống các mẫu này.
- **Các hàm vẫn mở cho mọi người gọi**, chưa giới hạn số lượt. Thêm chatbot nghĩa là thêm một đường gọi LLM tốn phí.
- **Kết quả chỉ mang tính tham khảo.** Hệ thống không cam kết phát hiện được mọi hình thức lừa đảo.
