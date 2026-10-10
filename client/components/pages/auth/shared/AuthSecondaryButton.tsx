type AuthSecondaryButtonProps = {
  label: string;
  pendingLabel?: string;
  isPending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export default function AuthSecondaryButton({
  label,
  pendingLabel,
  isPending = false,
  disabled = false,
  onClick,
}: AuthSecondaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-13 w-full items-center justify-center rounded-full bg-black px-6 text-[1rem] font-semibold text-white transition hover:bg-[#151515] disabled:cursor-not-allowed disabled:bg-black/75"
    >
      {isPending ? pendingLabel ?? label : label}
    </button>
  );
}
