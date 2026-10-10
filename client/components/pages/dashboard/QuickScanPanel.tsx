import AnalyzeWorkbench from "@/components/pages/scan/AnalyzeWorkbench";

export default function QuickScanPanel() {
  return (
    <section className="mg-panel-enter overflow-hidden rounded-[32px] border border-white/70 bg-white/[0.94] shadow-[0_18px_40px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="border-b border-[#e9eef5] px-6 py-5 sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#45668f]">
              Quick scan
            </span>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.05em] text-[#0f172a] sm:text-[1.95rem]">
              Quét nhanh ngay trong dashboard
            </h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#5d6979]">
              Dán nội dung, thêm screenshot nếu cần OCR và xem kết quả ngay bên dưới mà không đổi
              luồng làm việc.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickChip label="Text + ảnh" />
            <QuickChip label="OCR server" />
            <QuickChip label="Kết quả server" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-7 sm:py-7">
        <AnalyzeWorkbench
          variant="dashboard"
          placeholder="Dán email, tin nhắn, nội dung cảnh báo hoặc chọn screenshot để MailGuard gửi lên server rồi chấm rủi ro..."
          submitLabel="Phân tích ngay"
          resultModalTitle="Quick Scan Result"
          resultModalDescription="Kết quả được hiển thị ngay trong dashboard để bạn so nguồn vào, nội dung OCR và verdict trong cùng một màn."
        />
      </div>
    </section>
  );
}

function QuickChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#dce6f2] bg-[#f8fbff] px-3 py-2 text-[0.84rem] font-semibold text-[#41576f]">
      {label}
    </span>
  );
}
