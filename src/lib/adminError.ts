/** Tell a wrong password apart from a server or connection problem. */
export function describeAdminError(status: number | null): string {
  if (status === 401) return "Sai mật khẩu.";
  if (status === 429) return "Thử quá nhiều lần, vui lòng đợi một lát rồi thử lại.";
  if (status === null) return "Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.";
  return `Máy chủ gặp lỗi (mã ${status}), không phải do mật khẩu. Vui lòng thử lại sau.`;
}
