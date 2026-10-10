type AuthPrimaryButtonProps = {
  label: string;
  pendingLabel?: string;
  isPending?: boolean;
  disabled?: boolean;
};

export default function AuthPrimaryButton({
  label,
  pendingLabel,
  isPending = false,
  disabled = false,
}: AuthPrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-black px-6 text-[1.04rem] font-semibold text-white transition hover:bg-[#151515] disabled:cursor-not-allowed disabled:bg-black/75"
    >
      {isPending ? pendingLabel ?? label : label}
    </button>
  );
}
