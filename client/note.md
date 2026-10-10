
Để admin tự sửa nội dung public page, BE nên làm kiểu “CMS nhỏ” với các bảng chính sau:

users
quản trị viên đăng nhập
role (admin, editor)
pages
mỗi trang public (home, about…)
slug, title, status, published_at
page_sections
từng block trong trang (hero, features, demo…)
page_id, section_key, order_index, is_enabled
section_contents
dữ liệu nội dung linh hoạt dạng JSON
section_id, locale (vi, en), content_json
ví dụ hero: heading, subheading, cta_text, metrics…
media_assets
ảnh/icon upload (Logo, hero image…)
url, alt_text, mime_type, size
content_versions (rất nên có)
lưu lịch sử chỉnh sửa để rollback
section_id, content_json, edited_by, edited_at, version_no
audit_logs
ai sửa gì, lúc nào
phục vụ kiểm soát và bảo mật