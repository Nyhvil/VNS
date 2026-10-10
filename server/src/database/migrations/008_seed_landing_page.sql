-- ============================================================
-- Migration: default landing page content
--
-- The public home page ("/") is built from public_pages / public_sections.
-- A fresh database has no rows there, so the home page only showed
-- "Không tìm thấy public page." This adds a minimal landing page.
--
-- Safe to run again, and it never touches a landing page that already has
-- sections (for example one edited by the team).
-- ============================================================

INSERT INTO public_pages (slug, name, status)
VALUES ('landing_page', 'Trang chủ', 'published')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public_sections (page_id, key, type, title, subtitle, content, order_index)
SELECT
  p.id,
  v.key,
  v.type::public_section_type,
  v.title,
  v.subtitle,
  v.content::jsonb,
  v.order_index
FROM public_pages p
CROSS JOIN (
  VALUES
    (
      'hero',
      'hero',
      'Kiểm tra email và tin nhắn đáng ngờ trước khi tin',
      'Dán nội dung hoặc tải ảnh chụp màn hình lên. Hệ thống chấm điểm rủi ro và chỉ ra những dấu hiệu lừa đảo tìm thấy.',
      '{"badge": "VNS – VIỆT NAM SAFE", "primaryCtaLabel": "Dùng thử ngay", "primaryCtaHref": "/register", "secondaryCtaLabel": "Đăng nhập", "secondaryCtaHref": "/login", "trustItems": ["Không cần cài đặt", "Miễn phí", "Có giải thích lý do"]}',
      0
    ),
    (
      'start',
      'cta',
      'Kiểm tra trước khi tin',
      'Tạo tài khoản để bắt đầu kiểm tra email, tin nhắn và ảnh chụp màn hình đáng ngờ.',
      '{"ctaLabel": "Tạo tài khoản", "ctaHref": "/register", "ctaSecondaryLabel": "Đăng nhập", "ctaSecondaryHref": "/login", "ctaSmallNote": "Miễn phí · Không cần cài đặt"}',
      1
    )
) AS v(key, type, title, subtitle, content, order_index)
WHERE p.slug = 'landing_page'
  AND NOT EXISTS (
    SELECT 1 FROM public_sections s WHERE s.page_id = p.id
  );
