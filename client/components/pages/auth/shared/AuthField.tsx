type AuthFieldProps = {
  label: string;
  type: "text" | "email" | "password";
  placeholder: string;
  name?: string;
  value?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export default function AuthField({
  label,
  type,
  placeholder,
  name,
  value,
  autoComplete,
  error,
  disabled = false,
  onChange,
}: AuthFieldProps) {
  return (
    <label className="block">
      <span className="mb-3 block text-[0.98rem] font-medium text-[#161616]">
        {label}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={onChange}
        className={`h-13 w-full rounded-[20px] border bg-[linear-gradient(180deg,#edf3ff_0%,#dfe8fa_100%)] px-5 text-[1.05rem] text-[#101828] outline-none transition placeholder:text-[#6f7892] disabled:cursor-not-allowed disabled:opacity-70 ${
          error ? "border-rose-300 focus:border-rose-300" : "border-[#cfd8ea] focus:border-[#9eb6ef]"
        }`}
      />
      {error ? <span className="mt-2 block text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}
