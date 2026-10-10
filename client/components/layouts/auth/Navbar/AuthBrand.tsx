import Image from "next/image";
import Link from "next/link";

export default function AuthBrand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <Image
        src="/img/Logo.png"
        alt="MailGuard"
        width={36}
        height={36}
        className="h-9 w-9 rounded-sm object-cover"
        priority
      />
      <span className="text-[2rem] font-semibold tracking-[-0.05em]">
        <span className="text-[#101828]">Mail</span>
        <span className="text-[#D39A10]">Guard</span>
      </span>
    </Link>
  );
}
