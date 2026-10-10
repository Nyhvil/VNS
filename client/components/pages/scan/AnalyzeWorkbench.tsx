"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import AnalyzeSubmissionResultCard from "@/components/pages/scan/AnalyzeSubmissionResultCard";
import {
  createScanRequest,
  submitAnalysis,
} from "@/services/api/analyzeService";
import { useAuthState } from "@/store/authStore";
import type { MockAnalyzeSubmissionSuccess } from "@/types/analyzeResult";

// Helper: convert File to base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type AnalyzeWorkbenchProps = {
  variant?: "public" | "dashboard";
  placeholder?: string;
  submitLabel?: string;
  resultModalTitle?: string;
  resultModalDescription?: string;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
};

export default function AnalyzeWorkbench({
  variant = "public",
  placeholder = "Dán nội dung email, tin nhắn hoặc mô tả ảnh cần kiểm tra...",
  submitLabel = "Phân tích ngay",
  resultModalTitle = "Kết quả phân tích",
  resultModalDescription = "MailGuard đã xử lý xong nội dung bạn gửi.",
}: AnalyzeWorkbenchProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { user } = useAuthState();

  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MockAnalyzeSubmissionSuccess | null>(null);

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  useEffect(() => {
    if (variant === "dashboard" || !result) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setResult(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [result, variant]);

  async function handleAnalyze() {
    if (!draft.trim() && !selectedImage) {
      setErrorMessage("Vui lòng nhập nội dung hoặc thêm screenshot trước khi phân tích.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setResult(null);

    try {
      let content = draft;
      let inputType: "text" | "image" | "both" = "text";

      if (selectedImage && draft.trim()) {
        // Avoid embedding raw base64 inside text payload because it can break
        // downstream analyzers and inflate request size.
        content = draft;
        inputType = "both";
      } else if (selectedImage) {
        const base64 = await fileToBase64(selectedImage.file);
        content = base64;
        inputType = "image";
      }

      const scanId = await createScanRequest(
        user?.id ?? null,
        inputType === "image" ? "image" : "plain_text",
        content,
      );

      if (!scanId) {
        setErrorMessage("Không thể tạo yêu cầu phân tích. Vui lòng thử lại.");
        return;
      }

      const analyzeResult = await submitAnalysis({ type: inputType, content, scanId });

      if (!analyzeResult.ok) {
        setErrorMessage(analyzeResult.message);
        return;
      }

      router.push(`/analyze_result/${analyzeResult.jobId}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) return;

    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    setSelectedImage({
      file: nextFile,
      previewUrl: URL.createObjectURL(nextFile),
    });

    setResult(null);
    setErrorMessage(null);
  }

  function handleRemoveImage() {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const hasText = Boolean(draft.trim());
  const hasInput = hasText || Boolean(selectedImage);
  const isDashboard = variant === "dashboard";

  return (
    <>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {isDashboard ? (
        <DashboardWorkbench
          draft={draft}
          hasInput={hasInput}
          hasText={hasText}
          inputId={inputId}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          placeholder={placeholder}
          selectedImage={selectedImage}
          setDraft={setDraft}
          setErrorMessage={setErrorMessage}
          setResult={setResult}
          submitLabel={submitLabel}
          onAnalyze={handleAnalyze}
          onRemoveImage={handleRemoveImage}
        />
      ) : (
        <PublicWorkbench
          draft={draft}
          hasInput={hasInput}
          inputId={inputId}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          placeholder={placeholder}
          selectedImage={selectedImage}
          setDraft={setDraft}
          setErrorMessage={setErrorMessage}
          setResult={setResult}
          submitLabel={submitLabel}
          onAnalyze={handleAnalyze}
          onRemoveImage={handleRemoveImage}
        />
      )}

      {isDashboard && result ? (
        <section className="mt-5 rounded-[28px] border border-[#dde6f0] bg-[#f8fbff] p-3 shadow-[0_16px_32px_rgba(15,23,42,0.06)] sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e7eef6] bg-white px-4 py-3">
            <div>
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
                Scan output
              </p>
              <p className="mt-1 text-[1rem] font-semibold text-[#0f172a]">
                {resultModalTitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d9e1ea] bg-white px-4 text-[0.9rem] font-semibold text-[#243040] transition hover:bg-[#f8fafc]"
            >
              Ẩn kết quả
            </button>
          </div>

          <AnalyzeSubmissionResultCard
            result={result}
            previewUrl={selectedImage?.previewUrl ?? null}
          />
        </section>
      ) : null}

      {result && !isDashboard ? (
        <div className="fixed inset-0 z-160 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Đóng kết quả phân tích"
            className="absolute inset-0 bg-[rgba(15,23,42,0.58)] backdrop-blur-sm"
            onClick={() => setResult(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={resultModalTitle}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[34px] border border-white/15 bg-[linear-gradient(180deg,#f7fafc_0%,#eef3f8_100%)] shadow-[0_40px_120px_rgba(15,23,42,0.36)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#dde6ef] bg-white/82 px-5 py-5 backdrop-blur sm:px-6">
              <div>
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#6f7d8f]">
                  Scan result
                </p>
                <h3 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-[#111827]">
                  {resultModalTitle}
                </h3>
                <p className="mt-2 max-w-2xl text-[0.96rem] leading-7 text-[#5a687a]">
                  {resultModalDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7dfe8] bg-white text-[#445164] transition hover:bg-[#f8fafc]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <AnalyzeSubmissionResultCard
                result={result}
                previewUrl={selectedImage?.previewUrl ?? null}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type SharedWorkbenchProps = {
  draft: string;
  hasInput: boolean;
  inputId: string;
  isAnalyzing: boolean;
  errorMessage: string | null;
  placeholder: string;
  selectedImage: SelectedImage | null;
  setDraft: (value: string) => void;
  setErrorMessage: (value: string | null) => void;
  setResult: (value: MockAnalyzeSubmissionSuccess | null) => void;
  submitLabel: string;
  onAnalyze: () => void;
  onRemoveImage: () => void;
};

type DashboardWorkbenchProps = SharedWorkbenchProps & {
  hasText: boolean;
};

function DashboardWorkbench({
  draft,
  hasInput,
  hasText,
  inputId,
  isAnalyzing,
  errorMessage,
  placeholder,
  selectedImage,
  setDraft,
  setErrorMessage,
  setResult,
  submitLabel,
  onAnalyze,
  onRemoveImage,
}: DashboardWorkbenchProps) {
  return (
    <div className="rounded-[28px] border border-[#dfe6ef] bg-[#fbfdff] shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eef5] px-5 py-4">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
            Scan input
          </p>
          <h3 className="mt-1 text-[1.16rem] font-semibold tracking-[-0.04em] text-[#0f172a]">
            Nội dung cần kiểm tra
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusChip tone={hasText ? "active" : "idle"} label={hasText ? "Có text" : "Chưa có text"} />
          <StatusChip tone={selectedImage ? "active" : "idle"} label={selectedImage ? "Có ảnh" : "Chưa có ảnh"} />
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="rounded-[22px] border border-[#e5ebf3] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setResult(null);
                setErrorMessage(null);
              }}
              className="min-h-52 w-full resize-none bg-transparent text-[1rem] leading-7 text-[#111827] outline-none placeholder:text-[#93a0b2]"
              placeholder={placeholder}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e7edf4] bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[0.92rem] font-semibold text-[#172536]">
                {selectedImage ? selectedImage.file.name : "Có thể thêm ảnh bên khung phải"}
              </p>
              <p className="mt-1 text-[0.88rem] text-[#66788b]">
                Hỗ trợ PNG, JPG, WEBP. Quy trình quét giữ nguyên.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedImage ? (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ecd0cc] bg-[#fff7f6] px-4 text-[0.95rem] font-semibold text-[#b44a3c] transition hover:bg-[#fff1ef]"
                >
                  Bỏ screenshot
                </button>
              ) : null}

              <button
                type="button"
                onClick={onAnalyze}
                disabled={isAnalyzing || !hasInput}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#ffcb11] px-6 text-[1rem] font-semibold text-[#6b5300] shadow-[0_16px_26px_rgba(255,203,17,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ScanIcon />
                {isAnalyzing ? "Đang phân tích..." : submitLabel}
              </button>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="mt-4 rounded-[18px] border border-[#dbe6f4] bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_100%)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.9rem] font-semibold text-[#18324d]">
                  MailGuard đang gửi nội dung lên server và chấm rủi ro
                </p>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#48709c]">
                  analyzing
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="mg-scan-progress h-full rounded-full" />
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-[18px] border border-[#f2c8c3] bg-[#fff5f4] px-4 py-3 text-[0.95rem] text-[#b33f33]">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-[#e7edf4] bg-[#f8fbff] p-3">
          <label
            htmlFor={inputId}
            className="block cursor-pointer rounded-[18px] border border-dashed border-[#cdd9e6] bg-white p-3 transition hover:border-[#e0b62c] hover:bg-[#fffdf5]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-[#e8eef5] bg-[linear-gradient(180deg,#f7fbff_0%,#eff4fa_100%)]">
              <div className="mg-scan-grid pointer-events-none absolute inset-0 opacity-60" />
              <div className="relative flex min-h-64 items-center justify-center p-4">
                {selectedImage ? (
                  <Image
                    src={selectedImage.previewUrl}
                    alt={selectedImage.file.name}
                    unoptimized
                    width={280}
                    height={220}
                    className="max-h-64 w-full rounded-[14px] object-cover shadow-[0_16px_30px_rgba(15,23,42,0.12)]"
                  />
                ) : (
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d8e4f2] bg-white/90 text-[#7f8da0] shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                      <UploadIcon />
                    </div>
                    <p className="mt-4 text-[0.98rem] font-semibold text-[#172536]">
                      Ảnh email, popup xác minh
                    </p>
                    <p className="mt-2 text-[0.88rem] leading-6 text-[#66788b]">
                      hoặc trang đăng nhập lạ.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </label>

          <div className="mt-3 space-y-3">
            <CompactRow
              label="Nguồn vào"
              value={selectedImage && hasText ? "Ảnh + text" : selectedImage ? "Ảnh" : hasText ? "Text" : "Trống"}
            />
            <CompactRow label="OCR" value={selectedImage ? "Sẵn sàng" : "Bỏ qua"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicWorkbench({
  draft,
  hasInput,
  inputId,
  isAnalyzing,
  errorMessage,
  placeholder,
  selectedImage,
  setDraft,
  setErrorMessage,
  setResult,
  submitLabel,
  onAnalyze,
  onRemoveImage,
}: SharedWorkbenchProps) {
  return (
    <div className="rounded-[20px] border border-[#e4e9ef] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfd_100%)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="rounded-[18px] border border-[#e6ebf2] bg-white p-3">
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setResult(null);
            setErrorMessage(null);
          }}
          className="min-h-35 w-full resize-none bg-transparent text-[1rem] leading-7 text-[#111827] outline-none placeholder:text-[#93a0b2]"
          placeholder={placeholder}
        />

        <label
          htmlFor={inputId}
          className="mt-3 block cursor-pointer rounded-[18px] border border-dashed border-[#d8e0ea] bg-[#f8fbff] px-4 py-4 transition hover:border-[#e0b62c] hover:bg-[#fffdf5]"
        >
          {selectedImage ? (
            <div className="flex items-center gap-3">
              <Image
                src={selectedImage.previewUrl}
                alt={selectedImage.file.name}
                unoptimized
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold text-[#142334]">
                  {selectedImage.file.name}
                </p>
                <p className="text-[0.88rem] text-[#66788b]">
                  Ảnh sẽ được gửi lên server để OCR trước khi phân tích.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[#66788b]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8e4f2] bg-white text-[#7f8da0]">
                <UploadIcon />
              </div>
              <div>
                <p className="text-[0.95rem] font-semibold text-[#172536]">
                  Ảnh email, popup xác minh
                </p>
                <p className="text-[0.88rem]">
                  hoặc trang đăng nhập lạ.
                </p>
              </div>
            </div>
          )}
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-[#edf2f7] pt-3">
          {selectedImage ? (
            <button
              type="button"
              onClick={onRemoveImage}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ecd0cc] bg-[#fff7f6] px-4 text-[0.95rem] font-semibold text-[#b44a3c] transition hover:bg-[#fff1ef]"
            >
              Bỏ screenshot
            </button>
          ) : null}

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || !hasInput}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#ffcb11] px-6 text-[1rem] font-semibold text-[#6b5300] shadow-[0_16px_26px_rgba(255,203,17,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanIcon />
            {isAnalyzing ? "Đang phân tích..." : submitLabel}
          </button>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="mt-3 rounded-[18px] border border-[#dbe6f4] bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_100%)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.92rem] font-semibold text-[#18324d]">
              MailGuard đang gửi nội dung lên server và chấm rủi ro
            </p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#48709c]">
              analyzing
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="mg-scan-progress h-full rounded-full" />
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-2xl border border-[#f2c8c3] bg-[#fff5f4] px-4 py-3 text-[0.95rem] text-[#b33f33]">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "active" | "idle";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.76rem] font-semibold ${
        tone === "active" ? "bg-[#ecf9f1] text-[#1d8a56]" : "bg-[#eef2f6] text-[#697789]"
      }`}
    >
      {label}
    </span>
  );
}

function CompactRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e6edf5] bg-white px-4 py-3">
      <span className="text-[0.88rem] text-[#627284]">{label}</span>
      <span className="text-right text-[0.9rem] font-semibold text-[#132233]">{value}</span>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-8 w-8 text-current" fill="none">
      <rect x="8" y="11" width="32" height="24" rx="6" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="m15 29 7-7 6 6 5-5 6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="18.5" r="2.2" fill="currentColor" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="m9.6 11.1 1.4 1.4 3-3.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
