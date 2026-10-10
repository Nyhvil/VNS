export default function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-[#d8d8d8] bg-[#f7f7f7]">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold">MailGuard</p>
            <p className="mt-3 text-xs leading-6 text-[var(--mg-on-surface-muted)]">
              Công cụ phát hiện email lừa đảo bằng AI, thiết kế riêng cho người dùng Việt Nam.
              Bảo vệ bạn trước phishing và gian lận.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em]">Product</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--mg-on-surface-muted)]">
              <li>Tính năng</li>
              <li>Demo</li>
              <li>Cách hoạt động</li>
              <li>Truy cập API</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em]">Company</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--mg-on-surface-muted)]">
              <li>Về chúng tôi</li>
              <li>Liên hệ</li>
              <li>Blog</li>
              <li>Tuyển dụng</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em]">Legal</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--mg-on-surface-muted)]">
              <li>Chính sách quyền riêng tư</li>
              <li>Điều khoản dịch vụ</li>
              <li>Chính sách cookie</li>
            </ul>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-1 text-[11px] text-[var(--mg-on-surface-soft)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 MailGuard. Đã đăng ký mọi quyền.</p>
          <p>Được tạo ra với tình yêu tại Việt Nam.</p>
        </div>
      </div>
    </footer>
  );
}
