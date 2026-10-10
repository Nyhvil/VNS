export const analyzeResultListContent = {
  eyebrow: "Analysis archive",
  title: "Kết quả phân tích",
  description:
    "Tập hợp tất cả lần quét để bạn xem nhanh kết quả, mức độ rủi ro và mở chi tiết từng bản phân tích khi cần.",
  stats: [
    {
      key: "total",
      label: "Tổng kết quả",
      helper: "Lịch sử phân tích đã lưu",
    },
    {
      key: "danger",
      label: "Nguy hiểm cao",
      helper: "Cần ưu tiên kiểm tra",
    },
    {
      key: "warning",
      label: "Đáng ngờ",
      helper: "Nên xác minh thêm",
    },
    {
      key: "safe",
      label: "An toàn",
      helper: "Không có dấu hiệu lớn",
    },
  ] as const,
};
