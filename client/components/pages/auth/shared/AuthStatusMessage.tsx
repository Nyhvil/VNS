type AuthStatusMessageProps = {
  tone: "success" | "error";
  message: string;
};

const toneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function AuthStatusMessage({
  tone,
  message,
}: AuthStatusMessageProps) {
  return (
    <div
      className={`rounded-[18px] border px-4 py-3 text-sm leading-6 ${toneClasses[tone]}`}
    >
      {message}
    </div>
  );
}
