type AuthDividerProps = {
  label: string;
};

export default function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[#e8e8eb]" />
      <span className="text-sm uppercase tracking-[0.14em] text-[#6b7280]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[#e8e8eb]" />
    </div>
  );
}
