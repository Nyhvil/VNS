export type AuthFormChipTone = "amber" | "blue" | "green";

export type AuthFormChip = {
  label: string;
  tone: AuthFormChipTone;
};

export type AuthVisualBullet = {
  label: string;
};

export const registerFormChips: AuthFormChip[] = [
  {
    label: "Phát hiện lừa đảo bằng AI tiên tiến",
    tone: "amber",
  },
  {
    label: "Kết quả phân tích rõ ràng, chi tiết",
    tone: "blue",
  },
  {
    label: "Trải nghiệm an toàn trực tuyến liền mạch",
    tone: "green",
  },
];

export const loginVisualBullets: AuthVisualBullet[] = [
  {
    label: "Kiểm tra email và tin nhắn lừa đảo nhanh chóng",
  },
  {
    label: "Phân tích rõ ràng, dễ hiểu bằng AI",
  },
  {
    label: "Trải nghiệm MailGuard an toàn trên web",
  },
];
