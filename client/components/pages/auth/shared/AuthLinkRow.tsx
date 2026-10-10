import Link from "next/link";

type AuthLinkRowProps = {
  leftLabel: string;
  leftHref: string;
  rightText: string;
  rightLabel: string;
  rightHref: string;
};

export default function AuthLinkRow({
  leftLabel,
  leftHref,
  rightText,
  rightLabel,
  rightHref,
}: AuthLinkRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[0.98rem]">
      <Link href={leftHref} className="text-[#3e4655] underline underline-offset-4">
        {leftLabel}
      </Link>

      <p className="text-[#232323]">
        {rightText}{" "}
        <Link href={rightHref} className="underline underline-offset-4">
          {rightLabel}
        </Link>
      </p>
    </div>
  );
}
